const {
  uniq,
  map,
  drop,
  splitWhen,
  init,
  o,
  includes,
  append,
  equals,
  all,
  complement,
  isNil,
  pluck,
  is,
  last,
  tail,
  clone,
} = require("ramda")
const { LmdbCache } = require("warp-contracts-lmdb")
const { RedisCache } = require("./RedisCache")
const shortid = require("shortid")
const {
  WarpFactory,
  LoggerFactory,
  defaultCacheOptions,
} = require("warp-contracts")

const {
  WarpFactory: WarpFactory_old,
  LoggerFactory: LoggerFactory_old,
  defaultCacheOptions: defaultCacheOptions_old,
} = require("warp-contracts-old")

const {
  WarpSubscriptionPlugin,
} = require("./warp-contracts-plugin-subscription")
const { get, parseQuery } = require("./off-chain/actions/read/get")
const { ids } = require("./off-chain/actions/read/ids")
const md5 = require("md5")
const is_data = [
  "set",
  "setSchema",
  "setRules",
  "addIndex",
  "removeIndex",
  "add",
  "update",
  "upsert",
]
const no_paths = [
  "nonce",
  "ids",
  "getCrons",
  "getAlgorithms",
  "getLinkedContract",
  "getOwner",
  "getAddressLink",
  "getRelayerJob",
  "listRelayerJobs",
  "getEvolve",
  "getInfo",
  "addCron",
  "removeCron",
  "setAlgorithms",
  "addRelayerJob",
  "removeRelayerJob",
  "linkContract",
  "evolve",
  "migrate",
  "setCanEvolve",
  "setSecure",
  "addOwner",
  "removeOwner",
  "addAddressLink",
  "removeAddressLink",
]
let states = {}
let dbs = {}
let subs = {}
let submap = {}

let Arweave = require("arweave")
Arweave = isNil(Arweave.default) ? Arweave : Arweave.default
const Base = require("weavedb-base")

const _on = async (state, input) => {
  const block = input.interaction.block
  if (!isNil(state)) {
    states[input.contractTxId] = state
    for (const txid in subs) {
      for (const hash in subs[txid]) {
        const query = subs[txid][hash].query
        try {
          const res = await get(
            clone(state),
            {
              input: { query },
            },
            true,
            { block }
          )
          if (!isNil(res)) {
            if (subs[txid][hash].height < block.height) {
              subs[txid][hash].height = block.height
              let prev = isNil(subs[txid][hash].prev)
                ? subs[txid][hash].prev
                : subs[txid][hash].doc
                ? subs[txid][hash].prev.data
                : pluck("data", subs[txid][hash].prev)
              let current = isNil(res.result)
                ? res.result
                : subs[txid][hash].doc
                ? res.result.data
                : pluck("data", res.result)
              if (!equals(current, prev)) {
                for (const k in subs[txid][hash].subs) {
                  try {
                    if (!isNil(res))
                      subs[txid][hash].subs[k].cb(
                        subs[txid][hash].subs[k].con
                          ? res.result
                          : subs[txid][hash].doc
                          ? isNil(res.result)
                            ? null
                            : res.result.data
                          : pluck("data", res.result)
                      )
                  } catch (e) {
                    console.log(e)
                  }
                }
                subs[txid][hash].prev = res.result
              }
            }
          }
        } catch (e) {
          console.log(e)
        }
      }
    }
  }
}

class SDK extends Base {
  constructor({
    arweave,
    arweave_wallet,
    contractTxId,
    wallet,
    name = "weavedb",
    version = "1",
    EthWallet,
    web3,
    subscribe = true,
    network,
    port = 1820,
    cache = "lmdb",
    cache_prefix = null,
    lmdb = {},
    redis = {},
    old = false,
    onUpdate,
  }) {
    super()
    this.cache_prefix = cache_prefix
    this.onUpdate = onUpdate
    this.subscribe = subscribe
    this.old = old
    if (!this.old) {
      this.Warp = { WarpFactory, LoggerFactory, defaultCacheOptions }
    } else {
      this.Warp = {
        WarpFactory: WarpFactory_old,
        LoggerFactory: LoggerFactory_old,
        defaultCacheOptions: defaultCacheOptions_old,
      }
    }
    this.cache = cache
    this.lmdb = lmdb
    this.redis = redis
    this.arweave_wallet = arweave_wallet
    if (isNil(arweave)) {
      if (network === "localhost") {
        arweave = {
          host: "localhost",
          port,
          protocol: "http",
        }
      } else {
        arweave = {
          host: "arweave.net",
          port: 443,
          protocol: "https",
        }
      }
    }
    this.arweave = Arweave.init(arweave)
    this.Warp.LoggerFactory.INST.logLevel("error")
    if (typeof window === "object") {
      require("@metamask/legacy-web3")
      this.web3 = window.web3
    }
    this.network =
      network ||
      (arweave.host === "host.docker.internal" || arweave.host === "localhost"
        ? "localhost"
        : "mainnet")

    if (this.network === "localhost") this.cache = "leveldb"
    if (arweave.host === "host.docker.internal") {
      this.warp = this.Warp.WarpFactory.custom(this.arweave, {}, "local")
        .useArweaveGateway()
        .build()
    } else if (this.network === "localhost") {
      this.warp = this.Warp.WarpFactory.forLocal(
        isNil(arweave) || isNil(arweave.port) ? 1820 : arweave.port
      )
    } else if (this.network === "testnet") {
      this.warp = this.Warp.WarpFactory.forTestnet()
    } else {
      this.warp = this.Warp.WarpFactory.forMainnet()
    }
    this.contractTxId = contractTxId
    if (all(complement(isNil))([contractTxId, wallet, name, version])) {
      this.initialize({
        contractTxId,
        wallet,
        name,
        version,
        EthWallet,
        subscribe,
      })
    }
  }

