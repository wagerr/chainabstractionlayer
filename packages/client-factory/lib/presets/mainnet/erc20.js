import EthereumRpcProvider from '@wagerr-wdk/ethereum-rpc-provider'
 import EthereumJsWalletProvider from '@wagerr-wdk/ethereum-js-wallet-provider'
 import EthereumGasStationFeeProvider from '@wagerr-wdk/ethereum-gas-station-fee-provider'
 import EthereumErc20Provider from '@wagerr-wdk/ethereum-erc20-provider'
 import EthereumErc20SwapProvider from '@wagerr-wdk/ethereum-erc20-swap-provider'
 import EthereumErc20ScraperSwapFindProvider from '@wagerr-wdk/ethereum-erc20-scraper-swap-find-provider'
 import EthereumNetworks from '@wagerr-wdk/ethereum-networks'

 export default [
   {
     provider: EthereumRpcProvider,
     optional: ['infuraProjectId'],
     args: config => [
       `https://mainnet.infura.io/v3/${config.infuraProjectId || '1d8f7fb6ae924886bbd1733951332eb0'}`
     ]
   },
   {
     provider: EthereumJsWalletProvider,
     onlyIf: ['mnemonic'],
     args: config => [
       EthereumNetworks.mainnet,
       config.mnemonic
     ]
   },
   {
     provider: EthereumErc20Provider,
     requires: ['contractAddress'],
     args: config => [
       config.contractAddress
     ]
   },
   {
     provider: EthereumErc20SwapProvider
   },
   {
     provider: EthereumErc20ScraperSwapFindProvider,
     args: [
       'https://liquality.io/eth-mainnet-api'
     ]
   },
   {
     provider: EthereumGasStationFeeProvider
   }
 ]