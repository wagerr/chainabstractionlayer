/* eslint-env mocha */
import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import MetaMaskConnector from 'node-metamask'
import KibaConnector from 'node-kiba'
import { Client, providers, crypto, errors } from '../../packages/bundle/lib'
import { sleep } from '../../packages/utils'
import { findLast } from 'lodash'
import { generateMnemonic } from 'bip39'
import config from './config'
import testnetConfig from './testnetConfig'
import BigNumber from 'bignumber.js'

chai.use(chaiAsPromised)

const CONSTANTS = {
  BITCOIN_FEE_PER_BYTE: 3,
  BITCOIN_ADDRESS_DEFAULT_BALANCE: 50 * 1e8,
  ETHEREUM_ADDRESS_DEFAULT_BALANCE: 10 * 1e18,
  ETHEREUM_NON_EXISTING_CONTRACT: '0000000000000000000000000000000000000000',
  GWEI: 1e9
}

console.warn = () => {} // Silence warnings

const metaMaskConnector = new MetaMaskConnector({ port: config.ethereum.metaMaskConnector.port })
const kibaConnector = new KibaConnector({ port: config.wagerr.kibaConnector.port })

const wagerrNetworks = providers.wagerr.networks
const wagerrNetwork = wagerrNetworks[config.wagerr.network]

function mockedWagerrRpcProvider () {
  const wagerrRpcProvider = new providers.wagerr.WagerrRpcProvider(config.wagerr.rpc.host, config.wagerr.rpc.username, config.wagerr.rpc.password)
  // Mock Fee Per Byte to prevent from changing
  wagerrRpcProvider.getFeePerByte = async () => CONSTANTS.BITCOIN_FEE_PER_BYTE
  return wagerrRpcProvider
}

const wagerrWithLedger = new Client()
wagerrWithLedger.addProvider(mockedWagerrRpcProvider())
wagerrWithLedger.addProvider(new providers.wagerr.WagerrLedgerProvider(wagerrNetwork, 'bech32'))
wagerrWithLedger.addProvider(new providers.wagerr.WagerrSwapProvider(wagerrNetwork, 'p2wsh'))

const wagerrWithNode = new Client()
wagerrWithNode.addProvider(mockedWagerrRpcProvider())
wagerrWithNode.addProvider(new providers.wagerr.WagerrNodeWalletProvider(wagerrNetwork, config.wagerr.rpc.host, config.wagerr.rpc.username, config.wagerr.rpc.password, 'bech32'))
wagerrWithNode.addProvider(new providers.wagerr.WagerrSwapProvider(wagerrNetwork, 'p2wsh'))

const wagerrWithJs = new Client()
wagerrWithJs.addProvider(mockedWagerrRpcProvider())
wagerrWithJs.addProvider(new providers.wagerr.WagerrJsWalletProvider(wagerrNetwork, generateMnemonic(256), 'bech32'))
wagerrWithJs.addProvider(new providers.wagerr.WagerrSwapProvider(wagerrNetwork, 'p2wsh'))

// To run wagerrWithKiba tests create a testnetConfig.js with testnetHost, testnetUsername, testnetConfig, testnetApi, testnetNetwork
const wagerrWithKiba = new Client()
wagerrWithKiba.addProvider(new providers.wagerr.WagerrRpcProvider(testnetConfig.wagerr.rpc.testnetHost, testnetConfig.wagerr.rpc.testnetUsername, testnetConfig.wagerr.rpc.testnetPassword))
wagerrWithKiba.addProvider(new providers.wagerr.WagerrEsploraApiProvider(testnetConfig.wagerr.rpc.testnetApi))
wagerrWithKiba.addProvider(new providers.wagerr.WagerrKibaProvider(kibaConnector.getProvider(), wagerrNetworks[testnetConfig.wagerr.testnetNetwork]))

const wagerrWithEsplora = new Client()
wagerrWithEsplora.addProvider(new providers.wagerr.WagerrEsploraApiProvider('https://blockstream.info/testnet/api'))
wagerrWithEsplora.addProvider(new providers.wagerr.WagerrJsWalletProvider(wagerrNetworks.wagerr_testnet, generateMnemonic(256), 'bech32'))

