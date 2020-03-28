import networks from '@liquality/bitcoin-networks'

import KibaProvider from '@liquality/kiba-provider'
import { Address } from '@liquality/utils'

import { version } from '../package.json'


const blockchain = 'bitcoin'

export default class BitcoinKibaProvider extends KibaProvider {
  constructor (kibaProvider, network, addressType = 'bech32') {
    super(kibaProvider, network)

    this._network = network
    this._addressType = addressType
  }

  async signMessage (message, from) {
    const method = 'SIGN_MESSAGE'
    const params = {
      blockchain,
      message,
      messageType: 'string'
    };

    const { data: signature } = await this.kiba(method, params)

    return signature
  }

  async getAccounts () {
    const method = 'GET_ACCOUNTS'
    const params = {
      blockchain
    }

    const accounts = await this.kiba(method, params)

    return accounts[0]
  }

  async getUnusedAddress () {
    const { address: accountAddress } = await this.getAccounts()

    const method = 'GET_UNUSED_ADDRESS'
    const params = {
      blockchain,
      account: {
        address: accountAddress,
        blockchain
      }
    }

    const { address, publicKey } = await this.kiba(method, params)

    return new Address({
      address,
      publicKey: Buffer.from(publicKey)
    })
  }

  async getUsedAddresses () {
    const { address: accountAddress } = await this.getAccounts()
    
    const method = 'GET_USED_ADDRESSES'
    const params = {
      blockchain,
      account: {
        address: accountAddress,
        blockchain
      }
    }

    const kibaAddresses = await this.kiba(method, params)

    const addresses = []

    for (let i = 0; i < kibaAddresses.length; i++) {
      const kibaAddress = kibaAddresses[i]
      const { address, publicKey } = kibaAddress
      addresses.push(new Address({
        address,
        publicKey: Buffer.from(publicKey.data)
      }))
    }

    return addresses
  }

  // async buildTransaction (to, value, data, from) {
  //   // return this._buildTransaction([{ to, value }])

  //   const method = 'SIGN_TXN'
  //   const params = {
  //     blockchain: 'bitcoin',
  //     amount: {
  //       value: parseFloat(parseInt(value) / 10e8).toString(),
  //       unit: 'bitcoin'
  //     },
  //     to,
  //     network: this._network.name === 'bitcoin' ? 'Mainnet' : 'Testnet3',
  //     coin: 'BTC'
  //   }
  // }

  // async _buildTransaction (outputs) {
  //   const network = this._network

  //   const unusedAddress = await this.getUnusedAddress(true)
  //   const { inputs, change } = await this.getInputsForAmount(outputs)

  //   if (change) {
  //     outputs.push({
  //       to: unusedAddress,
  //       value: change.value
  //     })
  //   }

  //   const txb = new bitcoin.TransactionBuilder(network)

  //   for (const output of outputs) {
  //     const to = output.to.address === undefined ? output.to : addressToString(output.to) // Allow for OP_RETURN
  //     txb.addOutput(to, output.value)
  //   }

  //   const prevOutScriptType = this.getScriptType()

  //   for (let i = 0; i < inputs.length; i++) {
  //     const wallet = await this.getWalletAddress(inputs[i].address)
  //     const keyPair = await this.keyPair(wallet.derivationPath)
  //     const paymentVariant = this.getPaymentVariantFromPublicKey(keyPair.publicKey)

  //     txb.addInput(inputs[i].txid, inputs[i].vout, 0, paymentVariant.output)
  //   }

  //   for (let i = 0; i < inputs.length; i++) {
  //     const wallet = await this.getWalletAddress(inputs[i].address)
  //     const keyPair = await this.keyPair(wallet.derivationPath)
  //     const paymentVariant = this.getPaymentVariantFromPublicKey(keyPair.publicKey)
  //     const needsWitness = this._addressType === 'bech32' || this._addressType === 'p2sh-segwit'

  //     const signParams = { prevOutScriptType, vin: i, keyPair }

  //     if (needsWitness) {
  //       signParams.witnessValue = inputs[i].value
  //     }

  //     if (this._addressType === 'p2sh-segwit') {
  //       signParams.redeemScript = paymentVariant.redeem.output
  //     }

