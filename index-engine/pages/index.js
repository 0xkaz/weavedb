import lf from "localforage"
import {
  Select,
  Textarea,
  Input,
  Flex,
  Box,
  ChakraProvider,
} from "@chakra-ui/react"
import { nanoid } from "nanoid"
import { useEffect, useState } from "react"
import {
  intersection,
  difference,
  assoc,
  prepend,
  without,
  reject,
  propEq,
  split,
  join,
  tail,
  values,
  compose,
  flatten,
  pluck,
  last,
  clone,
  append,
  includes,
  addIndex,
  range,
  isNil,
  map,
  keys,
} from "ramda"

const BPT = require("../lib/BPT")
const { gen, isErr, build } = require("../lib/utils")
let tree = null
let idtree = null
let init = false

let ids = {}
let stop = false

const initial_order = 5
let _his = []
for (const i of range(0, initial_order * 5)) {
  _his.push(gen("number"))
}
let _his2 = []
for (const i of range(0, initial_order * 5)) {
  _his2.push(gen("string"))
}

let _his3 = []
for (const i of range(0, initial_order * 5)) {
  _his3.push(gen("boolean"))
}
const default_schema = [
  { key: "name", type: "string" },
  { key: "age", type: "number" },
  { key: "married", type: "boolean" },
]
let _his4 = []
for (const i of range(0, initial_order * 5)) {
  _his4.push(gen("object", default_schema))
}