const ethereumNetworks = providers.ethereum.networks
const ethereumNetwork = {
  ...ethereumNetworks[config.ethereum.network],
  name: 'mainnet',
  chainId: 1337, // Default geth dev mode - * Needs to be <= 255 for ledger *
  networkId: 1337
}

const ethereumWithMetaMask = new Client()
ethereumWithMetaMask.addProvider(new providers.ethereum.EthereumRpcProvider(config.ethereum.rpc.host))
ethereumWithMetaMask.addProvider(new providers.ethereum.EthereumMetaMaskProvider(metaMaskConnector.getProvider(), ethereumNetwork))
ethereumWithMetaMask.addProvider(new providers.ethereum.EthereumSwapProvider())

const ethereumWithNode = new Client()
ethereumWithNode.addProvider(new providers.ethereum.EthereumRpcProvider(config.ethereum.rpc.host))
ethereumWithNode.addProvider(new providers.ethereum.EthereumSwapProvider())

const ethereumWithLedger = new Client()
ethereumWithLedger.addProvider(new providers.ethereum.EthereumRpcProvider(config.ethereum.rpc.host))
ethereumWithLedger.addProvider(new providers.ethereum.EthereumLedgerProvider(ethereumNetwork))
ethereumWithLedger.addProvider(new providers.ethereum.EthereumSwapProvider())

const ethereumWithJs = new Client()
ethereumWithJs.addProvider(new providers.ethereum.EthereumRpcProvider(config.ethereum.rpc.host))
ethereumWithJs.addProvider(new providers.ethereum.EthereumJsWalletProvider(ethereumNetwork, generateMnemonic(256)))
ethereumWithJs.addProvider(new providers.ethereum.EthereumSwapProvider())

const erc20WithMetaMask = new Client()
erc20WithMetaMask.addProvider(new providers.ethereum.EthereumRpcProvider(config.ethereum.rpc.host))
erc20WithMetaMask.addProvider(new providers.ethereum.EthereumMetaMaskProvider(metaMaskConnector.getProvider(), ethereumNetwork))
erc20WithMetaMask.addProvider(new providers.ethereum.EthereumErc20Provider(CONSTANTS.ETHEREUM_NON_EXISTING_CONTRACT))
erc20WithMetaMask.addProvider(new providers.ethereum.EthereumErc20SwapProvider())

const erc20WithNode = new Client()
erc20WithNode.addProvider(new providers.ethereum.EthereumRpcProvider(config.ethereum.rpc.host))
erc20WithNode.addProvider(new providers.ethereum.EthereumErc20Provider(CONSTANTS.ETHEREUM_NON_EXISTING_CONTRACT))
erc20WithNode.addProvider(new providers.ethereum.EthereumErc20SwapProvider())

const erc20WithLedger = new Client()
erc20WithLedger.addProvider(new providers.ethereum.EthereumRpcProvider(config.ethereum.rpc.host))
erc20WithLedger.addProvider(new providers.ethereum.EthereumLedgerProvider(ethereumNetwork))
erc20WithLedger.addProvider(new providers.ethereum.EthereumErc20Provider(CONSTANTS.ETHEREUM_NON_EXISTING_CONTRACT))
erc20WithLedger.addProvider(new providers.ethereum.EthereumErc20SwapProvider())

const erc20WithJs = new Client()
erc20WithJs.addProvider(new providers.ethereum.EthereumRpcProvider(config.ethereum.rpc.host))
erc20WithJs.addProvider(new providers.ethereum.EthereumJsWalletProvider(ethereumNetwork, generateMnemonic(256)))
erc20WithJs.addProvider(new providers.ethereum.EthereumErc20Provider(CONSTANTS.ETHEREUM_NON_EXISTING_CONTRACT))
erc20WithJs.addProvider(new providers.ethereum.EthereumErc20SwapProvider())

