import { useState } from "react"
import { Box, Flex, Input, Select, Textarea } from "@chakra-ui/react"
import { isNil, without, o, uniq, append, map } from "ramda"
import { inject } from "roidjs"
import { addRelayerJob } from "../../lib/weavedb"

export default inject(
  ["loading", "temp_current"],
  ({ setRelayers, contractTxId, db, setAddRelayer, fn, set, $ }) => {
    const [newJobName, setNewJobName] = useState("")
    const [newRelayers, setNewRelayers] = useState([])
    const [newRelayer, setNewRelayer] = useState("")
    const [newMultisigType, setNewMultisigType] = useState("none")
    const [newMultisig, setNewMultisig] = useState(2)
    const [newJobSchema, setNewJobSchema] = useState("")
    const [newSigner, setNewSigner] = useState("")
    const [newSigners, setNewSigners] = useState([])

    return (
      <Flex
        w="100%"
        h="100%"
        position="fixed"
        sx={{ top: 0, left: 0, zIndex: 100, cursor: "pointer" }}
        bg="rgba(0,0,0,0.5)"
        onClick={() => setAddRelayer(false)}
        justify="center"
        align="center"
      >
        <Box
          bg="white"
          width="500px"
          p={3}
          sx={{ borderRadius: "5px", cursor: "default" }}
          onClick={e => e.stopPropagation()}
        >
          <Flex>
            <Input
              value={newJobName}
              placeholder="Job Name"
              onChange={e => setNewJobName(e.target.value)}
              sx={{
                borderRadius: "3px",
              }}
            />
          </Flex>
          <Flex mt={3} mb={1} fontSize="10px">
            Relayers
          </Flex>
          {map(v => {
            return (
              <Flex mb={3} px={2} align="center" fontSize="12px">
                <Flex flex={1}>{v}</Flex>
                <Flex>
                  <Box
                    onClick={async () => {
                      setNewRelayers(without(v, newRelayers))
                    }}
                    className="fas fa-trash"
                    sx={{
                      cursor: "pointer",
                      ":hover": { opacity: 0.75 },
                    }}
                  />
                </Flex>
              </Flex>
            )
          })(newRelayers)}
          <Flex align="center">
            <Input
              flex={1}
              value={newRelayer}
              onChange={e => {
                setNewRelayer(e.target.value)
              }}
              sx={{ borderRadius: "3px 0 0 3px" }}
            />
            <Flex
              fontSize="12px"
              align="center"
              height="40px"
              bg="#333"
              color="white"
              justify="center"
              py={1}
              px={2}
              w="100px"
              onClick={async () => {
                if (!/^\s*.$/.test(newRelayer)) {
                  setNewRelayers(o(uniq, append(newRelayer))(newRelayers))
                  setNewRelayer("")
                }
              }}
              sx={{
                borderRadius: "0 3px 3px 0",
                cursor: "pointer",
                ":hover": { opacity: 0.75 },
              }}
            >
              {!isNil($.loading) ? (
                <Box as="i" className="fas fa-spin fa-circle-notch" />
              ) : (
                "Add Relayer"
              )}
            </Flex>
          </Flex>
          <Flex mt={4}>
            <Select
              value={newMultisigType}
              onChange={e => setNewMultisigType(e.target.value)}
            >
              {map(v => <option value={v}>{v}</option>)([
                "none",
                "number",
                "percent",
              ])}
            </Select>
            <Input
              ml={2}
              value={newMultisig}
              placeholder="Multisig"
              onChange={e => {
                if (!Number.isNaN(e.target.value * 1)) {
                  setNewMultisig(e.target.value)
                }
              }}
              sx={{
                borderRadius: "3px",
              }}
            />
          </Flex>
          <Flex mt={3} mb={1} fontSize="10px">
            Signers
          </Flex>
          {map(v => {
            return (
              <Flex mb={3} px={2} align="center" fontSize="12px">
                <Flex flex={1}>{v}</Flex>
                <Flex>
                  <Box
                    onClick={async () => {
                      setNewSigners(without(v, newSigners))
                    }}
                    className="fas fa-trash"
                    sx={{
                      cursor: "pointer",
                      ":hover": { opacity: 0.75 },
                    }}
                  />
                </Flex>
              </Flex>
            )
          })(newSigners)}
          <Flex align="center">
            <Input
              flex={1}
              value={newSigner}
              onChange={e => {
                setNewSigner(e.target.value)
              }}
              sx={{ borderRadius: "3px 0 0 3px" }}
            />
            <Flex
              fontSize="12px"
              align="center"
              height="40px"
              bg="#333"
              color="white"
              justify="center"
              py={1}
              px={2}
              w="100px"
              onClick={async () => {
                if (!/^\s*.$/.test(newSigner)) {
                  setNewSigners(o(uniq, append(newSigner))(newSigners))
                  setNewSigner("")
                }
              }}
              sx={{
                borderRadius: "0 3px 3px 0",
                cursor: "pointer",
                ":hover": { opacity: 0.75 },
              }}
            >
              {!isNil($.loading) ? (
                <Box as="i" className="fas fa-spin fa-circle-notch" />
              ) : (
                "Add Signer"
              )}
            </Flex>
          </Flex>
          <Textarea
            mt={3}
            value={newJobSchema}
            placeholder="Schema for Extra Data"
            onChange={e => setNewJobSchema(e.target.value)}
            sx={{
              borderRadius: "3px",
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
                try {
                  if (/^\s.*$/.test(newJobName)) {
                    alert("Enter job name")
                    return
                  }
                  let _schema = null
                  if (!/^\s.*$/.test(newJobSchema)) {
                    try {
                      _schema = JSON.parse(newJobSchema)
                    } catch (e) {
                      alert("schema is not a valid JSON format")
                      return
                    }
                  }
                  set("add_relayer", "loading")
                  const res = JSON.parse(
                    await fn(addRelayerJob)({
                      relayers: newRelayers,
                      signers: newSigners,
                      name: newJobName,
                      multisig: newMultisig,
                      multisig_type: newMultisigType,
                      schema: _schema,
                      contractTxId,
                    })
                  )
                  if (!res.success) {
                    alert("Something went wrong")
                  } else {
                    setAddRelayer(false)
                    setRelayers(await db.listRelayerJobs(true))
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
        </Box>
      </Flex>
    )
  }
)
