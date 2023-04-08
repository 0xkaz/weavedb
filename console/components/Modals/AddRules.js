import { useState } from "react"
import { Box, Flex, Textarea } from "@chakra-ui/react"
import { isNil, compose, join, map, append } from "ramda"
import { inject } from "roidjs"
import { checkJSON, read, queryDB } from "../../lib/weavedb"
import Editor from "react-simple-code-editor"
import { highlight, languages } from "prismjs/components/prism-core"
import "prismjs/components/prism-clike"
import "prismjs/components/prism-javascript"
import "prismjs/themes/prism.css"
import Modal from "../Modal"

export default inject(
  ["loading", "temp_current", "tx_logs"],
  ({
    newRules,
    setNewRules,
    db,
    doc_path,
    setRules,
    setAddRules,
    col,
    base_path,
    contractTxId,
    fn,
    set,
    $,
  }) => {
    return (
      <Modal type="right" title="Access Control Rules" close={setAddRules}>
        <Editor
          value={newRules}
          onValueChange={code => setNewRules(code)}
          highlight={code => highlight(code, languages.js)}
          padding={10}
          placeholder="Access Contral Rules"
          style={{
            flex: 1,
            border: "1px solid #E2E8F0",
            borderRadius: "5px",
            fontFamily: '"Fira code", "Fira Mono", monospace',
            fontSize: 12,
          }}
        />
        <Flex
          mt={4}
          sx={{
            borderRadius: "3px",
            cursor: "pointer",
            ":hover": { opacity: 0.75 },
          }}
          p={2}
          justify="center"
          align="center"
          color="white"
          bg="#333"
          height="40px"
          onClick={async () => {
            if (isNil($.loading)) {
              const exRules = !/^\s*$/.test(newRules)
              if (!exRules) {
                alert("Enter rules")
              }
              let val = null
              if (checkJSON(newRules)) return alert("Wrong JSON format")
              set("add_rules", "loading")
              let col_path = compose(
                join(", "),
                map(v => `"${v}"`),
                append(col)
              )(base_path)
              try {
                let query = `${newRules}, ${col_path}`
                const res = JSON.parse(
                  await fn(queryDB)({
                    method: "setRules",
                    query,
                    contractTxId,
                  })
                )
                if (!res.success) {
                  alert("Something went wrong")
                } else {
                  setNewRules(`{"allow write": true}`)
                  setAddRules(false)
                  setRules(
                    await fn(read)({
                      db,
                      m: "getRules",
                      q: [
                        ...(doc_path.length % 2 === 0
                          ? doc_path.slice(0, -1)
                          : doc_path),
                        true,
                      ],
                    })
                  )
                }
              } catch (e) {
                alert("Something went wrong")
              }
              set(null, "loading")
            }
          }}
        >
          {!isNil($.loading) ? (
            <Box as="i" className="fas fa-spin fa-circle-notch" />
          ) : (
            "Add"
          )}
        </Flex>
      </Modal>
    )
  }
)