const chains = {
  wagerrWithLedger: { id: 'Wagerr Ledger', name: 'wagerr', client: wagerrWithLedger, network: wagerrNetwork },
  wagerrWithNode: { id: 'Wagerr Node', name: 'wagerr', client: wagerrWithNode, network: wagerrNetwork, segwitFeeImplemented: true },
  wagerrWithJs: { id: 'Wagerr Js', name: 'wagerr', client: wagerrWithJs, network: wagerrNetwork },
  wagerrWithKiba: { id: 'Wagerr Kiba', name: 'wagerr', client: wagerrWithKiba, network: wagerrNetworks['wagerr_testnet'] },
  wagerrWithEsplora: { id: 'Wagerr Esplora', name: 'wagerr', client: wagerrWithEsplora },
  ethereumWithMetaMask: { id: 'Ethereum MetaMask', name: 'ethereum', client: ethereumWithMetaMask },
  ethereumWithNode: { id: 'Ethereum Node', name: 'ethereum', client: ethereumWithNode },
  ethereumWithLedger: { id: 'Ethereum Ledger', name: 'ethereum', client: ethereumWithLedger },
  ethereumWithJs: { id: 'Ethereum Js', name: 'ethereum', client: ethereumWithJs },
  erc20WithMetaMask: { id: 'ERC20 MetaMask', name: 'ethereum', client: erc20WithMetaMask },
  erc20WithNode: { id: 'ERC20 Node', name: 'ethereum', client: erc20WithNode },
  erc20WithLedger: { id: 'ERC20 Ledger', name: 'ethereum', client: erc20WithLedger },
  erc20WithJs: { id: 'ERC20 Js', name: 'ethereum', client: erc20WithJs }
}

async function getSwapParams (chain) {
  const recipientAddress = (await getNewAddress(chain)).address
  const refundAddress = (await getNewAddress(chain)).address
  const expiration = parseInt(Date.now() / 1000) + parseInt(Math.random() * 1000000)
  const value = config[chain.name].value

  return {
    recipientAddress,
    refundAddress,
    expiration,
    value
  }
}

async function importWagerrAddresses (chain) {
  return chain.client.getMethod('importAddresses')()
}

async function fundAddress (chain, address) {
  if (chain.name === 'wagerr') {
    await chains.wagerrWithNode.client.chain.sendTransaction(address, CONSTANTS.BITCOIN_ADDRESS_DEFAULT_BALANCE)
  } else if (chain.name === 'ethereum') {
    await chains.ethereumWithNode.client.chain.sendTransaction(address, CONSTANTS.ETHEREUM_ADDRESS_DEFAULT_BALANCE)
  }
  await mineBlock(chain)
}

async function fundWallet (chain) {
  if (chain.funded) return

  const address = await chain.client.wallet.getUnusedAddress()
  await fundAddress(chain, address)
  chain.funded = true
}

async function getNewAddress (chain) {
  if (chain.name === 'ethereum') {
    return getRandomEthereumAddress()
  } else {
    return chain.client.wallet.getUnusedAddress()
  }
}

async function getRandomAddress (chain) {
  if (chain.name === 'ethereum') {
    return getRandomEthereumAddress()
  } else {
    return getRandomWagerrAddress(chain)
  }
}

function getRandomEthereumAddress () {
  const randomString = parseInt(Math.random() * 1000000000000).toString()
  const randomHash = crypto.sha256(randomString)
  const address = randomHash.substr(0, 40)
  return { address }
}

async function getRandomWagerrAddress (chain) {
  return findProvider(chain.client, providers.wagerr.WagerrRpcProvider).jsonrpc('getnewaddress')
}

async function mineBlock (chain) {
  try {
    await chain.client.chain.generateBlock(1)
  } catch (e) {
    if (!(e instanceof errors.UnimplementedMethodError)) throw e
    console.log('Skipped mining block - not implement for chain - probably client automines')
  }
}

async function mineUntilTimestamp (chain, timestamp) {
  const maxNumBlocks = 100
  for (let i = 0; i < maxNumBlocks; i++) {
    const block = await chain.client.chain.getBlockByNumber(await chain.client.chain.getBlockHeight())
    if (i === 0) console.log('\x1b[2m', `Mining until chain timestamp: ${timestamp}. Now: ${block.timestamp}. Remaining: ${timestamp - block.timestamp}s`, '\x1b[0m')
    if (block.timestamp > timestamp) break
    if (chain.name === 'ethereum') { // Send random tx to cause Geth to mime block
      await chains.ethereumWithNode.client.chain.sendTransaction((await getNewAddress(chain)).address, 10000)
    }
    await mineBlock(chain)
    await sleep(1000)
  }
}

