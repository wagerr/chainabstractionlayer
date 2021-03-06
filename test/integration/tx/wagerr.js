/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import * as wagerr from '@wagerr-wdk/wagerrjs-lib'
import { hash160 } from '../../../packages/crypto/lib'
import * as WagerrUtils from '../../../packages/wagerr-utils/lib'
import { addressToString } from '../../../packages/utils/lib'
import { chains, importWagerrAddresses, getNewAddress, getRandomWagerrAddress, mineBlock, fundWallet, describeExternal } from '../common'
import { testTransaction } from './common'
import config from '../config'

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

chai.use(chaiAsPromised)
chai.use(require('chai-bignumber')())

function testBatchTransaction (chain) {
  it('Sent value to 2 addresses', async () => {
    const addr1 = await getRandomWagerrAddress(chain)
    const addr2 = await getRandomWagerrAddress(chain)

    const value = config[chain.name].value

    const bal1Before = await chain.client.chain.getBalance(addr1)
    const bal2Before = await chain.client.chain.getBalance(addr2)
    await chain.client.chain.sendBatchTransaction([{ to: addr1, value }, { to: addr2, value }])
    await mineBlock(chain)
    const bal1After = await chain.client.chain.getBalance(addr1)
    const bal2After = await chain.client.chain.getBalance(addr2)

    expect(bal1Before.plus(value).toString()).to.equal(bal1After.toString())
    expect(bal2Before.plus(value).toString()).to.equal(bal2After.toString())
  })
}

function testSweepTransaction (chain) {
  it('should sweep wallet balance', async () => {
    await fundWallet(chains.wagerrWithJs)

    const nonChangeAddresses = await chain.client.wallet.getAddresses(0, 20, false)
    const changeAddresses = await chain.client.wallet.getAddresses(0, 20, true)
    const addrList = nonChangeAddresses.concat(changeAddresses)

    const bal = parseInt(await chain.client.chain.getBalance(addrList))

    let sendTxChain
    if (bal === 0) {
      sendTxChain = chains.wagerrWithNode
    } else {
      sendTxChain = chain
    }

    await sendTxChain.client.chain.sendTransaction(changeAddresses[1], 200000000)
    await sendTxChain.client.chain.sendTransaction(changeAddresses[2], 200000000)
    await sendTxChain.client.chain.sendTransaction(changeAddresses[3], 200000000)
    await sendTxChain.client.chain.sendTransaction(changeAddresses[4], 200000000)
    await sendTxChain.client.chain.sendTransaction(changeAddresses[5], 200000000)
    await sendTxChain.client.chain.sendTransaction(changeAddresses[6], 200000000)

    const addr1 = await getRandomWagerrAddress(chain)

    await chain.client.getMethod('sendSweepTransaction')(addr1)

    const balanceAfter = await chain.client.chain.getBalance(changeAddresses)
    expect(balanceAfter.toString()).to.equal('0')
  })
}

