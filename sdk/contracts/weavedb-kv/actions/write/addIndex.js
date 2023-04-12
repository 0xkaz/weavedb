const { o, flatten, isNil, mergeLeft, includes, init } = require("ramda")
const { wrapResult, parse, err } = require("../../lib/utils")
const { validate } = require("../../lib/validate")
const { addIndex: _addIndex, getIndex } = require("../../lib/index")

const addIndex = async (
  state,
  action,
  signer,
  contractErr = true,
  SmartWeave
) => {
  let original_signer = null
  if (isNil(signer)) {
    ;({ signer, original_signer } = await validate(
      state,
      action,
      "addIndex",
      SmartWeave
    ))
  }
  let { col, _data, data, query, new_data, path } = await parse(
    state,
    action,
    "addIndex",
    signer,
    null,
    contractErr,
    SmartWeave
  )
  if (o(includes("__id__"), flatten)(new_data)) {
    err("index cannot contain __id__")
  }
  const db = async id => {
    const doc_key = `data.${path.join("/")}/${id}`
    return (await SmartWeave.kv.get(doc_key)) || { __data: null, subs: {} }
  }
  await _addIndex(new_data, path, db, SmartWeave)
  return wrapResult(state, original_signer, SmartWeave)
}

module.exports = { addIndex }