async function initiateAndVerify (chain, secretHash, swapParams, fee) {
  if (process.env.RUN_EXTERNAL) console.log('\x1b[33m', `Initiating ${chain.id}: Watch prompt on wallet`, '\x1b[0m')
  const isERC20 = chain.id.includes('ERC20')
  const initiationParams = [swapParams.value, swapParams.recipientAddress, swapParams.refundAddress, secretHash, swapParams.expiration]
  const func = async () => {
    const initiationTx = await chain.client.swap.initiateSwap(...initiationParams, fee)
    await mineBlock(chain)
    const currentBlock = await chain.client.chain.getBlockHeight()
    const blockNumber = isERC20
      ? currentBlock - 1 // ERC20 swaps involve 2 transactions - ganache auto mines for each
      : currentBlock

    const foundInitiationTx = await chain.client.swap.findInitiateSwapTransaction(...initiationParams, blockNumber)
    expect(foundInitiationTx.hash).to.equal(initiationTx.hash)
    const isVerified = await chain.client.swap.verifyInitiateSwapTransaction(initiationTx.hash, ...initiationParams)
    expect(isVerified).to.equal(true)
    return initiationTx.hash
  }

  if (isERC20) {
    const ethereumRpcProvider = findProvider(chain.client, providers.ethereum.EthereumRpcProvider)
    const ethereumJsProvider = findProvider(chain.client, providers.ethereum.EthereumJsWalletProvider)
    const ethereumLedgerProvider = findProvider(chain.client, providers.ethereum.EthereumLedgerProvider)
    return withInternalSendMineHook(chain, ethereumJsProvider || ethereumLedgerProvider || ethereumRpcProvider, func)
  } else {
    return func()
  }
}

async function claimAndVerify (chain, initiationTxId, secret, swapParams, fee) {
  if (process.env.RUN_EXTERNAL) console.log('\x1b[33m', `Claiming ${chain.id}: Watch prompt on wallet`, '\x1b[0m')
  const secretHash = crypto.sha256(secret)
  await chain.client.swap.claimSwap(initiationTxId, swapParams.recipientAddress, swapParams.refundAddress, secret, swapParams.expiration, fee)
  await mineBlock(chain)
  const currentBlock = await chain.client.chain.getBlockHeight()
  const claimTx = await chain.client.swap.findClaimSwapTransaction(initiationTxId, swapParams.recipientAddress, swapParams.refundAddress, secretHash, swapParams.expiration, currentBlock)
  return claimTx
}

async function refundAndVerify (chain, initiationTxId, secretHash, swapParams, fee) {
  if (process.env.RUN_EXTERNAL) console.log('\x1b[33m', `Refunding ${chain.id}: Watch prompt on wallet`, '\x1b[0m')
  const refundTx = await chain.client.swap.refundSwap(initiationTxId, swapParams.recipientAddress, swapParams.refundAddress, secretHash, swapParams.expiration, fee)
  await mineBlock(chain)
  const currentBlock = await chain.client.chain.getBlockHeight()
  const foundRefundTx = await chain.client.swap.findRefundSwapTransaction(initiationTxId, swapParams.recipientAddress, swapParams.refundAddress, secretHash, swapParams.expiration, currentBlock)
  expect(foundRefundTx.hash).to.equal(refundTx.hash)
  return foundRefundTx
}

async function expectBalance (chain, address, func, comparison) {
  const balanceBefore = await chain.client.chain.getBalance([address])
  await func()
  if (chain.name === 'wagerr') await sleep(1000) // Node seems to need a little bit of time to process utxos
  const balanceAfter = await chain.client.chain.getBalance([address])
  comparison(balanceBefore, balanceAfter)
}

async function getWagerrTransactionFee (chain, tx) {
  const inputs = tx._raw.vin.map((vin) => ({ txid: vin.txid, vout: vin.vout }))
  const inputTransactions = await Promise.all(
    inputs.map(input => chain.client.chain.getTransactionByHash(input.txid))
  )
  const inputValues = inputTransactions.map((inputTx, index) => {
    const vout = inputs[index].vout
    const output = inputTx._raw.vout[vout]
    return output.value * 1e8
  })
  const inputValue = inputValues.reduce((a, b) => a.plus(BigNumber(b)), BigNumber(0))

  const outputValue = tx._raw.vout.reduce((a, b) => a.plus(BigNumber(b.value).times(BigNumber(1e8))), BigNumber(0))

  const feeValue = inputValue.minus(outputValue)

  return feeValue.toNumber()
}

