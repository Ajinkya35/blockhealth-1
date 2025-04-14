const fs = require('fs');
const Web3 = require('web3');
const PinataService = require('./pinata-integration');

// Load contract ABI and address
const abi = JSON.parse(fs.readFileSync("./contracts/Cruds.abi"));
let contractAddress;
try {
  contractAddress = fs.readFileSync('./contract-address.txt', 'utf8').trim();
} catch (error) {
  console.error('Contract address file not found. Please deploy the contract first.');
  process.exit(1);
}

// Connect to local Ethereum network (Ganache) - update to port 7545
const web3 = new Web3(new Web3.providers.HttpProvider("HTTP://127.0.0.1:7545"));

// Create contract instance
const contract = new web3.eth.Contract(abi, contractAddress);

// Initialize Pinata service (replace with your API keys)
const pinataService = new PinataService(
  'ec5708de7b01dcfa44f1',
  '5c2d9866d820ceae9c3cb1f613409de54052bca80659ca29dc0f883f49d8bd00'
);

async function initializeAccounts() {
  const accounts = await web3.eth.getAccounts();
  return accounts;
}

// Add a new doctor
async function addDoctor(account, doctorData) {
  try {
    // Upload doctor data to Pinata
    const cid = await pinataService.pinJSONToIPFS(doctorData);
    console.log('Doctor data uploaded to IPFS with CID:', cid);
    
    // Add CID to blockchain
    const receipt = await contract.methods.addDoctor(cid).send({
      from: account,
      gas: 3000000
    });
    
    console.log('Doctor added to blockchain. Transaction hash:', receipt.transactionHash);
    return cid;
  } catch (error) {
    console.error('Error adding doctor:', error);
    throw error;
  }
}

// Get all doctors
async function getDoctors() {
  try {
    // Get CIDs from blockchain
    const doctorCIDs = await contract.methods.getDoctor().call();
    console.log('Doctor CIDs:', doctorCIDs);
    
    // Fetch doctor data from IPFS
    const doctors = [];
    for (const cid of doctorCIDs) {
      const doctorData = await pinataService.getContent(cid);
      doctors.push({
        cid,
        data: doctorData
      });
    }
    
    return doctors;
  } catch (error) {
    console.error('Error getting doctors:', error);
    throw error;
  }
}

// Add a new patient
async function addPatient(account, patientData) {
  try {
    // Upload patient data to Pinata
    const cid = await pinataService.pinJSONToIPFS(patientData);
    console.log('Patient data uploaded to IPFS with CID:', cid);
    
    // Add CID to blockchain
    const receipt = await contract.methods.addPatient(cid).send({
      from: account,
      gas: 3000000
    });
    
    console.log('Patient added to blockchain. Transaction hash:', receipt.transactionHash);
    return cid;
  } catch (error) {
    console.error('Error adding patient:', error);
    throw error;
  }
}

// Get all patients
async function getPatients() {
  try {
    // Get CIDs from blockchain
    const patientCIDs = await contract.methods.getPatient().call();
    console.log('Patient CIDs:', patientCIDs);
    
    // Fetch patient data from IPFS
    const patients = [];
    for (const cid of patientCIDs) {
      const patientData = await pinataService.getContent(cid);
      patients.push({
        cid,
        data: patientData
      });
    }
    
    return patients;
  } catch (error) {
    console.error('Error getting patients:', error);
    throw error;
  }
}

// Example usage
async function main() {
  try {
    const accounts = await initializeAccounts();
    const mainAccount = accounts[0];
    
    console.log('Connected to MediVault contract at address:', contractAddress);
    console.log('Using account:', mainAccount);
    
    // Example: Add a doctor
    const doctorData = {
      name: 'Dr. John Smith',
      specialization: 'Cardiologist',
      contactInfo: {
        email: 'john.smith@example.com',
        phone: '123-456-7890'
      },
      licenseNumber: 'MED12345'
    };
    
    await addDoctor(mainAccount, doctorData);
    
    // Example: Get all doctors
    const doctors = await getDoctors();
    console.log('All doctors:', doctors);
    
    // Example: Add a patient
    const patientData = {
      name: 'Jane Doe',
      dateOfBirth: '1985-06-15',
      contactInfo: {
        email: 'jane.doe@example.com',
        phone: '098-765-4321'
      },
      medicalRecords: [
        {
          date: '2023-01-15',
          doctorCID: doctors[0].cid,
          diagnosis: 'Common cold',
          prescription: 'Rest and fluids'
        }
      ]
    };
    
    await addPatient(mainAccount, patientData);
    
    // Example: Get all patients
    const patients = await getPatients();
    console.log('All patients:', patients);
    
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

module.exports = {
  addDoctor,
  getDoctors,
  addPatient,
  getPatients
};

// If this file is run directly (not imported)
if (require.main === module) {
  main()
    .then(() => console.log('Script completed successfully'))
    .catch(err => console.error('Script failed:', err));
}