  async addFunds(wallet) {
    const walletAddress = await this.arweave.wallets.getAddress(wallet)
    await this.arweave.api.get(`/mint/${walletAddress}/1000000000000000`)
    await this.arweave.api.get("mine")
  }

  async initializeWithoutWallet(params = {}) {
    const wallet = await this.arweave.wallets.generate()
    if (this.network === "localhost") await this.addFunds(wallet)
    this.initialize({ wallet, ...params })
  }

  initialize({
    contractTxId,
    wallet,
    name = "weavedb",
    version = "1",
    EthWallet,
    subscribe,
    onUpdate,
    cache_prefix,
  }) {
    if (!isNil(contractTxId)) this.contractTxId = contractTxId
    if (!isNil(subscribe)) this.subscribe = subscribe
    if (!isNil(onUpdate)) this.onUpdate = onUpdate
    if (!isNil(cache_prefix)) this.cache_prefix = cache_prefix
    if (
      !isNil(this.cache_prefix) &&
      (/\./.test(this.cache_prefix) || /\|/.test(this.cache_prefix))
    ) {
      throw new Error(". and | are not allowed in prefix")
    }
    if (this.cache === "lmdb") {
      this.warp
        .useStateCache(
          new LmdbCache({
            ...this.Warp.defaultCacheOptions,
            dbLocation: `./cache/warp/state`,
            ...(this.lmdb.state || {}),
          })
        )
        .useContractCache(
          new LmdbCache({
            ...this.Warp.defaultCacheOptions,
            dbLocation: `./cache/warp/contracts`,
            ...(this.lmdb.contracts || {}),
          }),
          new LmdbCache({
            ...this.Warp.defaultCacheOptions,
            dbLocation: `./cache/warp/src`,
            ...(this.lmdb.src || {}),
          })
        )
    } else if (this.cache === "redis") {
      const { createClient } = require("redis")
      const opt = { url: this.redis.url || null }
      this.redis_client = this.redis.client || createClient(opt)
      if (isNil(this.redis.client)) this.redis_client.connect()
      if (
        !isNil(this.redis.prefix) &&
        (/\./.test(this.redis.prefix) || /\|/.test(this.redis.prefix))
      ) {
        throw new Error(". and | are not allowed in prefix")
      }
      this.warp
        .useStateCache(
          new RedisCache({
            client: this.redis_client,
            prefix: `${this.redis.prefix || "warp"}.${this.contractTxId}.state`,
          })
        )
        .useContractCache(
          new RedisCache({
            client: this.redis_client,
            prefix: `${this.redis.prefix || "warp"}.${
              this.contractTxId
            }.contracts`,
          }),
          new RedisCache({
            client: this.redis_client,
            prefix: `${this.redis.prefix || "warp"}.${this.contractTxId}.src`,
          })
        )
    }
    if (isNil(wallet)) throw Error("wallet missing")
    if (isNil(this.contractTxId)) throw Error("contractTxId missing")
    this.wallet = wallet
    this.db = this.warp
      .contract(this.contractTxId)
      .connect(wallet)
      .setEvaluationOptions({
        allowBigInt: true,
        useVM2: !this.old,
      })
    dbs[this.contractTxId] = this
    this.domain = { name, version, verifyingContract: this.contractTxId }
    if (!isNil(EthWallet)) this.setEthWallet(EthWallet)
    if (this.network !== "localhost") {
      if (this.subscribe) {
        const self = this
        class CustomSubscriptionPlugin extends WarpSubscriptionPlugin {
          async process(input) {
            try {
              let data = await dbs[self.contractTxId].db.readState(
                input.sortKey
              )
              const state = data.cachedValue.state

              try {
                _on(state, input)
              } catch (e) {}
              if (!isNil(self.onUpdate)) {
                let query = null
                try {
                  for (let v of input.interaction.tags) {
                    if (v.name === "Input") {
                      query = JSON.parse(v.value)
                    }
                  }
                } catch (e) {}
                await self.pubsubReceived(state, query, input)
              }
            } catch (e) {
              console.log(e)
            }
          }
        }

        this.warp.use(
          new CustomSubscriptionPlugin(this.contractTxId, this.warp)
        )
      }
      this.db
        .readState()
        .then(data => (states[this.contractTxId] = data.cachedValue.state))
        .catch(() => {})
    } else {
      if (this.subscribe) {
        /*
        clearInterval(this.interval)
        this.interval = setInterval(() => {
          this.db
            .readState()
            .then(async v => {
              const state = v.cachedValue.state
              if (!equals(state, this.state)) {
                this.state = state
                states[this.contractTxId] = state
                const info = await this.arweave.network.getInfo()
                await _on(state, this.contractTxId, {
                  height: info.height,
                  timestamp: Math.round(Date.now() / 1000),
                  id: info.current,
                })
              }
            })
            .catch(v => {
              console.log("readState error")
              clearInterval(this.interval)
            })
            }, 1000)
        */
      }
    }
  }