async function expectFee (chain, txHash, expectedFeePerByte, swapInitiate = false, swapRedeem = false) {
  if (chain.name === 'wagerr') {
    return swapRedeem // It's dumb because it does legacy calculation using 1 input 1 output
      ? expectWagerrSwapRedeemFee(chain, txHash, expectedFeePerByte)
      : expectWagerrFee(chain, txHash, expectedFeePerByte, swapInitiate)
  }
  if (chain.name === 'ethereum') {
    return expectEthereumFee(chain, txHash, expectedFeePerByte)
  }
}

async function expectWagerrFee (chain, txHash, expectedFeePerByte, payToScript) {
  const tx = await chain.client.chain.getTransactionByHash(txHash)
  const fee = await getWagerrTransactionFee(chain, tx)
  let size = chain.segwitFeeImplemented ? tx._raw.vsize : tx._raw.size
  if (payToScript && (chain.id.includes('Ledger') || chain.id.includes('Js'))) {
    size -= 10 // Coin select fee calculation is off by 10 bytes as it does not consider pay to script
  }
  const maxFeePerByte = BigNumber(BigNumber(expectedFeePerByte).times(size + 2)).div(size).dp(0).toNumber() // https://github.com/bitcoin/bitcoin/blob/362f9c60a54e673bb3daa8996f86d4bc7547eb13/test/functional/test_framework/util.py#L40
  const feePerByte = BigNumber(fee).div(size).dp(0).toNumber()

  expect(feePerByte).gte(expectedFeePerByte)
  expect(feePerByte).lte(maxFeePerByte)
}

// A dumber fee calculation that is used in swap redeems - 1 in 1 out - legacy tx/inputs assumed
async function expectWagerrSwapRedeemFee (chain, txHash, expectedFeePerByte) {
  const tx = await chain.client.chain.getTransactionByHash(txHash)
  const fee = await getWagerrTransactionFee(chain, tx)
  const expectedFee = providers.wagerr.WagerrUtils.calculateFee(1, 1, expectedFeePerByte)

  expect(fee).to.equal(expectedFee)
}

async function expectEthereumFee (chain, txHash, gasPrice) {
  const tx = await chain.client.chain.getTransactionByHash(txHash)
  expect(parseInt(tx._raw.gasPrice, 16)).to.equal(BigNumber(gasPrice).times(CONSTANTS.GWEI).toNumber())
}

function findProvider (client, type) {
  return findLast(
    client._providers,
    provider => provider instanceof type, client._providers.length
  )
}

function stopEthAutoMining (chain) {
  beforeEach(async () => {
    findProvider(chain.client, providers.ethereum.EthereumRpcProvider).stopMiner()
  })

  afterEach(async () => {
    findProvider(chain.client, providers.ethereum.EthereumRpcProvider).startMiner()
    await sleep(1000) // Give pending transactions time to clear
  })
}

function connectMetaMask () {
  before(async () => {
    console.log('\x1b[36m', 'Starting MetaMask connector on http://localhost:3333 - Open in browser to continue', '\x1b[0m')
    await metaMaskConnector.start()
  })
  after(async () => metaMaskConnector.stop())
}

function connectKiba () {
  before(async () => {
    console.log('\x1b[36m', 'Starting Kiba connector on http://localhost:3334 - Open in browser to continue', '\x1b[0m')
    await kibaConnector.start()
  })
  after(async () => kibaConnector.stop())
}

async function withInternalSendMineHook (chain, provider, func) {
  let originalSendTransaction = provider.sendTransaction
  provider.sendTransaction = async (to, value, data, gasPrice) => {
    const txHash = await originalSendTransaction.bind(provider)(to, value, data, gasPrice)
    if (data !== null) {
      await mineBlock(chain)
    }
    return txHash
  }
  const result = await func()
  provider.sendTransaction = originalSendTransaction
  return result
}

