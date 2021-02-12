import { WorldStateDb } from 'barretenberg/world_state_db';
import { EthereumBlockchain } from 'blockchain';
import http from 'http';
import moment from 'moment';
import 'reflect-metadata';
import 'source-map-support/register';
import { createConnection } from 'typeorm';
import { appFactory } from './app';
import { RollupDb } from './rollup_db';
import { Server, ServerConfig } from './server';
import 'log-timestamp';
import { getConfig } from './config';
import { EthAddress } from 'barretenberg/address';
import { Metrics } from './metrics';

async function main() {
  const {
    ormConfig,
    provider,
    ethConfig,
    confVars: {
      halloumiHost,
      rollupContractAddress,
      numInnerRollupTxs,
      numOuterRollupProofs,
      publishInterval,
      apiPrefix,
      serverAuthToken,
      port,
      feeLimit,
      txFee,
    },
  } = await getConfig();

  const connection = await createConnection(ormConfig);
  const blockchain = await EthereumBlockchain.new(ethConfig, EthAddress.fromString(rollupContractAddress!), provider);

  const serverConfig: ServerConfig = {
    halloumiHost,
    numInnerRollupTxs,
    numOuterRollupProofs,
    publishInterval: moment.duration(publishInterval, 's'),
    feeLimit,
    minFees: [txFee, 0n],
  };
  const rollupDb = new RollupDb(connection);
  const worldStateDb = new WorldStateDb();
  const metrics = new Metrics(worldStateDb, rollupDb, blockchain);
  const server = new Server(serverConfig, blockchain, rollupDb, worldStateDb, metrics, provider);

  const shutdown = async () => {
    await server.stop();
    await connection.close();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  const serverStatus = await server.getStatus();
  const app = appFactory(server, apiPrefix, metrics, connection, worldStateDb, serverStatus, serverAuthToken);

  const httpServer = http.createServer(app.callback());
  httpServer.listen(port);
  console.log(`Server listening on port ${port}.`);

  await server.start();
}

main().catch(err => {
  console.log(err);
  process.exit(1);
});
