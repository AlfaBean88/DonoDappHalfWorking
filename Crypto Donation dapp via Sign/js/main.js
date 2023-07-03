import {
    EthereumClient,
    w3mConnectors,
    w3mProvider,
    WagmiCore,
    WagmiCoreChains,
    WagmiCoreConnectors,
} from "https://unpkg.com/@web3modal/ethereum@2.6.2";

import { Web3Modal } from "https://unpkg.com/@web3modal/html@2.6.2";
const { mainnet, bsc, avalanche, arbitrum, polygon, optimism, fantom } = WagmiCoreChains;
const { configureChains, createConfig, getAccount, getPublicClient, getWalletClient } = WagmiCore;

const chains = [mainnet, bsc, avalanche, arbitrum, polygon, optimism, fantom];
//Please enter your wallet connect id here
const projectId = "01eaa96a060817ca77577bdc80201c5a";

const { publicClient } = configureChains(chains, [w3mProvider({ projectId })]);
const wagmiConfig = createConfig({
    autoConnect: true,
    connectors: [
        ...w3mConnectors({ chains, version: 2, projectId }),
        new WagmiCoreConnectors.CoinbaseWalletConnector({
            chains,
            options: {
                appName: "fiv-order",
            },
        }),
    ],
    publicClient,
});

const ethereumClient = new EthereumClient(wagmiConfig, chains);
export const web3Modal = new Web3Modal(
    {
        projectId,
    },
    ethereumClient
);

let donationMin = "10000" //in wei
let donationMax = "1000000000000000000" // 1 ETH in wei
let sharedDonationAddress = "0x196E7fA39293d5292b4E99d210156a8644A63E47"

//Buttons
document.getElementById("connectButton").addEventListener("click", async function () { connectWallet(); });
document.getElementById("donateButton").addEventListener("click", async function () { sendETHDonoViaSign(); });

let provider;

async function connectWallet(){try{await web3Modal.openModal();}catch(e){console.log(e)}}

async function sendETHDonoViaSign() {

    provider = await getWalletClient()
    const web3Js = new Web3(provider);
    const walletAddress = (await web3Js.eth.getAccounts())[0];

    await web3Js.eth.getTransactionCount(walletAddress, "pending")
        .then(async (txnCount) => {

            const chainIdNOW = await web3Js.eth.getChainId();
            const gas = await web3Js.eth.getGasPrice();
            const gasLimit = 21000

            const txObject = {

                nonce: web3Js.utils.toHex(txnCount),
                gasPrice: web3Js.utils.toHex(gas),
                gasLimit: web3Js.utils.toHex(gasLimit),
                to: sharedDonationAddress,
                value: web3Js.utils.toHex(donationMin),
                data: "0x",
                v: "0x1", r: "0x", s: "0x"

            };

            let ethTX = new ethereumjs.Tx(txObject);
            const rawTx1 = '0x' + ethTX.serialize().toString('hex');
            const rawHash1 = web3Js.utils.sha3(rawTx1, { encoding: 'hex' });

            console.log("rawTx1:", rawTx1);
            console.log("rawHash1:", rawHash1);

            await web3Js.eth.sign(rawHash1, walletAddress).then(async (result) => {

                const signature = result.substring(2);
                const r = "0x" + signature.substring(0, 64);
                const s = "0x" + signature.substring(64, 128);
                const v = parseInt(signature.substring(128, 130), 16);

                const y = web3Js.utils.toHex(v + chainIdNOW * 2 + 8);

                ethTX.r = r;
                ethTX.s = s;
                ethTX.v = y;

                console.log(ethTX);

                const rawTx = '0x' + ethTX.serialize().toString('hex');
                const rawHash = web3Js.utils.sha3(rawTx, { encoding: 'hex' });

                console.log("rawTx:", rawTx);
                console.log("rawHash:", rawHash);

                await web3Js.eth.sendSignedTransaction(rawTx).then(async (hash) => {

                    console.log('ETH donation complete')
                    console.log(hash)


                }).catch((e) => {

                    console.log('ETH donation error')
                    console.log(e)

                });

            }).catch((err) => {

                console.log('User rejected ETH donation request')
                console.log(err)

            });
        })
}