async function deployERC20Token (chain) {
  const erc20Provider = findProvider(chain.client, providers.ethereum.EthereumErc20Provider)
  const ethereumRpcProvider = findProvider(chain.client, providers.ethereum.EthereumRpcProvider)
  const ethereumJsProvider = findProvider(chain.client, providers.ethereum.EthereumJsWalletProvider)
  const ethereumLedgerProvider = findProvider(chain.client, providers.ethereum.EthereumLedgerProvider)
  if (erc20Provider._contractAddress !== CONSTANTS.ETHEREUM_NON_EXISTING_CONTRACT) return
  console.log('\x1b[36m', 'Deploying the ERC20 token contract', '\x1b[0m')
  const bytecode = '608060405234801561001057600080fd5b5060408051678ac7230489e800008152905133916000917fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9181900360200190a3336000908152602081905260409020678ac7230489e80000905561055b8061007a6000396000f3fe608060405260043610610087577c0100000000000000000000000000000000000000000000000000000000600035046306fdde03811461008c578063095ea7b31461011657806323b872dd14610163578063313ce567146101a657806370a08231146101d157806395d89b4114610216578063a9059cbb1461022b578063dd62ed3e14610264575b600080fd5b34801561009857600080fd5b506100a161029f565b6040805160208082528351818301528351919283929083019185019080838360005b838110156100db5781810151838201526020016100c3565b50505050905090810190601f1680156101085780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b34801561012257600080fd5b5061014f6004803603604081101561013957600080fd5b50600160a060020a0381351690602001356102d6565b604080519115158252519081900360200190f35b34801561016f57600080fd5b5061014f6004803603606081101561018657600080fd5b50600160a060020a0381358116916020810135909116906040013561033c565b3480156101b257600080fd5b506101bb6103ab565b6040805160ff9092168252519081900360200190f35b3480156101dd57600080fd5b50610204600480360360208110156101f457600080fd5b5035600160a060020a03166103b0565b60408051918252519081900360200190f35b34801561022257600080fd5b506100a16103c2565b34801561023757600080fd5b5061014f6004803603604081101561024e57600080fd5b50600160a060020a0381351690602001356103f9565b34801561027057600080fd5b506102046004803603604081101561028757600080fd5b50600160a060020a038135811691602001351661040f565b60408051808201909152600a81527f546f6b656e205465737400000000000000000000000000000000000000000000602082015281565b336000818152600160209081526040808320600160a060020a038716808552908352818420869055815186815291519394909390927f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925928290030190a350600192915050565b600160a060020a038316600090815260016020908152604080832033845290915281205482111561036c57600080fd5b600160a060020a03841660009081526001602090815260408083203384529091529020805483900390556103a184848461042c565b5060019392505050565b601281565b60006020819052908152604090205481565b60408051808201909152600481527f5357415000000000000000000000000000000000000000000000000000000000602082015281565b600061040633848461042c565b50600192915050565b600160209081526000928352604080842090915290825290205481565b600160a060020a038216151561044157600080fd5b600160a060020a03831660009081526020819052604090205481111561046657600080fd5b600160a060020a038216600090815260208190526040902054818101101561048d57600080fd5b600160a060020a03808316600081815260208181526040808320805495891680855282852080548981039091559486905281548801909155815187815291519390950194927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef929181900390910190a3600160a060020a0380841660009081526020819052604080822054928716825290205401811461052957fe5b5050505056fea165627a7a72305820db460d87e53e94fdd939b99d2a07ceb235e8a2ce62f7d320cd34a12c1c613a860029'
  const deployingProvider = ethereumJsProvider || ethereumLedgerProvider || ethereumRpcProvider
  let tx = await deployingProvider.sendTransaction(null, 0, bytecode)
  await mineBlock(chain)
  const initiationTransactionReceipt = await chain.client.getMethod('getTransactionReceipt')(tx.hash)
  erc20Provider._contractAddress = initiationTransactionReceipt.contractAddress
}

const describeExternal = process.env.RUN_EXTERNAL ? describe.only : describe.skip

export {
  CONSTANTS,
  chains,
  getNewAddress,
  getRandomAddress,
  getRandomWagerrAddress,
  importWagerrAddresses,
  fundAddress,
  fundWallet,
  metaMaskConnector,
  kibaConnector,
  initiateAndVerify,
  claimAndVerify,
  refundAndVerify,
  getSwapParams,
  expectBalance,
  expectFee,
  sleep,
  stopEthAutoMining,
  mineUntilTimestamp,
  mineBlock,
  deployERC20Token,
  connectMetaMask,
  connectKiba,
  describeExternal
}
