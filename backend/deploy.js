const fs = require('fs');
const Web3 = require('web3');

// Path to compiled contract artifacts - using relative paths instead of absolute
const abi = JSON.parse(fs.readFileSync("./contracts/Cruds.abi"));
const bytecode = fs.readFileSync("./contracts/Cruds.bin").toString();

// Connect to local Ethereum network (Ganache) - update port to 7545
const web3 = new Web3(new Web3.providers.HttpProvider("HTTP://127.0.0.1:7545"));

async function deploy() {
  try {
    // Get list of accounts from Ganache
    const accounts = await web3.eth.getAccounts();
    console.log('Available accounts:', accounts);
    
    // Use the first account for deployment
    const deployerAccount = accounts[0];
    console.log('Using account for deployment:', deployerAccount);
    
    // Create contract instance
    let contract = new web3.eth.Contract(abi);
    
    // Deploy the contract
    const deployTx = contract.deploy({
      data: '0x' + bytecode // Make sure to add '0x' prefix if not already in the bytecode
    });
    
    // Send the deployment transaction
    const deployedContract = await deployTx.send({
      from: deployerAccount,
      gas: 6721975,
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