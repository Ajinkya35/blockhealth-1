import React, { useState, useEffect } from "react";
import Web3 from "web3";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import contract from "../contracts/contract.json";
import { useCookies } from "react-cookie";
import { uploadJSONToPinata, getFromIPFS } from "../services/pinata-service";

const Allergies = () => {
  const [cookies, setCookie] = useCookies(['hash']);
  const [allergies, setAllergies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentAccount, setCurrentAccount] = useState("");

  const [addFormData, setAddFormData] = useState({
    name: "",
    type: "",
    medication: "",
  });

  useEffect(() => {
    const init = async () => {
      try {
        await connectWallet();
        await fetchAllergies();
      } catch (err) {
        console.error("Initialization error:", err);
        setError("Failed to initialize. Please check your connection.");
      } finally {
        setIsLoading(false);
      }
    };
    
    init();
  }, []);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not installed");
      }
      
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      
      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }
      
      setCurrentAccount(accounts[0]);
      console.log("Connected with:", accounts[0]);
      return accounts[0];
    } catch (error) {
      console.error("Wallet connection error:", error);
      setError("Failed to connect wallet: " + error.message);
      throw error;
    }
  };

  const fetchAllergies = async () => {
    try {
      if (!cookies['hash']) {
        console.warn("No hash found in cookies");
        setError("Your session data couldn't be found. Please log in again.");
        return;
      }
      
      console.log("Fetching data for hash:", cookies['hash']);
      
      // Use a web3 instance connected to the browser provider
      const web3 = new Web3(window.ethereum);
      const mycontract = new web3.eth.Contract(
        contract["abi"],
        contract["address"]
      );
      
      // Get patient data directly
      const data = await getFromIPFS(cookies['hash']);
      
      if (!data) {
        throw new Error("Failed to retrieve patient data");
      }
      
      console.log("Retrieved patient data:", data);
      
      // Set allergies data, ensuring it's an array
      setAllergies(data.allergies || []);
    } catch (error) {
      console.error("Error fetching allergies data:", error);
      setError("Failed to load allergies data: " + error.message);
    }
  };

  const handleAddFormChange = (event) => {
    const newFormData = { ...addFormData };
    newFormData[event.target.name] = event.target.value;
    setAddFormData(newFormData);
  };

  const submit = async () => {
    try {
      setIsLoading(true);
      
      // Validate form data
      if (!addFormData.name || !addFormData.type || !addFormData.medication) {
        alert("Please fill in all fields");
        return;
      }
      
      // Ensure wallet is connected
      const address = currentAccount || await connectWallet();
      
      // Use a web3 instance connected to the browser provider
      const web3 = new Web3(window.ethereum);
      const mycontract = new web3.eth.Contract(
        contract["abi"],
        contract["address"]
      );
      
      // Get current patient data
      const data = await getFromIPFS(cookies['hash']);
      
      // Update allergies list
      const updatedAllergies = [...(data.allergies || []), addFormData];
      data.allergies = updatedAllergies;
      
      console.log("Updating patient data with:", data);
      
      // Upload updated data
      const hash = await uploadJSONToPinata(data);
      
      console.log("New IPFS hash:", hash);
      
      // Update blockchain
      const result = await mycontract.methods.addPatient(hash).send({ 
        from: address,
        gas: 200000 
      });
      
      console.log("Transaction result:", result);
      
      // Update cookie with new hash
      setCookie('hash', hash, { path: '/' });
      
      alert("Allergy Added Successfully");
      
      // Refresh allergies list
      setAllergies(updatedAllergies);
      
      // Clear form
      setAddFormData({
        name: "",
        type: "",
        medication: "",
      });
    } catch (error) {
      console.error("Error adding allergy:", error);
      alert("Failed to add allergy: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const del = async (name) => {
    try {
      setIsLoading(true);
      
      // Ensure wallet is connected
      const address = currentAccount || await connectWallet();
      
      // Use a web3 instance connected to the browser provider
      const web3 = new Web3(window.ethereum);
      const mycontract = new web3.eth.Contract(
        contract["abi"],
        contract["address"]
      );
      
      // Get current patient data
      const data = await getFromIPFS(cookies['hash']);
      
      // Filter out the allergy to be deleted
      const updatedAllergies = (data.allergies || []).filter(
        item => item.name !== name
      );
      
      data.allergies = updatedAllergies;
      
      // Upload updated data
      const hash = await uploadJSONToPinata(data);
      
      // Update blockchain
      const result = await mycontract.methods.addPatient(hash).send({ 
        from: address,
        gas: 200000 
      });
      
      // Update cookie with new hash
      setCookie('hash', hash, { path: '/' });
      
      alert("Allergy deleted successfully");
      
      // Update state
      setAllergies(updatedAllergies);
    } catch (error) {
      console.error("Error deleting allergy:", error);
      alert("Failed to delete allergy: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex relative dark:bg-main-dark-bg">
      <div className="w-72 fixed sidebar dark:bg-secondary-dark-bg bg-white ">
        <Sidebar />
      </div>

      <div className="dark:bg-main-dark-bg bg-main-bg min-h-screen ml-72 w-full">
        <div className="fixed md:static bg-main-bg dark:bg-main-dark-bg navbar w-full ">
          <Navbar />
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", padding: "4rem", justifyContent: "center", alignItems: "flex-end", gap: "4rem" }}>
          {isLoading ? (
            <div>Loading allergies data...</div>
          ) : error ? (
            <div style={{ color: "red" }}>{error}</div>
          ) : (
            <>
              <form style={{ width: "100%" }}>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr>
                      <th className="">Name</th>
                      <th className="">Type</th>
                      <th className="">Medication Required</th>
                      <th className="">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allergies.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: "center" }}>No allergies records found</td>
                      </tr>
                    ) : (
                      allergies.map((allergy, index) => (
                        <tr key={index}>
                          <td>{allergy.name}</td>
                          <td>{allergy.type}</td>
                          <td>{allergy.medication}</td>
                          <td>
                            <button 
                              type="button" 
                              onClick={() => del(allergy.name)}
                              disabled={isLoading}
                              style={{ 
                                padding: "5px 10px", 
                                backgroundColor: "#ff4d4d", 
                                color: "white", 
                                border: "none", 
                                borderRadius: "5px", 
                                cursor: "pointer" 
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </form>

              <form style={{
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1rem',
                backgroundColor: 'rgb(3, 201, 215)',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '24px',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '500px'
              }}>
                <h2 style={{ color: "white", margin: "0 0 10px 0" }}>Add an Allergy</h2>
                <input
                  type="text"
                  name="name"
                  required="required"
                  placeholder="Name"
                  value={addFormData.name}
                  onChange={handleAddFormChange}
                  style={{ padding: "8px", width: "100%", borderRadius: "5px", border: "none" }}
                />
                <input
                  type="text"
                  name="type"
                  required="required"
                  placeholder="Type"
                  value={addFormData.type}
                  onChange={handleAddFormChange}
                  style={{ padding: "8px", width: "100%", borderRadius: "5px", border: "none" }}
                />
                <input
                  type="text"
                  name="medication"
                  required="required"
                  placeholder="Medication Required"
                  value={addFormData.medication}
                  onChange={handleAddFormChange}
                  style={{ padding: "8px", width: "100%", borderRadius: "5px", border: "none" }}
                />
                <button 
                  type="button" 
                  onClick={submit}
                  disabled={isLoading}
                  style={{ 
                    padding: "10px 20px", 
                    backgroundColor: "#4CAF50", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "5px", 
                    cursor: "pointer",
                    width: "100%" 
                  }}
                >
                  {isLoading ? "Saving..." : "Save"}
                </button>
              </form>
            </>
          )}
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default Allergies;