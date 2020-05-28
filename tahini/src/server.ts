import { Connection, createConnection } from 'typeorm';
import { Block } from 'barretenberg/block_source';
import { BarretenbergWasm } from 'barretenberg/wasm';

import { MemoryFifo } from './fifo';
import { LocalBlockchain } from './blockchain';
import { NoteProcessor } from './note-processor';
import { Grumpkin } from 'barretenberg/ecc/grumpkin';
import { Key } from './entity/key';
import { BlockDao } from './entity/block';
import { Note } from './entity/note';
import { Schnorr } from 'barretenberg/crypto/schnorr';

export default class Server {
  public connection!: any;
  public blockchain!: LocalBlockchain;
  public noteProcessor!: NoteProcessor;
  private blockQueue = new MemoryFifo<Block>();
  public grumpkin!: Grumpkin;
  public schnorr!: Schnorr;

  public async start() {
    this.connection = await createConnection({
      type: 'sqlite',
      database: 'db.sqlite',
      synchronize: true,
      logging: false,
      entities: [Key, BlockDao, Note],
    });

    this.blockchain = new LocalBlockchain(this.connection);
    this.noteProcessor = new NoteProcessor();

    await this.noteProcessor.init(this.connection);
    await this.blockchain.init();

    this.blockchain.on('block', b => this.blockQueue.put(b));
    this.processQueue();

    const wasm = await BarretenbergWasm.new();
    await wasm.init();
    this.grumpkin = new Grumpkin(wasm);
    this.schnorr = new Schnorr(wasm);
  }

  async stop() {
    await this.connection.close();
  }

  private async processQueue() {
    while (true) {
      const block = await this.blockQueue.get();
      if (!block) {
        break;
      }
      this.handleNewBlock(block);
    }
  }

  private async handleNewBlock(block: Block) {
    console.log(`Processing block ${block.blockNum}...`);
    try {
      this.noteProcessor.processNewNotes(block.dataEntries, block.blockNum, false, this.grumpkin);
      this.noteProcessor.processNewNotes(block.nullifiers, block.blockNum, true, this.grumpkin);
    } catch (error) {
      console.log('Error in processing new notes: ', error);
    }
  }

  public async registerNewKey(key: Key) {
    await this.noteProcessor.processNewKey(key, this.grumpkin);
  }
}