function testSignPSBT (chain) {
  it('should redeem one P2SH', async () => {
    const network = chain.network
    const value = config[chain.name].value
    const OPS = wagerr.script.OPS

    const { address: unusedAddressOne } = await getNewAddress(chain)
    await chain.client.chain.sendTransaction(unusedAddressOne, value)
    await mineBlock(chain)

    const { address: unusedAddressTwo } = await getNewAddress(chain)

    const newAddresses = [ unusedAddressOne ]

    let addresses = []
    for (const newAddress of newAddresses) {
      const address = await chain.client.getMethod('getWalletAddress')(newAddress)
      addresses.push(address)
    }

    const multisigOutput = wagerr.script.compile([
      OPS.OP_DUP,
      OPS.OP_HASH160,
      Buffer.from(hash160(addresses[0].publicKey), 'hex'),
      OPS.OP_EQUALVERIFY,
      OPS.OP_CHECKSIG
    ])

    const paymentVariant = wagerr.payments.p2wsh({ redeem: { output: multisigOutput, network }, network })

    const address = paymentVariant.address

    const initiationTx = await chain.client.chain.sendTransaction(address, value)

    await mineBlock(chain)

    const multiOne = {}

    for (const voutIndex in initiationTx._raw.vout) {
      const vout = initiationTx._raw.vout[voutIndex]
      const paymentVariantEntryOne = (paymentVariant.output.toString('hex') === vout.scriptPubKey.hex)
      if (paymentVariantEntryOne) multiOne.multiVout = vout
    }

    const psbt = new wagerr.Psbt({ network })
    const txfee = WagerrUtils.calculateFee(3, 3, 9)

    const input = {
      hash: initiationTx.hash,
      index: multiOne.multiVout.n,
      sequence: 0,
      witnessUtxo: {
        script: paymentVariant.output,
        value
      },
      witnessScript: paymentVariant.redeem.output
    }

    const output = {
      address: addressToString(unusedAddressTwo),
      value: value - txfee
    }

    psbt.addInput(input)
    psbt.addOutput(output)

    const signedPSBTHex = await chain.client.getMethod('signPSBT')(psbt.toBase64(), 0, unusedAddressOne)
    const signedPSBT = wagerr.Psbt.fromBase64(signedPSBTHex, { network })
    signedPSBT.finalizeInput(0)

    const hex = signedPSBT.extractTransaction().toHex()

    const claimTxHash = await chain.client.getMethod('sendRawTransaction')(hex)

    await mineBlock(chain)

    const claimTxRaw = await chain.client.getMethod('getRawTransactionByHash')(claimTxHash)
    const claimTx = await chain.client.getMethod('decodeRawTransaction')(claimTxRaw)

    const claimVouts = claimTx._raw.vout
    const claimVins = claimTx._raw.vin

    expect(claimVins.length).to.equal(1)
    expect(claimVouts.length).to.equal(1)
  })
}

