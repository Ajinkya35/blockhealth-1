import React, { useState, useEffect } from "react";
import Web3 from "web3";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Sidebar from "../components/Sidebar";
import contract from "../contracts/contract.json";
import { useCookies } from "react-cookie";
import { uploadJSONToPinata, getFromIPFS } from "../services/pinata-service";

const HospitalizationHistory = () => {
  const [cookies, setCookie] = useCookies(['hash']);
  const [hospHistory, setHospHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentAccount, setCurrentAccount] = useState("");

  const [addFormData, setAddFormData] = useState({
    datefrom: "",
    dateto: "",
    reason: "",
    surgery: "",
  });

  useEffect(() => {
    const init = async () => {
      try {
        await connectWallet();
        await fetchHospitalizationHistory();
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

  const fetchHospitalizationHistory = async () => {
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
      
      // Set hospitalization history data, ensuring it's an array
      setHospHistory(data.hospitalizationhistory || []);
    } catch (error) {
      console.error("Error fetching hospitalization history:", error);
      setError("Failed to load hospitalization history: " + error.message);
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
      if (!addFormData.datefrom || !addFormData.dateto || !addFormData.reason) {
        alert("Please fill in all required fields");
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
      
      if (!cookies['hash']) {
        alert("Please log in first");
        return;
      }
      
      // Get patient data
      const data = await getFromIPFS(cookies['hash']);
      
      if (!data) {
        throw new Error("Failed to retrieve patient data");
      }
      
      // Update hospitalization history
      const updatedHistory = [...(data.hospitalizationhistory || []), addFormData];
      data.hospitalizationhistory = updatedHistory;
      
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
      
      alert("Hospitalization History Added Successfully");
      
      // Refresh hospitalization history
      setHospHistory(updatedHistory);
      
      // Clear form
      setAddFormData({
        datefrom: "",
        dateto: "",
        reason: "",
        surgery: "",
      });
    } catch (error) {
      console.error("Error adding hospitalization history:", error);
      alert("Failed to add hospitalization history: " + error.message);
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
            <div>Loading hospitalization history...</div>
          ) : error ? (
            <div style={{ color: "red" }}>{error}</div>
          ) : (
            <>
              <form style={{ width: "100%" }}>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr>
                      <th className="">Admitted On</th>
                      <th className="">Discharged On</th>
                      <th className="">Reason</th>
                      <th className="">Surgery</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hospHistory.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: "center" }}>No hospitalization records found</td>
                      </tr>
                    ) : (
                      hospHistory.map((record, index) => (
                        <tr key={index}>
                          <td>{record.datefrom}</td>
                          <td>{record.dateto}</td>
                          <td>{record.reason}</td>
                          <td>{record.surgery}</td>
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
                <h2 style={{ color: "white", margin: "0 0 10px 0" }}>Add your Hospitalization History</h2>
                <input
                  type="date"
                  name="datefrom"
                  required="required"
                  placeholder="Admitted On"
                  value={addFormData.datefrom}
                  onChange={handleAddFormChange}
                  style={{ padding: "8px", width: "100%", borderRadius: "5px", border: "none" }}
                />
                <input
                  type="date"
                  name="dateto"
                  required="required"
                  placeholder="Discharged On"
                  value={addFormData.dateto}
                  onChange={handleAddFormChange}
                  style={{ padding: "8px", width: "100%", borderRadius: "5px", border: "none" }}
                />
                <input
                  type="text"
                  name="reason"
                  required="required"
                  placeholder="Reason"
                  value={addFormData.reason}
                  onChange={handleAddFormChange}
                  style={{ padding: "8px", width: "100%", borderRadius: "5px", border: "none" }}
                />
                <input
                  type="text"
                  name="surgery"
                  required="required"
                  placeholder="Surgery, if any?"
                  value={addFormData.surgery}
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

export default HospitalizationHistory;