  //     txb.sign(signParams)
  //   }

  //   return txb.build().toHex()
  // }

  // async buildTransaction (to, value, data, from) {
  //   return this._buildTransaction([{ to, value }])
  // }

  // async buildBatchTransaction (transactions) {
  //   return this._buildTransaction(transactions)
  // }

  // async _sendTransaction (transactions) {
  //   const signedTransaction = await this._buildTransaction(transactions)
  //   return this.getMethod('sendRawTransaction')(signedTransaction)
  // }

  // async sendTransaction (to, value, data, from) {
  //   return this._sendTransaction([{ to, value }])
  // }

  // async sendBatchTransaction (transactions) {
  //   return this._sendTransaction(transactions)
  // }

  // async signP2SHTransaction (inputTxHex, tx, address, vout, outputScript, lockTime = 0, segwit = false) {
  //   const wallet = await this.getWalletAddress(address)
  //   const keyPair = await this.keyPair(wallet.derivationPath)

  //   let sigHash
  //   if (segwit) {
  //     sigHash = tx.hashForWitnessV0(0, outputScript, vout.vSat, bitcoin.Transaction.SIGHASH_ALL) // AMOUNT NEEDS TO BE PREVOUT AMOUNT
  //   } else {
  //     sigHash = tx.hashForSignature(0, outputScript, bitcoin.Transaction.SIGHASH_ALL)
  //   }

  //   const sig = bitcoin.script.signature.encode(keyPair.sign(sigHash), bitcoin.Transaction.SIGHASH_ALL)
  //   return sig
  // }

  // // inputs consists of [{ inputTxHex, index, vout, outputScript }]
  // async signBatchP2SHTransaction (inputs, addresses, tx, lockTime = 0, segwit = false) {
  //   let keyPairs = []
  //   for (const address of addresses) {
  //     const wallet = await this.getWalletAddress(address)
  //     const keyPair = await this.keyPair(wallet.derivationPath)
  //     keyPairs.push(keyPair)
  //   }

  //   let sigs = []
  //   for (let i = 0; i < inputs.length; i++) {
  //     const index = inputs[i].txInputIndex ? inputs[i].txInputIndex : inputs[i].index
  //     let sigHash
  //     if (segwit) {
  //       sigHash = tx.hashForWitnessV0(index, inputs[i].outputScript, inputs[i].vout.vSat, bitcoin.Transaction.SIGHASH_ALL) // AMOUNT NEEDS TO BE PREVOUT AMOUNT
  //     } else {
  //       sigHash = tx.hashForSignature(index, inputs[i].outputScript, bitcoin.Transaction.SIGHASH_ALL)
  //     }

  //     const sig = bitcoin.script.signature.encode(keyPairs[i].sign(sigHash), bitcoin.Transaction.SIGHASH_ALL)
  //     sigs.push(sig)
  //   }

  //   return sigs
  // }

  // async getWalletAddress (address) {
  //   let index = 0
  //   let change = false

  //   // A maximum number of addresses to lookup after which it is deemed
  //   // that the wallet does not contain this address
  //   const maxAddresses = 1000
  //   const addressesPerCall = 50

  //   while (index < maxAddresses) {
  //     const addrs = await this.getAddresses(index, addressesPerCall, change)
  //     const addr = addrs.find(addr => addr.equals(address))
  //     if (addr) return addr

  //     index += addressesPerCall
  //     if (index === maxAddresses && change === false) {
  //       index = 0
  //       change = true
  //     }
  //   }

  //   throw new Error('BitcoinJs: Wallet does not contain address')
  // }

  // getScriptType () {
  //   if (this._addressType === 'legacy') return 'p2pkh'
  //   else if (this._addressType === 'p2sh-segwit') return 'p2sh-p2wpkh'
  //   else if (this._addressType === 'bech32') return 'p2wpkh'
  // }

  // getAddressFromPublicKey (publicKey) {
  //   return this.getPaymentVariantFromPublicKey(publicKey).address
  // }