function testSignBatchP2SHTransaction (chain) {
  it('Should redeem two P2SH\'s', async () => {
    const network = chain.network
    const value = config[chain.name].value
    const OPS = wagerr.script.OPS

    const { address: unusedAddressOne } = await getNewAddress(chain)
    await chain.client.chain.sendTransaction(unusedAddressOne, value)
    await mineBlock(chain)

    const { address: unusedAddressTwo } = await getNewAddress(chain)

    const newAddresses = [ unusedAddressOne, unusedAddressTwo ]

    let addresses = []
    for (const newAddress of newAddresses) {
      const address = await chain.client.getMethod('getWalletAddress')(newAddress)
      addresses.push(address)
    }

    const multisigOutputOne = wagerr.script.compile([
      OPS.OP_2,
      Buffer.from(addresses[0].publicKey, 'hex'),
      Buffer.from(addresses[1].publicKey, 'hex'),
      OPS.OP_2,
      OPS.OP_CHECKMULTISIG
    ])

    const multisigOutputTwo = wagerr.script.compile([
      OPS.OP_2,
      Buffer.from(addresses[1].publicKey, 'hex'),
      Buffer.from(addresses[0].publicKey, 'hex'),
      OPS.OP_2,
      OPS.OP_CHECKMULTISIG
    ])

    const paymentVariantOne = wagerr.payments.p2wsh({ redeem: { output: multisigOutputOne, network }, network })
    const paymentVariantTwo = wagerr.payments.p2wsh({ redeem: { output: multisigOutputTwo, network }, network })

    const addressOne = paymentVariantOne.address
    const addressTwo = paymentVariantTwo.address

    const initiationTx = await chain.client.chain.sendBatchTransaction([{ to: addressOne, value }, { to: addressTwo, value }])
    await mineBlock(chain)

    const multiOne = {}
    const multiTwo = {}

    for (const voutIndex in initiationTx._raw.vout) {
      const vout = initiationTx._raw.vout[voutIndex]
      const paymentVariantEntryOne = (paymentVariantOne.output.toString('hex') === vout.scriptPubKey.hex)
      const paymentVariantEntryTwo = (paymentVariantTwo.output.toString('hex') === vout.scriptPubKey.hex)
      if (paymentVariantEntryOne) multiOne.multiVout = vout
      if (paymentVariantEntryTwo) multiTwo.multiVout = vout
    }

    const txb = new wagerr.TransactionBuilder(network)
    const txfee = WagerrUtils.calculateFee(3, 3, 9)

    multiOne.multiVout.vSat = value
    multiTwo.multiVout.vSat = value

    txb.addInput(initiationTx.hash, multiOne.multiVout.n, 0, paymentVariantOne.output)
    txb.addInput(initiationTx.hash, multiTwo.multiVout.n, 0, paymentVariantTwo.output)
    txb.addOutput(addressToString(unusedAddressTwo), (value * 2) - txfee)

    const tx = txb.buildIncomplete()

    const signaturesOne = await chain.client.getMethod('signBatchP2SHTransaction')(
      [
        { inputTxHex: initiationTx._raw.hex, index: 0, vout: multiOne.multiVout, outputScript: paymentVariantOne.redeem.output },
        { inputTxHex: initiationTx._raw.hex, index: 1, vout: multiTwo.multiVout, outputScript: paymentVariantTwo.redeem.output }
      ],
      [ addresses[0].address, addresses[0].address ],
      tx,
      0,
      true
    )

    const signaturesTwo = await chain.client.getMethod('signBatchP2SHTransaction')(
      [
        { inputTxHex: initiationTx._raw.hex, index: 0, vout: multiOne.multiVout, outputScript: paymentVariantOne.redeem.output },
        { inputTxHex: initiationTx._raw.hex, index: 1, vout: multiTwo.multiVout, outputScript: paymentVariantTwo.redeem.output }
      ],
      [ addresses[1].address, addresses[1].address ],
      tx,
      0,
      true
    )

    const multiOneInput = wagerr.script.compile([
      OPS.OP_0,
      signaturesOne[0],
      signaturesTwo[0]
    ])

    const multiTwoInput = wagerr.script.compile([
      OPS.OP_0,
      signaturesTwo[1],
      signaturesOne[1]
    ])

    multiOne.paymentParams = { redeem: { output: multisigOutputOne, input: multiOneInput, network }, network }
    multiTwo.paymentParams = { redeem: { output: multisigOutputTwo, input: multiTwoInput, network }, network }

    multiOne.paymentWithInput = wagerr.payments.p2wsh(multiOne.paymentParams)
    multiTwo.paymentWithInput = wagerr.payments.p2wsh(multiTwo.paymentParams)

    tx.setWitness(0, multiOne.paymentWithInput.witness)
    tx.setWitness(1, multiTwo.paymentWithInput.witness)

    const claimTxHash = await chain.client.getMethod('sendRawTransaction')(tx.toHex())

    await mineBlock(chain)

    const claimTxRaw = await chain.client.getMethod('getRawTransactionByHash')(claimTxHash)
    const claimTx = await chain.client.getMethod('decodeRawTransaction')(claimTxRaw)

    const claimVouts = claimTx._raw.vout
    const claimVins = claimTx._raw.vin

    expect(claimVins.length).to.equal(2)
    expect(claimVouts.length).to.equal(1)
  })
}

describe('Transactions', function () {
  this.timeout(config.timeout)

  describeExternal('Wagerr - Ledger', () => {
    before(async function () {
      await importWagerrAddresses(chains.wagerrWithLedger)
      await fundWallet(chains.wagerrWithLedger)
    })
    testTransaction(chains.wagerrWithLedger)
    testBatchTransaction(chains.wagerrWithLedger)
    testSignPSBT(chains.wagerrWithLedger)
    testSignBatchP2SHTransaction(chains.wagerrWithLedger)
  })

  describe('Wagerr - Node', () => {
    testTransaction(chains.wagerrWithNode)
    testBatchTransaction(chains.wagerrWithNode)
    testSignPSBT(chains.wagerrWithNode)
    testSignBatchP2SHTransaction(chains.wagerrWithNode)
    testSignBatchP2SHTransaction(chains.wagerrWithNode)
  })

  describe('Wagerr - Js', () => {
    before(async function () {
      await importWagerrAddresses(chains.wagerrWithJs)
      await fundWallet(chains.wagerrWithJs)
    })
    testTransaction(chains.wagerrWithJs)
    testBatchTransaction(chains.wagerrWithJs)
    testSignPSBT(chains.wagerrWithJs)
    testSignBatchP2SHTransaction(chains.wagerrWithJs)
    testSignBatchP2SHTransaction(chains.wagerrWithJs)
    testSweepTransaction(chains.wagerrWithJs)
  })
})
