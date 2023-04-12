const redishost = process.env.REDISHOST ? process.env.REDISHOST : "localhost" // 'localhost';
const redisport = process.env.REDISPORT ? process.env.REDISPORT : 6379 // 6379;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
const s3region = process.env.AWS_REGION
const s3bucket = process.env.S3_BUCKET_NAME
const s3prefix = process.env.S3_PREFIX
const wallet = require("./wallet.json")
module.exports = {
  cache: "redis", // cache:redis by default tempoorary
  // cache: "lmdb",
  cache_prefix: "tel-aviv", // this is for query cache

  redis: {
    // this is for snapshot cache
    prefix: "weavedb",
    url: `redis://${redishost}:${redisport}`,
  },
  snapshot_span: 1000 * 60 * 60 * 3, // every 3 hours

  offchain_db: {
    // this is for internal offchain db to handle snapshot data
    prefix: "offchain",
    url: `redis://${redishost}:${redisport}`,
  },

  // subscribe: true,
  // subscribe: false,

  s3: {
    bucket: s3bucket,
    prefix: s3prefix,
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
    region: s3region,
  },

  // cache: "redis",
  // redis: {
  //   url: `redis://${redishost}:${redisport}`,
  // },
  admin: {
    contractTxId: "WEAVEDB_ADMIN_CONTRACT",
    // YSReuO6vzkBWd4Tdfe8HE0YLXj4tJokfatsORv7iZ94
    owner: wallet,
  },
}