let len = 0
let prev_count = 0
let isDel = false
let last_id = null
let count = 0
const KV = require("lib/KV")
export default function Home() {
  const [getKey, setGetKey] = useState("")
  const [queryType, setQueryType] = useState("single")
  const [result, setResult] = useState(undefined)
  const [auto, setAuto] = useState(false)
  const [store, setStore] = useState("{}")
  const [cols, setCols] = useState([])
  const [indexes, setIndexes] = useState({})
  const [index, setIndex] = useState(null)
  const [col, setCol] = useState(null)
  const [order, setOrder] = useState(initial_order)
  const [schema, setSchema] = useState(default_schema)
  const [currentOrder, setCurrentOrder] = useState(initial_order)
  const [currentType, setCurrentType] = useState("number")
  const [currentSchema, setCurrentSchema] = useState(schema)
  const [data_type, setDataType] = useState("number")
  const [number, setNumber] = useState("")
  const [data, setData] = useState("{}")
  const [bool, setBool] = useState("true")
  const [str, setStr] = useState("")
  const [obj, setObj] = useState("")
  const [update_type, setUpdateType] = useState("create")
  const [options, setOptions] = useState("{}")
  const [his, setHis] = useState([])
  const [limit, setLimit] = useState(5)
  const [updateId, setUpdateId] = useState("")
  const [fields, setFields] = useState("age:asc,name:desc")
  const [field, setField] = useState("")
  const [field_type, setFieldType] = useState("number")
  const [currentFields, setCurrentFields] = useState("age:asc,name:desc")
  const [display, setDisplay] = useState("Box")
  const [initValues, setInitValues] = useState(clone(_his).join(","))
  const [initValuesStr, setInitValuesStr] = useState(clone(_his2).join(","))
  const [initValuesBool, setInitValuesBool] = useState(clone(_his3).join(","))
  const [initValuesObject, setInitValuesObject] = useState(
    map(v => `${v.name},${v.age},${v.married}`)(clone(_his4)).join("\n")
  )
  const [exErr, setExErr] = useState([false, null])
  const reset = async () => {
    if (order < 3) return alert("order must be >= 3")
    setCurrentOrder(order)
    setCurrentType(data_type)
    setCurrentSchema(schema)
    count = 0
    isDel = false
    last_id = null
    prev_count = 0
    const sort_fields =
      data_type === "object" ? map(split(":"))(fields.split(",")) : null
    setCurrentFields(sort_fields)
    const kv = new KV()
    tree = new BPT(order, sort_fields ?? data_type, kv, function (stats) {
      if (!isNil(setStore)) setStore(JSON.stringify(this.kv.store))
    })
    const arr =
      data_type === "number"
        ? map(v => v * 1)(initValues.split(","))
        : data_type === "object"
        ? compose(
            map(v => {
              let obj = {}
              let i = 0
              for (let v2 of schema) {
                obj[v2.key] =
                  v2.type === "string"
                    ? v[i]
                    : v2.type === "number"
                    ? v[i] * 1
                    : v[i] === "true"
                i++
              }
              return obj
            }),
            map(split(",")),
            split("\n")
          )(initValuesObject)
        : data_type === "string"
        ? initValuesStr.split(",")
        : initValuesBool.split(",")
    let _err
    ;(async () => {
      for (const n of arr) {
        ;(currentType === "number" && n < 0) ||
        (currentType !== "number" && /^-/.test(n))
          ? (_err = await del(`id:${n * -1}`))
          : (_err = await insert(
              data_type === "boolean"
                ? typeof n === "string"
                  ? n === "true"
                  : n
                : n
            ))
        if (_err[0]) {
          console.log(_err)
          break
        }
      }
    })()
    setStore("{}")
    setHis([])
    _his2 = []
    ids = {}
  }

  const insert = async val => {
    const id = `id:${(++count).toString()}`
    ids[id] = true
    isDel = false
    last_id = id
    await tree.insert(id, val)
    _his2 = append({ val, op: "insert", id }, _his2)
    setHis(_his2)
    const _err = isErr(tree.kv.store, currentOrder, last_id, isDel, prev_count)
    setExErr(_err)
    const [err, where, arrs, _len, _vals] = _err
    prev_count = _len
    len = _len
    return _err
  }
  const delData = async key => {
    const _keys = keys(ids)
    key = isNil(key) ? _keys[Math.floor(Math.random() * _keys.length)] : key
    last_id = key
    const __data = await tree.data(key)
    const _data = __data.val
    const id = key
    _his2 = append({ val: _data, op: "del", id: key }, _his2)
    setHis(_his2)
    isDel = true
    await idtree.delete(key)
    delete ids[key]
    const _err = isErr(
      idtree.kv.store,
      currentOrder,
      last_id,
      isDel,
      prev_count
    )
    setExErr(_err)
    const [err, where, arrs, _len, _vals] = _err
    prev_count = _len
    len = _len
    if (typeof _data === "object") {
      for (const k in indexes) {
        const fields = keys(_data)
        const i_fields = compose(
          without(["__id__"]),
          map(v => v.split(":")[0])
        )(k.split("/"))
        const diff = difference(i_fields, fields)
        if (i_fields.length > 0 && diff.length === 0) {
          const sort_fields = map(v => v.split(":"))(k.split("/"))
          const skey = `index.${col}//${compose(
            join("/"),
            flatten
          )(sort_fields)}`
          if (k === index) {
            await tree.delete(id)
          } else {
            const kv = new KV(skey)
            const tree = new BPT(3, sort_fields, kv, function (stats) {})
            await tree.delete(id)
          }
        }
      }
    }
    setStore(JSON.stringify(tree.kv.store))
    return _err
  }
  const del = async key => {
    if (!isNil(col)) {
      return await delData(key)
    }
    const _keys = keys(ids)
    key = isNil(key) ? _keys[Math.floor(Math.random() * _keys.length)] : key
    last_id = key
    _his2 = append(
      { val: (await tree.data(key)).val, op: "del", id: key },
      _his2
    )
    setHis(_his2)
    isDel = true
    await tree.delete(key)
    delete ids[key]
    const _err = isErr(tree.kv.store, currentOrder, last_id, isDel, prev_count)
    setExErr(_err)
    const [err, where, arrs, _len, _vals] = _err
    prev_count = _len
    len = _len
    return _err
  }

  const go = async () => {
    if (stop) return
    setTimeout(async () => {
      try {
        const _keys = keys(ids)
        let _err
        if (!isNil(col)) {
          _err = await addData()
        } else if (
          _keys.length > 0 &&
          Math.random() < (_keys.length > order * 10 ? 0.8 : 0.2)
        ) {
          _err = await del()
        } else {
          _err = await insert(gen(currentType, currentSchema))
        }
        const [err, where, arrs, len, vals] = _err
        !err ? go() : setAuto(true)
      } catch (e) {
        console.log(e)
      }
    }, 100)
  }

  useEffect(() => {
    if (!init) {
      init = true
      reset()
    }
    ;(async () => {
      setCols((await lf.getItem("cols")) || [])
    })()
  }, [])
  useEffect(() => {
    ;(async () => {
      if (!isNil(col)) {
        setExErr([false, null])
        const count = (await lf.getItem(`count-${col}`)) ?? 0
        const index_key = `indexes-${col}`
        let _indexes = (await lf.getItem(index_key)) || {}
        setIndex("__id__:asc")
        setCurrentFields([["__id__", "asc"]])
        setCurrentType("object")
        setHis([])
        _his2 = []
        ids = {}
        setCurrentOrder(3)
        setHis(_his2)
        const kv = new KV(`index.${col}//__id__/asc`)
        tree = new BPT(3, [["__id__", "asc"]], kv, function (stats) {
          if (!isNil(setStore) && index === "__id__:asc") {
            setStore(JSON.stringify(this.kv.store))
          }
        })
        idtree = tree
        prev_count = 0
        if (isNil(_indexes["__id__:asc"])) {
          for (let i = 1; i <= count; i++) {
            const _log = await lf.getItem(`log-${col}-${i}`)
            await tree.insert(_log.key, _log.val)
          }
          const key = "__id__:asc"
          _indexes = assoc(key, { order: 3, key }, _indexes)
          setIndexes(_indexes)
        } else {
          setIndexes(_indexes)
          let root = await tree.root()
          await tree.get("count")
          const getNode = async root => {
            let node = await tree.get(root)
            if (node.leaf) {
              for (let v of node.vals) {
                await tree.data(v)
                prev_count += 1
              }
            } else {
              for (let v of node.children) await getNode(v)
            }
          }
          if (!isNil(root)) {
            await getNode(root)
          }
        }
        if (typeof _data === "object") {
          let _indexes = clone(indexes)
          for (const k in _data) {
            const key = `${k}:asc`
            if (isNil(indexes[key])) _indexes[key] = { order: 3, key }
            if (key === index) {
              await tree.insert(id, _data)
            } else {
              const kv = new KV(`index.${col}//${k}/asc`)
              const _tree = new BPT(3, [[k, "asc"]], kv, function (stats) {})
              await _tree.insert(id, _data)
            }
          }
          await lf.setItem(`indexes-${col}`, _indexes)
          setIndexes(_indexes)
          for (const k in indexes) {
            const fields = keys(_data)
            const i_fields = compose(
              without(["__id__"]),
              map(v => v.split(":")[0])
            )(k.split("/"))
            const diff = difference(i_fields, fields)
            if (i_fields.length > 1 && diff.length === 0) {
              const kv = new KV(`index.${col}//${k}/asc`)
              const sort_fields = map(v => v.split(":"))(k.split("/"))
              if (k === index) {
                await tree.insert(id, _data)
              } else {
                const tree = new BPT(3, sort_fields, kv, function (stats) {})
                await tree.insert(id, _data)
              }
            }
          }
        }
        await lf.setItem(index_key, _indexes)
        setStore(JSON.stringify(tree.kv.store))
      }
    })()
  }, [col])

  useEffect(() => {
    ;(async () => {
      if (!isNil(index)) {
        const sort_fields = map(v => v.split(":"))(index.split("/"))
        if (index === "__id__:asc") {
          tree = idtree
        } else {
          const kv = new KV(
            `index.${col}//${compose(join("/"), flatten)(sort_fields)}`
          )
          tree = new BPT(3, sort_fields, kv, function (stats) {
            if (!isNil(setStore)) setStore(JSON.stringify(this.kv.store))
          })
          let root = await tree.root()
          await tree.get("count")
          const getNode = async root => {
            let node = await tree.get(root)
            if (isNil(node)) return null
            if (node.leaf) {
              for (let v of node.vals) {
                await tree.data(v)
              }
            } else {
              for (let v of node.children) await getNode(v)
            }
          }
          if (!isNil(root)) await getNode(root)
        }
        setStore(JSON.stringify(tree.kv.store))
        setCurrentFields(sort_fields)
      }
    })()
  }, [index])

  let { nodemap, arrs } = build(store)
  const updateData = async (id, _data) => {
    let old_data = await idtree.data(id)
    if (!isNil(old_data?.val)) {
      let data = clone(old_data.val)
      let dels = []
      let changes = []
      let news = []
      if (typeof _data === "object") {
        let _indexes = clone(indexes)
        for (let k in _data) {
          if (_data[k].__op === "del") {
            dels.push(k)
            delete data[k]
          } else {
            if (isNil(data[k])) {
              news.push(k)
            } else if (data[k] !== _data[k]) {
              changes.push(k)
            }
            data[k] = _data[k]
          }
        }
        await idtree.putData(updateId, data)
        let newkeys = {}
        for (const k of news) {
          const key = `${k}:asc`
          newkeys[key] = true
          if (isNil(indexes[key])) {
            _indexes[key] = { order: 3, key }
          }
          if (index !== key) {
            const kv = new KV(`index.${col}//${k}/asc`)
            const _tree = new BPT(3, [[k, "asc"]], kv, function (stats) {})
            await _tree.insert(id, _data)
          } else {
            await tree.insert(id, _data)
          }
        }
        setIndexes(_indexes)
        const fields = keys(data)
        const old_fields = keys(old_data.val)
        for (const k in _indexes) {
          if (isNil(newkeys[k])) {
            const i_fields = compose(
              without(["__id__"]),
              map(v => v.split(":")[0])
            )(k.split("/"))
            const diff = difference(i_fields, fields)
            const old_diff = difference(i_fields, old_fields)
            if (
              i_fields.length > 0 &&
              (diff.length === 0 || old_diff.length === 0)
            ) {
              let isAdd = false
              let isDel = false
              if (intersection(i_fields, news).length > 0) isAdd = true
              if (intersection(i_fields, changes).length > 0) {
                isDel = true
                isAdd = true
              }
              if (intersection(i_fields, dels).length > 0) {
                isDel = true
                isAdd = false
              }
              if (isDel) {
                const sort_fields = map(v => v.split(":"))(k.split("/"))
                const skey = `index.${col}//${compose(
                  join("/"),
                  flatten
                )(sort_fields)}`
                if (k === index) {
                  await tree.delete(id)
                } else {
                  const kv = new KV(skey)
                  const tree = new BPT(3, sort_fields, kv, function (stats) {})
                  await tree.delete(id)
                }
              }
              if (isAdd) {
                const sort_fields = map(v => v.split(":"))(k.split("/"))
                const skey = `index.${col}//${compose(
                  join("/"),
                  flatten
                )(sort_fields)}`
                if (k === index) {
                  await tree.insert(id, _data)
                } else {
                  const kv = new KV(skey)
                  const tree = new BPT(3, sort_fields, kv, function (stats) {})
                  await tree.insert(id, _data)
                }
              }
            }
          }
        }
      }
    }
  }
  const addData = async () => {
    let _data = null
    isDel = false
    try {
      eval(`_data = ${data}`)
    } catch (e) {
      alert("data couldn't parse")
      return
    }
    if (typeof _data !== "object") {
      alert("data must be an object")
      return
    }
    if (update_type === "update") {
      await updateData(updateId, _data)
      return
    }
    const count = (await lf.getItem(`count-${col}`)) ?? 0
    const id = nanoid()
    last_id = id
    const log = { id: count + 1, op: "create", val: _data, key: id }
    await lf.setItem(`log-${col}-${count + 1}`, log)
    await lf.setItem(`count-${col}`, count + 1)
    await idtree.insert(id, _data)
    const _err = isErr(
      idtree.kv.store,
      currentOrder,
      last_id,
      isDel,
      prev_count
    )
    setExErr(_err)
    const [err, where, arrs, _len, _vals] = _err
    prev_count = _len
    len = _len
    setData("{}")
    _his2 = append({ val: _data, op: "insert", id }, _his2)
    setHis(_his2)
    if (typeof _data === "object") {
      let _indexes = clone(indexes)
      for (const k in _data) {
        const key = `${k}:asc`
        if (isNil(indexes[key])) _indexes[key] = { order: 3, key }
        if (key === index) {
          await tree.insert(id, _data)
        } else {
          const kv = new KV(`index.${col}//${k}/asc`)
          const _tree = new BPT(3, [[k, "asc"]], kv, function (stats) {})
          await _tree.insert(id, _data)
        }
      }
      await lf.setItem(`indexes-${col}`, _indexes)
      setIndexes(_indexes)
      const fields = keys(_data)
      for (const k in indexes) {
        const i_fields = compose(
          without(["__id__"]),
          map(v => v.split(":")[0])
        )(k.split("/"))
        const diff = difference(i_fields, fields)
        if (i_fields.length > 1 && diff.length === 0) {
          const sort_fields = map(v => v.split(":"))(k.split("/"))
          const skey = `index.${col}//${compose(
            join("/"),
            flatten
          )(sort_fields)}`
          if (k === index) {
            await tree.insert(id, _data)
          } else {
            const kv = new KV(skey)
            const tree = new BPT(3, sort_fields, kv, function (stats) {})
            await tree.insert(id, _data)
          }
        }
      }
    }
    setStore(JSON.stringify(tree.kv.store))
    return _err
  }
  const addNumber = async () => {
    if (number !== "") {
      await insert(number * 1)
      setNumber("")
      setTimeout(() => {
        document.getElementById("number").focus()
      }, 100)
    }
  }
  const addBool = async () => await insert(bool)
  const addString = async () => {
    if (str !== "") {
      await insert(str)
      setStr("")
      setTimeout(() => {
        document.getElementById("number").focus()
      }, 100)
    }
  }
  const addObject = async () => {
    const sp = obj.split(",")
    let _obj = {}
    let i = 0
    for (let v2 of schema) {
      _obj[v2.key] =
        v2.type === "string"
          ? sp[i]
          : v2.type === "number"
          ? sp[i] * 1
          : sp[i] === "true"
      i++
    }
    await insert(_obj)
    setObj("")
    setTimeout(() => {
      document.getElementById("number").focus()
    }, 100)
  }
  const [err, where] = exErr
  const _indexes = []
  for (let k in indexes) {
    _indexes.push(indexes[k])
  }
  return (
    <ChakraProvider>
      <style global jsx>{`
        html,
        body,
        #__next {
          height: 100%;
        }
      `}</style>
      <Box
        height="100%"
        w="250px"
        px={3}
        py={2}
        bg="#eee"
        fontSize="12px"
        sx={{ overflowY: "auto" }}
      >
        <Flex align="center" direction="column">
          <Box>WeaveDB</Box>
          <Box>B+ Tree Index Engine</Box>
        </Flex>
        <Box as="hr" my={3} />
        <Box flex={1}>
          <Flex mx={2} mt={2} color="#666" mb={1} fontSize="10px">
            Collections
          </Flex>
          <Flex mx={2} mb={2}>
            <Flex
              flex={1}
              align="center"
              p={1}
              justify="center"
              bg="#666"
              color="white"
              onClick={async () => {
                const _cols = append(nanoid(), cols)
                setCols(_cols)
                await lf.setItem("cols", _cols)
              }}
              sx={{
                borderRadius: "3px",
                cursor: "pointer",
                ":hover": { opacity: 0.75 },
              }}
            >
              Add Collection
            </Flex>
          </Flex>
        </Box>
        <Box px={3}>
          {map(v => (
            <Flex color={col === v ? "#6441AF" : "#666"}>
              <Box
                flex={1}
                onClick={() => setCol(v)}
                sx={{ cursor: "pointer", ":hover": { opacity: 0.75 } }}
              >
                {v ?? "not selected"}
              </Box>
              {v === null ? null : (
                <Box
                  onClick={async () => {
                    const _cols = without([v], cols)
                    setCols(_cols)
                    await lf.setItem("cols", _cols)
                    if (v === col) setCol(null)
                  }}
                  sx={{ cursor: "pointer", ":hover": { opacity: 0.75 } }}
                >
                  x
                </Box>
              )}
            </Flex>
          ))(prepend(null, cols))}
        </Box>
        {isNil(col) ? null : (
          <>
            <Box as="hr" my={3} />
            <Box flex={1}>
              <Flex mx={2} mt={2} color="#666" mb={1} fontSize="10px">
                Indexes
              </Flex>
              <Box px={3}>
                {map(v => (
                  <Flex color={index === v.key ? "#6441AF" : "#666"}>
                    <Box
                      flex={1}
                      onClick={() => setIndex(v.key)}
                      sx={{ cursor: "pointer", ":hover": { opacity: 0.75 } }}
                    >
                      {v.key}
                    </Box>
                    {v === null ? null : (
                      <Box
                        onClick={async () => {
                          console.log(v)
                        }}
                        sx={{ cursor: "pointer", ":hover": { opacity: 0.75 } }}
                      >
                        x
                      </Box>
                    )}
                  </Flex>
                ))(_indexes)}
              </Box>
            </Box>
          </>
        )}
        {!isNil(col) ? null : (
          <>
            <Box as="hr" my={3} />
            <Flex>
              <Box flex={1}>
                <Flex mx={2} mt={2} color="#666" mb={1} fontSize="10px">
                  Data Type
                </Flex>
                <Flex mx={2} mb={2}>
                  <Select
                    onChange={e => setDataType(e.target.value)}
                    value={data_type}
                    bg="white"
                    fontSize="12px"
                    height="28px"
                    sx={{ borderRadius: "3px" }}
                  >
                    {map(v => <option value={v}>{v}</option>)([
                      "number",
                      "string",
                      "boolean",
                      "object",
                    ])}
                  </Select>
                </Flex>
              </Box>
              <Box flex={1}>
                <Flex mx={2} mt={2} color="#666" mb={1} fontSize="10px">
                  Order
                </Flex>
                <Flex mx={2} mb={2}>
                  <Input
                    onChange={e => {
                      const ord = e.target.value * 1
                      if (!isNaN(ord)) setOrder(ord)
                    }}
                    placeholder="Order"
                    value={order}
                    height="auto"
                    flex={1}
                    bg="white"
                    fontSize="12px"
                    py={1}
                    px={3}
                    sx={{ borderRadius: "3px 0 0 3px" }}
                  />
                </Flex>
              </Box>
            </Flex>
            {data_type !== "object" ? null : (
              <Box fontSize="10px">
                <Flex mx={2} mt={2} color="#666" mb={1} fontSize="10px">
                  Schema
                </Flex>
                <Flex mx={2}>
                  <Input
                    onChange={e => setField(e.target.value)}
                    placeholder="name"
                    value={field}
                    height="auto"
                    flex={1}
                    bg="white"
                    fontSize="12px"
                    py={1}
                    px={3}
                    sx={{ borderRadius: "3px 0 0 3px" }}
                  />
                  <Select
                    onChange={e => {
                      setFieldType(e.target.value)
                    }}
                    value={field_type}
                    height="28px"
                    width="100px"
                    bg="white"
                    fontSize="12px"
                    sx={{ borderRadius: "0" }}
                  >
                    {map(v => <option value={v}>{v}</option>)([
                      "number",
                      "string",
                      "boolean",
                    ])}
                  </Select>
                  <Flex
                    width="30px"
                    align="center"
                    p={1}
                    justify="center"
                    bg="#666"
                    color="white"
                    onClick={async () => {
                      if (!/^\s*$/.test(field)) {
                        setField("")
                        setSchema(
                          compose(
                            append({ key: field, type: field_type }),
                            reject(propEq(field, "key"))
                          )(schema)
                        )
                      }
                    }}
                    sx={{
                      borderRadius: "0 3px 3px 0",
                      cursor: "pointer",
                      ":hover": { opacity: 0.75 },
                    }}
                  >
                    +
                  </Flex>
                </Flex>
                <Box mx={3} my={2}>
                  {map(v => {
                    return (
                      <Flex align="center" my={1}>
                        <Flex flex={1}>{v.key}</Flex>
                        <Flex flex={1}>{v.type}</Flex>
                        <Flex
                          onClick={() => {
                            setSchema(reject(propEq(v.key, "key"))(schema))
                          }}
                          sx={{
                            textDecoration: "underline",
                            cursor: "pointer",
                          }}
                          color="#6441AF"
                        >
                          Remove
                        </Flex>
                      </Flex>
                    )
                  })(schema)}
                </Box>
              </Box>
            )}
            <Flex mx={2} color="#666" mb={1} fontSize="10px">
              <Box>
                Initial Values (
                {currentType === "object" ? "csv" : "comma separeted"})
              </Box>
            </Flex>
            <Flex mx={2} mb={2}>
              {data_type === "boolean" ? (
                <Input
                  onChange={e => setInitValuesBool(e.target.value)}
                  placeholder="Order"
                  value={initValuesBool}
                  height="auto"
                  flex={1}
                  bg="white"
                  fontSize="12px"
                  py={1}
                  px={3}
                  sx={{ borderRadius: "3px 0 0 3px" }}
                />
              ) : data_type === "string" ? (
                <Input
                  onChange={e => setInitValuesStr(e.target.value)}
                  placeholder="Order"
                  value={initValuesStr}
                  height="auto"
                  flex={1}
                  bg="white"
                  fontSize="12px"
                  py={1}
                  px={3}
                  sx={{ borderRadius: "3px 0 0 3px" }}
                />
              ) : data_type === "object" ? (
                <Textarea
                  onChange={e => setInitValuesObject(e.target.value)}
                  placeholder="Order"
                  value={initValuesObject}
                  height="auto"
                  flex={1}
                  bg="white"
                  fontSize="12px"
                  py={1}
                  px={3}
                  sx={{ borderRadius: "3px 0 0 3px" }}
                />
              ) : (
                <Input
                  onChange={e => setInitValues(e.target.value)}
                  placeholder="Order"
                  value={initValues}
                  height="auto"
                  flex={1}
                  bg="white"
                  fontSize="12px"
                  py={1}
                  px={3}
                  sx={{ borderRadius: "3px 0 0 3px" }}
                />
              )}
            </Flex>
            {data_type === "object" ? (
              <>
                <Flex mx={2} color="#666" mb={1} fontSize="10px">
                  <Box>Sort Fields (e.g. age=asc,name=desc)</Box>
                </Flex>
                <Flex mx={2} mb={2}>
                  <Input
                    onChange={e => setFields(e.target.value)}
                    placeholder="Order"
                    value={fields}
                    height="auto"
                    flex={1}
                    bg="white"
                    fontSize="12px"
                    py={1}
                    px={3}
                    sx={{ borderRadius: "3px 0 0 3px" }}
                  />
                </Flex>
              </>
            ) : null}
            <Flex
              align="center"
              p={1}
              mx={2}
              justify="center"
              bg="#666"
              color="white"
              onClick={async () => {
                reset()
              }}
              sx={{
                borderRadius: "3px",
                cursor: "pointer",
                ":hover": { opacity: 0.75 },
              }}
            >
              Reset
            </Flex>
          </>
        )}
        <Box as="hr" my={3} />
        <Flex mx={2} mt={2} color="#666" mb={1} fontSize="10px">
          {map(v => (
            <Box
              mr={2}
              sx={{ cursor: "pointer" }}
              color={v.key === update_type ? "#6441AF" : "#333"}
              onClick={() => setUpdateType(v.key)}
            >
              {v.key}
            </Box>
          ))([{ key: "create" }, { key: "update" }])}
        </Flex>
        {update_type !== "update" ? null : (
          <Flex mx={2} mb={2}>
            <Input
              height="auto"
              py={1}
              px={3}
              bg="white"
              fontSize="12px"
              placeholder="docid"
              sx={{ borderRadius: "3px 0 0 3px" }}
              value={updateId}
              onChange={e => setUpdateId(e.target.value)}
            />
          </Flex>
        )}
        <Flex mx={2} mb={2}>
          {!isNil(col) || currentType !== "boolean" ? (
            <Input
              onChange={e => {
                if (!isNil(col)) {
                  setData(e.target.value)
                } else if (currentType === "number") {
                  const num = e.target.value * 1
                  if (!isNaN(num)) setNumber(num)
                } else if (currentType === "string") {
                  setStr(e.target.value)
                } else {
                  setObj(e.target.value)
                }
              }}
              placeholder={
                !isNil(col)
                  ? "data"
                  : currentType === "object"
                  ? pluck("type")(schema).join(",")
                  : currentType
              }
              value={
                !isNil(col)
                  ? data
                  : currentType === "number"
                  ? number
                  : currentType === "string"
                  ? str
                  : obj
              }
              height="auto"
              flex={1}
              bg="white"
              fontSize="12px"
              id="number"
              py={1}
              px={3}
              sx={{ borderRadius: "3px 0 0 3px" }}
              onKeyDown={async e => {
                if (e.code === "Enter") {
                  !isNil(col)
                    ? addData()
                    : currentType === "number"
                    ? addNumber()
                    : currentType === "string"
                    ? addString()
                    : addObject()
                }
              }}
            />
          ) : (
            <Select
              onChange={e => {
                setBool(e.target.value)
              }}
              value={bool}
              height="28px"
              flex={1}
              bg="white"
              fontSize="12px"
              sx={{ borderRadius: "3px 0 0 3px" }}
            >
              <option value={"true"}>True</option>
              <option value={"false"}>False</option>
            </Select>
          )}
          <Flex
            width="80px"
            align="center"
            p={1}
            justify="center"
            bg="#666"
            color="white"
            onClick={async () => {
              if (err) return
              !isNil(col)
                ? addData()
                : currentType === "number"
                ? addNumber()
                : currentType === "string"
                ? addString()
                : currentType === "boolean"
                ? addBool()
                : addObject()
            }}
            sx={{
              borderRadius: "0 3px 3px 0",
              cursor: "pointer",
              ":hover": { opacity: 0.75 },
            }}
          >
            {update_type === "update" ? "Update" : "Add"}
          </Flex>
        </Flex>
        <Flex
          m={2}
          p={1}
          justify="center"
          bg="#666"
          color="white"
          onClick={async () => {
            if (err) return
            if (!isNil(col)) {
              await addData()
            } else {
              const num = gen(currentType, currentSchema)
              await insert(num)
            }
          }}
          sx={{
            borderRadius: "3px",
            cursor: "pointer",
            ":hover": { opacity: 0.75 },
          }}
        >
          Add Random Value
        </Flex>
        <Box as="hr" my={3} />
        <Flex mx={2} mt={2} color="#666" mb={1} fontSize="10px">
          Auto Test
        </Flex>
        <Flex
          m={2}
          p={1}
          justify="center"
          bg="#6441AF"
          color="white"
          onClick={async () => {
            stop = auto
            if (!stop) go()
            setAuto(!auto)
          }}
          sx={{
            borderRadius: "3px",
            cursor: "pointer",
            ":hover": { opacity: 0.75 },
          }}
        >
          {!auto ? "Run" : "Stop"}
        </Flex>
        <Box as="hr" my={3} />
        <Flex mx={2} mt={2} color="#666" mb={1} fontSize="10px">
          Health Check
        </Flex>
        <Box mx={2} color={err ? "salmon" : "#6441AF"}>
          {err ? (
            <Box>
              Error!
              <Box mx={2} as="span" sx={{ textDecoration: "underline" }}>
                {where.id}
              </Box>
              <Box mx={2} as="span" sx={{ textDecoration: "underline" }}>
                {where.type}
              </Box>
              [ {typeof where === "string" ? where : where.arr.join(", ")} ]
            </Box>
          ) : (
            "Fine!"
          )}
        </Box>
        <Box as="hr" my={3} />
        <Flex mx={2} mt={2} color="#666" mb={1} fontSize="10px">
          <Box mr={3}>Query</Box>
          <Flex>
            {map(v => (
              <Box
                mx={1}
                onClick={() => setQueryType(v)}
                color={queryType === v ? "#6441AF" : "#333"}
                sx={{
                  textDecoration: queryType === v ? "underline" : "none",
                  cursor: "pointer",
                }}
              >
                {v}
              </Box>
            ))(["single", "multi"])}
          </Flex>
        </Flex>
        {queryType === "multi" ? (
          <>
            <Flex>
              <Box flex={1}>
                <Flex mx={2} mt={2} color="#666" mb={1} fontSize="10px">
                  Options (JSON) - limit, where, sort
                </Flex>
                <Flex mx={2} mb={2}>
                  <Input
                    onChange={e => {
                      setOptions(e.target.value)
                    }}
                    placeholder="Options"
                    value={options}
                    height="auto"
                    flex={1}
                    bg="white"
                    fontSize="12px"
                    py={1}
                    px={3}
                    sx={{ borderRadius: "3px 0 0 3px" }}
                  />
                </Flex>
              </Box>
            </Flex>
            <Flex
              mx={2}
              align="center"
              p={1}
              justify="center"
              bg="#666"
              color="white"
              onClick={async () => {
                let opt = null
                try {
                  eval(`opt = ${options}`)
                } catch (e) {
                  alert("options couldn't parse")
                  return
                }
                setResult(await tree.range(opt))
              }}
              mt={2}
              sx={{
                borderRadius: "3px",
                cursor: "pointer",
                ":hover": { opacity: 0.75 },
              }}
            >
              Get
            </Flex>
          </>
        ) : (
          <Flex mx={2} mb={2}>
            <Input
              onChange={e => setGetKey(e.target.value)}
              placeholder="doc id"
              value={getKey}
              height="auto"
              flex={1}
              bg="white"
              fontSize="12px"
              id="number"
              py={1}
              px={3}
              sx={{ borderRadius: "3px 0 0 3px" }}
            />
            <Flex
              width="80px"
              align="center"
              p={1}
              justify="center"
              bg="#666"
              color="white"
              onClick={async () => {
                if (!/^\s*$/.test(getKey)) {
                  setResult(await tree.read(getKey))
                }
              }}
              sx={{
                borderRadius: "0 3px 3px 0",
                cursor: "pointer",
                ":hover": { opacity: 0.75 },
              }}
            >
              Get
            </Flex>
          </Flex>
        )}
        {isNil(result) ? null : (
          <Box m={3} color={result.val === null ? "salmon" : "#6441AF"}>
            {JSON.stringify(result)}
          </Box>
        )}
      </Box>
      <Flex
        minH="100%"
        direction="column"
        minW="calc(100vw - 250px)"
        sx={{ position: "absolute", top: 0, left: "250px" }}
      >
        <Box flex={1} p={4}>
          <Box>
            {addIndex(map)((v, i) => (
              <Flex justify="center" fontSize="10px">
                {map(v2 => {
                  return (
                    <Flex
                      m={1}
                      direction="column"
                      p={1}
                      bg="#ccc"
                      sx={{ borderRadius: "3px" }}
                    >
                      <Flex justify="center" fontSize="8px" mb={1}>
                        {v2.parent || "root"}
                      </Flex>
                      <Flex justify="center" align="center">
                        <Box
                          fontSize="8px"
                          ml={1}
                          mr={2}
                          minW="9px"
                          align="center"
                        >
                          {v2.prev ?? "-"}
                        </Box>
                        {addIndex(map)((v3, i3) => {
                          let v3val = v3.val ?? v3.child
                          let val = includes(typeof v3val, ["number", "string"])
                            ? v3val
                            : typeof v3val === "boolean"
                            ? v3val
                              ? "true"
                              : "false"
                            : typeof v3val === "object"
                            ? compose(
                                join(":"),
                                map(v4 => {
                                  return v4[0] === "__id__"
                                    ? typeof v3.key === "object"
                                      ? v3.key.__id__
                                      : v3.key
                                    : v3val[v4[0]]
                                })
                              )(currentFields || [])
                            : "-"
                          return (
                            <Flex
                              px={1}
                              justify="center"
                              bg={
                                !isNil(v3.val)
                                  ? v2.leaf
                                    ? "#bbb"
                                    : "#ddd"
                                  : "white"
                              }
                              sx={{
                                borderY: "1px solid #333",
                                borderRight: "1px solid #333",
                                borderLeft: i3 === 0 ? "1px solid #333" : "",
                                cursor:
                                  i === arrs.length - 1 ? "pointer" : "default",
                                ":hover": { opacity: 0.75 },
                                whiteSpace: "nowrap",
                              }}
                              title={
                                typeof v3.key === "object"
                                  ? v3.key.__id__
                                  : v3.key ?? null
                              }
                              onClick={async () => {
                                if (err) return
                                if (i !== arrs.length - 1) return
                                if (!isNil(v3.key)) await del(v3.key)
                              }}
                            >
                              {val}
                            </Flex>
                          )
                        })(v2.arr)}
                        <Box
                          fontSize="8px"
                          mr={1}
                          ml={2}
                          minW="9px"
                          align="center"
                        >
                          {v2.next ?? "-"}
                        </Box>
                      </Flex>
                      <Flex
                        justify="center"
                        fontSize="8px"
                        mt={1}
                        sx={{ textDecoration: "underline" }}
                      >
                        {v2.id}
                      </Flex>
                    </Flex>
                  )
                })(v)}
              </Flex>
            ))(arrs)}
          </Box>
        </Box>
        <Flex
          p={4}
          fontSize="10px"
          mt={3}
          sx={{ borderTop: "1px solid #eee" }}
          direction="column"
          color="#333"
        >
          <Flex mb={2}>
            <Box px={4} bg="#ddd" sx={{ borderRadius: "3px" }}>
              History
            </Box>
            <Box mx={3}>
              {map(v => (
                <Box
                  mx={1}
                  as="span"
                  color={display === v ? "#6441AF" : "#333"}
                  sx={{
                    textDecoration: display === v ? "underline" : "none",
                    cursor: "pointer",
                  }}
                  onClick={() => setDisplay(v)}
                >
                  {v}
                </Box>
              ))(["Box", "JSON"])}
            </Box>
          </Flex>
          <Flex
            wrap="wrap"
            fontSize={display === "JSON" ? "10px" : "8px"}
            justify="flex-start"
            w="100%"
          >
            {display === "JSON"
              ? `[ ${map(
                  v =>
                    `${
                      v.op === "del"
                        ? `-${v.id.split(":")[1]}`
                        : currentType === "object"
                        ? compose(
                            join(":"),
                            map(v4 => JSON.stringify(v.val))
                          )(currentFields || [])
                        : v.val
                    }`
                )(his).join(", ")} ]`
              : map(v => (
                  <Flex
                    title={v.id}
                    justify="center"
                    align="center"
                    minW="16px"
                    minH="16px"
                    m={1}
                    p={1}
                    as="span"
                    color="white"
                    bg={v.op === "del" ? "salmon" : "#6441AF"}
                    sx={{ borderRadius: "3px", wordBreak: "break-all" }}
                  >
                    {typeof v.val === "boolean"
                      ? v.val
                        ? "true"
                        : "false"
                      : typeof v.val === "object"
                      ? compose(
                          join(":"),
                          map(v4 =>
                            v4[0] === "__id__" ? v.id : v.val[v4[0]] ?? "-"
                          )
                        )(currentFields || [])
                      : v.val}
                  </Flex>
                ))(his)}
          </Flex>
        </Flex>
      </Flex>
    </ChakraProvider>
  )
}
