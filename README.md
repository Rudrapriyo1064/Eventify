Blockchain Based NFT Tickets Event Ticketing Application - EVENTIFY

## Instructions to run an application on browser

1. On Google chrome, install the Metamask chrome extension
2. Follow the instructions to create or login to a wallet
3. Go to the chrome extension, click the existing networks, then select add new network
4. Enter the following details to add the Polygon Amoy Test Network

- Network Name = Polygon Amoy Testnet
- New RPC URL = https://rpc-amoy.polygon.technology
- Chain ID = 80002
- Currency Symbol = MATIC

5. If you want to add fake MATIC tokens to purchase tokens, follow these instructions:

- Go to the Metamask extension and copy your wallet's public address
- Naviate to https://faucet.polygon.technology
- Chose network to be Amoy and tokken to be MATIC
- Paste your address into the wallet address field and then press submit

## Local compilation of code

1. Run the command "npx hardhat node" and do not kill terminal while running the app as is it locally runs the blockchain
2. On a second terminal run the command "npx hardhat run scripts/deploy.js --network amoy" to run intial startup scripts
3. Run "npm run dev" to startup web application
   
