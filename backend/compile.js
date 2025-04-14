const fs = require('fs');
const solc = require('solc');

// Read the Solidity contract source code
const source = fs.readFileSync('./contracts/Cruds.sol', 'utf8');

// Configure solc compiler input
const input = {
  language: 'Solidity',
  sources: {
    'Cruds.sol': {
      content: source,
    },
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['*'],
      },
    },
  },
};

// Compile the contract
const output = JSON.parse(solc.compile(JSON.stringify(input)));

// Extract ABI and bytecode
const contractOutput = output.contracts['Cruds.sol']['Cruds'];
const abi = contractOutput.abi;
const bytecode = contractOutput.evm.bytecode.object;

// Write the ABI and bytecode to files
fs.writeFileSync('./contracts/Cruds.abi', JSON.stringify(abi, null, 2));
fs.writeFileSync('./contracts/Cruds.bin', bytecode);

console.log('Contract compiled successfully!');