const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs")
const { expect } = require("chai")

describe("NFT", function () {
  async function deploy() {
    const [owner, otherAccount] = await ethers.getSigners()
    const NFT = await ethers.getContractFactory("NFT")
    const nft = await NFT.deploy()
    return { nft, owner }
  }
  it("Should mint", async function () {
    const { nft, owner } = await deploy()
    const tx = await nft.mint()
    await tx.wait()
    expect(await nft.ownerOf(0)).to.equal(owner.address)
  })
})