  // getPaymentVariantFromPublicKey (publicKey) {
  //   if (this._addressType === 'legacy') {
  //     return bitcoin.payments.p2pkh({ pubkey: publicKey, network: this._network })
  //   } else if (this._addressType === 'p2sh-segwit') {
  //     return bitcoin.payments.p2sh({
  //       redeem: bitcoin.payments.p2wpkh({ pubkey: publicKey, network: this._network }),
  //       network: this._network })
  //   } else if (this._addressType === 'bech32') {
  //     return bitcoin.payments.p2wpkh({ pubkey: publicKey, network: this._network })
  //   }
  // }

  // async getAddresses (startingIndex = 0, numAddresses = 1, change = false) {
  //   if (numAddresses < 1) { throw new Error('You must return at least one address') }

  //   const node = await this.node()

  //   const addresses = []
  //   const lastIndex = startingIndex + numAddresses
  //   const changeVal = change ? '1' : '0'

  //   for (let currentIndex = startingIndex; currentIndex < lastIndex; currentIndex++) {
  //     const subPath = changeVal + '/' + currentIndex
  //     const path = this._derivationPath + subPath
  //     const publicKey = node.derivePath(path).publicKey
  //     const address = this.getAddressFromPublicKey(publicKey)

  //     addresses.push(new Address({
  //       address,
  //       publicKey,
  //       derivationPath: path,
  //       index: currentIndex
  //     }))
  //   }

  //   return addresses
  // }

  // async _getUsedUnusedAddresses (numAddressPerCall = 100, addressType) {
  //   const usedAddresses = []
  //   const addressCountMap = { change: 0, nonChange: 0 }
  //   const unusedAddressMap = { change: null, nonChange: null }

  //   let addrList
  //   let addressIndex = 0
  //   let changeAddresses = []
  //   let nonChangeAddresses = []

  //   /* eslint-disable no-unmodified-loop-condition */
  //   while (
  //     (addressType === NONCHANGE_OR_CHANGE_ADDRESS && (
  //       addressCountMap.change < ADDRESS_GAP || addressCountMap.nonChange < ADDRESS_GAP)
  //     ) ||
  //     (addressType === NONCHANGE_ADDRESS && addressCountMap.nonChange < ADDRESS_GAP) ||
  //     (addressType === CHANGE_ADDRESS && addressCountMap.change < ADDRESS_GAP)
  //   ) {
  //     /* eslint-enable no-unmodified-loop-condition */
  //     addrList = []

  //     if ((addressType === NONCHANGE_OR_CHANGE_ADDRESS || addressType === CHANGE_ADDRESS) &&
  //          addressCountMap.change < ADDRESS_GAP) {
  //       // Scanning for change addr
  //       changeAddresses = await this.getAddresses(addressIndex, numAddressPerCall, true)
  //       addrList = addrList.concat(changeAddresses)
  //     } else {
  //       changeAddresses = []
  //     }

  //     if ((addressType === NONCHANGE_OR_CHANGE_ADDRESS || addressType === NONCHANGE_ADDRESS) &&
  //          addressCountMap.nonChange < ADDRESS_GAP) {
  //       // Scanning for non change addr
  //       nonChangeAddresses = await this.getAddresses(addressIndex, numAddressPerCall, false)
  //       addrList = addrList.concat(nonChangeAddresses)
  //     }

  //     const transactionCounts = await this.getMethod('getAddressTransactionCounts')(addrList)

  //     for (let address of addrList) {
  //       const isUsed = transactionCounts[address] > 0
  //       const isChangeAddress = changeAddresses.find(a => address.equals(a))
  //       const key = isChangeAddress ? 'change' : 'nonChange'

  //       if (isUsed) {
  //         usedAddresses.push(address)
  //         addressCountMap[key] = 0
  //         unusedAddressMap[key] = null
  //       } else {
  //         addressCountMap[key]++

  //         if (!unusedAddressMap[key]) {
  //           unusedAddressMap[key] = address
  //         }
  //       }
  //     }

  //     addressIndex += numAddressPerCall
  //   }

  //   let firstUnusedAddress
  //   const indexNonChange = unusedAddressMap.nonChange ? unusedAddressMap.nonChange.index : Infinity
  //   const indexChange = unusedAddressMap.change ? unusedAddressMap.change.index : Infinity

