const fs = require('fs');
const Web3 = require('web3');
require('dotenv').config();

// Path to compiled contract artifacts
const abi = JSON.parse(fs.readFileSync("./contracts/Cruds.abi"));
const bytecode = fs.readFileSync("./contracts/Cruds.bin").toString();

// Connect to Sepolia via Infura
const web3 = new Web3(new Web3.providers.HttpProvider(
  'https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}'
));

// Import wallet using private key from env
const account = web3.eth.accounts.privateKeyToAccount('0x${process.env.PRIVATE_KEY}');
web3.eth.accounts.wallet.add(account);
const deployerAccount = account.address;

async function deploy() {
  try {
    console.log('Using account for deployment:', deployerAccount);
    
    // Create contract instance
    let contract = new web3.eth.Contract(abi);
    
    // Deploy the contract
    const deployTx = contract.deploy({
      data: '0x' + bytecode
    });
    
    // Send the deployment transaction
    const deployedContract = await deployTx.send({
      from: deployerAccount,
      gas: 3000000,
    });
    
    // Log the contract address
    console.log('Contract deployed successfully!');
    console.log('Contract address:', deployedContract.options.address);
    
    // Save contract address to a file for future reference
    fs.writeFileSync('./contract-address.txt', deployedContract.options.address);
    console.log('Contract address saved to contract-address.txt');
    
    return deployedContract.options.address;
  } catch (error) {
    console.error('Error deploying contract:', error);
    throw error;
  }
}

// Execute deployment
deploy()
  .then(() => console.log('Deployment completed'))
  .catch(err => console.error('Deployment failed:', err));