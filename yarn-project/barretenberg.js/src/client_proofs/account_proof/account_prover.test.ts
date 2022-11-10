import { randomBytes } from 'crypto';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { default as levelup } from 'levelup';
import { default as memdown } from 'memdown';
import { AliasHash } from '../../account_id/index.js';
import { GrumpkinAddress } from '../../address/index.js';
import { Crs } from '../../crs/index.js';
import { Blake2s, Pedersen, Schnorr, sha256, SinglePedersen } from '../../crypto/index.js';
import { PooledFft } from '../../fft/index.js';
import { MerkleTree } from '../../merkle_tree/index.js';
import { NoteAlgorithms } from '../../note_algorithms/index.js';
import { PooledPippenger } from '../../pippenger/index.js';
import { BarretenbergWasm, WorkerPool } from '../../wasm/index.js';
import { ProofData, ProofId } from '../proof_data/index.js';
import { UnrolledProver } from '../prover/index.js';
import { AccountProver, AccountTx, AccountVerifier } from './index.js';
import { jest } from '@jest/globals';

const debug = createDebug('bb:account_proof_test');

jest.setTimeout(120000);

describe('account proof', () => {
  let barretenberg!: BarretenbergWasm;
  let pool!: WorkerPool;
  let noteAlgos: NoteAlgorithms;
  let accountProver!: AccountProver;
  let accountVerifier!: AccountVerifier;
  let blake2s!: Blake2s;
  let pedersen!: Pedersen;
  let schnorr!: Schnorr;
  let crs!: Crs;
  let pippenger!: PooledPippenger;

  beforeAll(async () => {
    EventEmitter.defaultMaxListeners = 32;
    const circuitSize = AccountProver.getCircuitSize();

    crs = new Crs(circuitSize);
    await crs.init();

    barretenberg = await BarretenbergWasm.new();

    pool = new WorkerPool();
    await pool.init(barretenberg.module, Math.min(navigator.hardwareConcurrency, 8), 16384);

    pippenger = new PooledPippenger(pool);
    await pippenger.init(crs.getData());

    const fft = new PooledFft(pool);
    await fft.init(circuitSize);

    blake2s = new Blake2s(barretenberg);
    pedersen = new SinglePedersen(barretenberg);
    schnorr = new Schnorr(barretenberg);

    noteAlgos = new NoteAlgorithms(barretenberg);

    const prover = new UnrolledProver(pool.workers[0], pippenger, fft);
    accountProver = new AccountProver(prover);
    accountVerifier = new AccountVerifier();

    debug('creating keys...');
    const start = new Date().getTime();
    await accountProver.computeKey();
    await accountVerifier.computeKey(pippenger.pool[0], crs.getG2Data());
    debug(`created circuit keys: ${new Date().getTime() - start}ms`);
    debug(`vk hash: ${sha256(await accountVerifier.getKey()).toString('hex')}`);
  });

  afterAll(async () => {
    await pool.destroy();
  });

  const createKeyPair = () => {
    const privateKey = randomBytes(32);
    const publicKey = new GrumpkinAddress(schnorr.computePublicKey(privateKey));
    return { privateKey, publicKey };
  };

  it('create and verify an account proof', async () => {
    const tree = new MerkleTree(levelup(memdown()), pedersen, 'data', 32);

    const user = createKeyPair();
    const newAccountPublicKey = user.publicKey;

    const merkleRoot = tree.getRoot();

    const spendingKey0 = createKeyPair();
    const spendingKey1 = createKeyPair();

    const aliasHash = AliasHash.fromAlias('user_zero', blake2s);

    const create = true;
    const migrate = false;

    const accountIndex = 0;
    const accountPath = await tree.getHashPath(0);

    const tx = new AccountTx(
      merkleRoot,
      user.publicKey,
      newAccountPublicKey,
      spendingKey0.publicKey,
      spendingKey1.publicKey,
      aliasHash,
      create,
      migrate,
      accountIndex,
      accountPath,
      user.publicKey,
    );
    const signingData = await accountProver.computeSigningData(tx);
    const signature = schnorr.constructSignature(signingData, user.privateKey);

    debug('creating proof...');
    const start = new Date().getTime();
    const proof = await accountProver.createAccountProof(tx, signature);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proof.length}`);

    const verified = await accountVerifier.verifyProof(proof);
    expect(verified).toBe(true);

    // Check public inputs
    const accountProof = new ProofData(proof);
    const noteCommitment1 = noteAlgos.accountNoteCommitment(aliasHash, user.publicKey, spendingKey0.publicKey.x());
    const noteCommitment2 = noteAlgos.accountNoteCommitment(aliasHash, user.publicKey, spendingKey1.publicKey.x());
    const nullifier1 = noteAlgos.accountAliasHashNullifier(aliasHash);
    const nullifier2 = noteAlgos.accountPublicKeyNullifier(newAccountPublicKey);
    expect(accountProof.proofId).toBe(ProofId.ACCOUNT);
    expect(accountProof.noteCommitment1).toEqual(noteCommitment1);
    expect(accountProof.noteCommitment2).toEqual(noteCommitment2);
    expect(accountProof.nullifier1).toEqual(nullifier1);
    expect(accountProof.nullifier2).toEqual(nullifier2);
    expect(accountProof.publicValue).toEqual(Buffer.alloc(32));
    expect(accountProof.publicOwner).toEqual(Buffer.alloc(32));
    expect(accountProof.publicAssetId).toEqual(Buffer.alloc(32));
    expect(accountProof.noteTreeRoot).toEqual(merkleRoot);
    expect(accountProof.txFee).toEqual(Buffer.alloc(32));
    expect(accountProof.txFeeAssetId).toEqual(Buffer.alloc(32));
    expect(accountProof.bridgeCallData).toEqual(Buffer.alloc(32));
    expect(accountProof.defiDepositValue).toEqual(Buffer.alloc(32));
    expect(accountProof.defiRoot).toEqual(Buffer.alloc(32));
  });
});
