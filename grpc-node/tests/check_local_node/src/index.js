const WeaveDB = require('weavedb-node-client');

const GRPC_HOST = process.env.GRPC_HOST || 'grpc2.weavedb-node.xyz';
const GRPC_PORT = process.env.GRPC_PORT || '443';

(async () => {
  console.log('check nodes');
  const rpc = `${GRPC_HOST}:${GRPC_PORT}`;
  console.log(`rpc: ${rpc}`);
  const contractTxId = '1gU_EmELb5-sqqlURuBQFCD0HTlBxHLLZhUojIXxj78';
  const sdk = new WeaveDB({
    contractTxId,
    rpc,
  });

  try {
    const collectionName = 'test20230123';
    const list = await sdk.get(collectionName, 1);
    console.log('list: ', list);

    return true;
    // process.exit();
  } catch (e) {
    console.log(e);
    exit(1);
  }
  console.log('end');
})();