  async read(params) {
    return (await this.db.viewState(params)).result
  }

  async write(func, param, dryWrite, bundle, relay = false) {
    if (relay) {
      return param
    } else {
      const start = Date.now()
      if (dryWrite) {
        let dryState = await this.db.dryWrite(param)
        if (dryState.type !== "ok")
          return {
            success: false,
            duration: Date.now() - start,
            error: { message: "dryWrite failed", dryWrite: dryState },
            function: param.function,
          }
      }
      return await this.send(param, bundle, start)
    }
  }

  async send(param, bundle, start) {
    let tx = await this.db[
      bundle && this.network !== "localhost"
        ? "bundleInteraction"
        : "writeInteraction"
    ](param, {})
    if (this.network === "localhost") await this.mineBlock()
    let state
    if (isNil(tx.originalTxId)) {
      return {
        success: false,
        duration: Date.now() - start,
        error: { message: "tx didn't go through" },
        function: param.function,
      }
    } else {
      state = await this.db.readState()
      const valid = state.cachedValue.validity[tx.originalTxId]
      if (valid === false) {
        return {
          success: false,
          duration: Date.now() - start,
          error: { message: "tx not valid" },
          function: param.function,
          ...tx,
        }
      } else if (isNil(valid)) {
        return {
          success: false,
          duration: Date.now() - start,
          error: { message: "tx validity missing" },
          function: param.function,
          ...tx,
        }
      }
    }

    let res = {
      success: true,
      error: null,
      function: param.function,
      query: param.query,
      ...tx,
    }
    let func = param.function
    let query = param.query
    if (param.function === "relay") {
      func = query[1].function
      query = query[1].query
      res.relayedFunc = func
      res.relayedQuery = query
    }
    if (includes(func, ["add", "update", "upsert", "set"])) {
      try {
        if (func === "add") {
          res.docID = (
            await ids(state.cachedValue.state, {
              input: { tx: tx.originalTxId },
            })
          ).result[0]
          res.path = o(append(res.docID), tail)(query)
        } else {
          res.path = tail(query)
          res.docID = last(res.path)
        }
        res.doc = (
          await get(clone(state.cachedValue.state), {
            input: { query: res.path },
          })
        ).result
      } catch (e) {
        console.log(e)
      }
    }
    res.duration = Date.now() - start

    if (
      this.network === "localhost" &&
      this.subscribe &&
      !isNil(this.onUpdate) &&
      res.success
    ) {
      const state = await this.db.readState()
      this.state = state
      states[this.contractTxId] = state
      const info = await this.arweave.network.getInfo()
      setTimeout(async () => {
        await this.pubsubReceived(state.cachedValue.state, param, {
          interaction: { id: res.originalTxId },
        })
      }, 0)
      await _on(state, {
        contractTxId: this.contractTxId,
        interaction: {
          block: {
            height: info.height,
            timestamp: Math.round(Date.now() / 1000),
            id: info.current,
          },
        },
      })
    }
    return res
  }

  async subscribe(isCon, ...query) {
    const { path } = parseQuery(query)
    const isDoc = path.length % 2 === 0
    subs[this.contractTxId] ||= {}
    const cb = query.pop()
    const hash = md5(JSON.stringify(query))
    const id = shortid()
    subs[this.contractTxId][hash] ||= {
      prev: undefined,
      subs: {},
      query,
      height: 0,
      doc: isDoc,
    }
    subs[this.contractTxId][hash].subs[id] = { cb, con: isCon }
    submap[id] = hash
    this.cget(...query)
      .then(v => {
        if (
          !isNil(subs[this.contractTxId][hash].subs[id]) &&
          subs[this.contractTxId][hash].height === 0
        ) {
          subs[this.contractTxId][hash].prev = v
          cb(isCon ? v : isDoc ? (isNil(v) ? null : v.data) : pluck("data", v))
        }
      })
      .catch(e => {
        console.log("cget error")
      })
    return () => {
      try {
        delete subs[this.contractTxId][hash].subs[id]
        delete submap[id]
      } catch (e) {}
    }
  }