  //   if (indexNonChange <= indexChange) firstUnusedAddress = unusedAddressMap.nonChange
  //   else firstUnusedAddress = unusedAddressMap.change

  //   return {
  //     usedAddresses,
  //     unusedAddress: unusedAddressMap,
  //     firstUnusedAddress
  //   }
  // }

  // async getUsedAddresses (numAddressPerCall = 100) {
  //   return this._getUsedUnusedAddresses(numAddressPerCall, NONCHANGE_OR_CHANGE_ADDRESS)
  //     .then(({ usedAddresses }) => usedAddresses)
  // }

  // async getUnusedAddress (change = false, numAddressPerCall = 100) {
  //   const addressType = change ? CHANGE_ADDRESS : NONCHANGE_ADDRESS
  //   const key = change ? 'change' : 'nonChange'
  //   return this._getUsedUnusedAddresses(numAddressPerCall, addressType)
  //     .then(({ unusedAddress }) => unusedAddress[key])
  // }

  // async getInputsForAmount (_targets, numAddressPerCall = 100) {
  //   let addressIndex = 0
  //   let changeAddresses = []
  //   let nonChangeAddresses = []
  //   let addressCountMap = {
  //     change: 0,
  //     nonChange: 0
  //   }

  //   const feePerBytePromise = this.getMethod('getFeePerByte')()
  //   let feePerByte = false

  //   while (addressCountMap.change < ADDRESS_GAP || addressCountMap.nonChange < ADDRESS_GAP) {
  //     let addrList = []

  //     if (addressCountMap.change < ADDRESS_GAP) {
  //       // Scanning for change addr
  //       changeAddresses = await this.getAddresses(addressIndex, numAddressPerCall, true)
  //       addrList = addrList.concat(changeAddresses)
  //     } else {
  //       changeAddresses = []
  //     }

  //     if (addressCountMap.nonChange < ADDRESS_GAP) {
  //       // Scanning for non change addr
  //       nonChangeAddresses = await this.getAddresses(addressIndex, numAddressPerCall, false)
  //       addrList = addrList.concat(nonChangeAddresses)
  //     }

  //     let utxos = await this.getMethod('getUnspentTransactions')(addrList)
  //     utxos = utxos.map(utxo => {
  //       const addr = addrList.find(a => a.equals(utxo.address))
  //       return {
  //         ...utxo,
  //         value: BigNumber(utxo.amount).times(1e8).toNumber(),
  //         derivationPath: addr.derivationPath
  //       }
  //     })

  //     const usedAddresses = []
  //     // const usedAddresses = confirmedAdd.concat(utxosMempool) // TODO: USED ADDRESSES
  //     // utxos = utxos // TODO: Filter out utxos in the mempool that have already been used? Does the node already do this?
  //     //   .filter(utxo => utxosMempool.filter(mempoolUtxo => utxo.txid === mempoolUtxo.prevtxid).length === 0)

  //     if (feePerByte === false) feePerByte = await feePerBytePromise
  //     const minRelayFee = await this.getMethod('getMinRelayFee')()

  //     const targets = _targets.map((target, i) => ({ id: 'main', value: target.value }))

  //     const { inputs, outputs, fee } = selectCoins(utxos, targets, Math.ceil(feePerByte), minRelayFee)

  //     if (inputs && outputs) {
  //       let change = outputs.find(output => output.id !== 'main')

  //       if (change && change.length) {
  //         change = change[0].value
  //       }

  //       return {
  //         inputs,
  //         change,
  //         fee
  //       }
  //     }

  //     for (let address of addrList) {
  //       const isUsed = usedAddresses.find(a => address.equals(a))
  //       const isChangeAddress = changeAddresses.find(a => address.equals(a))
  //       const key = isChangeAddress ? 'change' : 'nonChange'

  //       if (isUsed) {
  //         addressCountMap[key] = 0
  //       } else {
  //         addressCountMap[key]++
  //       }
  //     }

  //     addressIndex += numAddressPerCall
  //   }

  //   throw new Error('Not enough balance')
  // }
}

BitcoinKibaProvider.version = version