  async getCache(...query) {
    if (isNil(states[this.contractTxId])) return null
    return (
      await get(
        clone(states[this.contractTxId]),
        {
          input: { query },
        },
        false,
        { block: {} }
      )
    ).result
  }

  async cgetCache(...query) {
    if (isNil(states[this.contractTxId])) return null
    return (
      await get(
        clone(states[this.contractTxId]),
        {
          input: { query },
        },
        true,
        { block: {} }
      )
    ).result
  }

  async on(...query) {
    return await this.subscribe(false, ...query)
  }

  async con(...query) {
    return await this.subscribe(true, ...query)
  }

  static getPath(func, query) {
    if (includes(func, no_paths)) return []
    let _path = clone(query)
    if (includes(func, is_data)) _path = tail(_path)
    return splitWhen(complement(is)(String), _path)[0]
  }

  static getCollectionPath(func, query) {
    let _query = SDK.getPath(func, query)
    const len = _query.length
    return len === 0
      ? "__root__"
      : (len % 2 === 0 ? init(_query) : _query).join("/")
  }

  static getDocPath(func, query) {
    let _query = SDK.getPath(func, query)
    const len = _query.length
    return len === 0 ? "__root__" : len % 2 === 1 ? "__col__" : _query.join("/")
  }

  static getKey(contractTxId, func, query, prefix) {
    let colPath = SDK.getCollectionPath(func, query)
    let docPath = SDK.getDocPath(func, query)
    let key = [
      contractTxId,
      /^__.*__$/.test(colPath) ? colPath : md5(colPath),
      /^__.*__$/.test(docPath) ? docPath : md5(docPath),
      func === "get" ? "cget" : func,
      md5(query),
    ]
    if (!isNil(prefix)) key.unshift(prefix)
    return key.join(".")
  }

  static getKeyInfo(contractTxId, query, prefix = null) {
    const path = SDK.getPath(query.function, query.query)
    const len = path.length
    return {
      type: len === 0 ? "root" : len % 2 === 0 ? "doc" : "collection",
      path,
      collectionPath: SDK.getCollectionPath(query.function, query.query),
      docPath: SDK.getDocPath(query.function, query.query),
      contractTxId,
      prefix,
      func: query.function === "get" ? "cget" : query.function,
      query: query.query,
      key: SDK.getKey(contractTxId, query.function, query.query, prefix),
    }
  }

  static getKeys(contractTxId, query, prefix = null) {
    let keys = []
    try {
      if (query.function === "batch") {
        keys = map(
          v =>
            SDK.getKeyInfo(
              contractTxId,
              { function: v[0], query: tail(v) },
              prefix
            ),
          query.query
        )
      } else {
        const q =
          query.function === "relay"
            ? SDK.getKeyInfo(contractTxId, query.query[1], prefix)
            : SDK.getKeyInfo(contractTxId, query, prefix)
        keys.push(q)
      }
    } catch (e) {
      console.log(e)
    }
    return keys
  }

  async pubsubReceived(state, query, input) {
    const keys = SDK.getKeys(this.contractTxId, query, this.cache_prefix)
    const updates = {}
    const deletes = []
    for (let v of keys) {
      let _query = null
      if (v.func === "add") {
        const docID = (
          await ids(clone(state), { input: { tx: input.interaction.id } })
        ).result[0]
        _query = append(docID, v.path)
      } else if (includes(v.func)(["upsert", "set", "update"])) {
        _query = v.path
      }
      if (!isNil(_query)) {
        let val = (
          await get(
            clone(state),
            {
              input: { query: _query },
            },
            true,
            { block: {} }
          )
        ).result
        if (!isNil(val)) delete val.block
        const key = SDK.getKey(
          this.contractTxId,
          "cget",
          _query,
          this.cache_prefix
        )
        updates[key] = val
      }
      if (v.func === "delete") {
        _query = v.path
        const key = SDK.getKey(
          this.contractTxId,
          "cget",
          _query,
          this.cache_prefix
        )
        updates[key] = null
      }
    }
    for (const k in updates) {
      if (updates[k] === null) {
        deletes.push(k)
        delete updates[k]
      }
      deletes.push(`${k.split(".").slice(0, 3).join(".")}.__col__.*`)
    }
    this.onUpdate(
      state,
      query,
      {
        keys,
        updates,
        deletes: uniq(deletes),
      },
      input
    )
  }
}

module.exports = SDK
