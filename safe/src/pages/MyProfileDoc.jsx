import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Sidebar2 from "../components/Sidebar2";
import Footer from "../components/Footer";
import { useCookies } from 'react-cookie';
import Web3 from "web3";
import contract from '../contracts/contract.json';
import { getFromIPFS, uploadJSONToPinata } from "../services/pinata-service";

const MyProfileDoc = () => {
  const [cookies, setCookie] = useCookies(['hash']);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [licenseno, setLicenseno] = useState("");
  const [disabled, setDisabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentAccount, setCurrentAccount] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        await connectWallet();
        await fetchProfile();
      } catch (err) {
        console.error("Initialization error:", err);
        setError("Failed to initialize. Please check your connection.");
      } finally {
        setIsLoading(false);
      }
    };
    
    init();
  }, [cookies['hash']]);

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

  const fetchProfile = async () => {
    try {
      if (!cookies['hash']) {
        console.warn("No hash found in cookies");
        setError("Your session data couldn't be found. Please log in again.");
        return;
      }
      
      console.log("Fetching doctor profile data for hash:", cookies['hash']);
      
      // Get doctor data directly
      const data = await getFromIPFS(cookies['hash']);
      
      if (!data) {
        throw new Error("Failed to retrieve profile data");
      }
      
      console.log("Retrieved doctor profile data:", data);
      
      // Set profile data
      setName(data.name || "");
      setEmail(data.mail || "");
      setPassword(data.password || "");
      setLicenseno(data.license || "");
    } catch (error) {
      console.error("Error fetching doctor profile:", error);
      setError("Failed to load profile: " + error.message);
    }
  };

  function handleGameClick() {
    setDisabled(!disabled);
  }

  async function save() {
    try {
      setIsLoading(true);
      
      // Validate fields
      if (!name || !email || !password || !licenseno) {
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
      
      // Get doctor data
      const data = await getFromIPFS(cookies['hash']);
      
      if (!data) {
        throw new Error("Failed to retrieve doctor data");
      }
      
      // Update fields
      data.name = name;
      data.mail = email;
      data.password = password;
      data.license = licenseno;
      
      console.log("Updating doctor profile data with:", data);
      
      // Upload updated data
      const newHash = await uploadJSONToPinata(data);
      
      console.log("New IPFS hash:", newHash);
      
      // Update blockchain
      const result = await mycontract.methods.addDoctor(newHash).send({ 
        from: address,
        gas: 200000 
      });
      
      console.log("Transaction result:", result);
      
      // Update cookies
      setCookie('hash', newHash, { path: '/' });
      setCookie('name', name, { path: '/' });
      setCookie('mail', email, { path: '/' });
      
      alert("Profile updated successfully");
      
      // Reset disabled state
      setDisabled(true);
    } catch (error) {
      console.error("Error saving doctor profile:", error);
      alert("Failed to save profile: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex relative dark:bg-main-dark-bg">
      <div className="w-72 fixed sidebar dark:bg-secondary-dark-bg bg-white ">
        <Sidebar2 />
      </div>

      <div className="dark:bg-main-dark-bg bg-main-bg min-h-screen ml-72 w-full">
        <div className="fixed md:static bg-main-bg dark:bg-main-dark-bg navbar w-full ">
          <Navbar />
        </div>
        
        {isLoading ? (
          <div className="flex justify-center m-10">Loading profile data...</div>
        ) : error ? (
          <div className="flex justify-center m-10 text-red-500">{error}</div>
        ) : (
          <div className="flex justify-center m-10 ">
            <form className="p-5 bg-slate-100 rounded-lg shadow-md w-full max-w-md">
              <h1 className="text-center text-lg font-bold mb-4">Doctor Profile</h1>

              <div className="py-2 flex items-center">
                <label className="text-black block w-24">Name:</label>
                <input
                  id="inp"
                  className="flex-1 px-3 py-2 mr-2 border rounded"
                  name="name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={disabled}
                  required
                />
                <button 
                  type="button" 
                  className="text-xl hover:text-blue-400 cursor-pointer" 
                  onClick={handleGameClick}
                >
                  ✎
                </button>
              </div>

              <div className="py-2 flex items-center">
                <label className="text-black block w-24">Email:</label>
                <input
                  id="inp"
                  className="flex-1 px-3 py-2 mr-2 border rounded"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={disabled}
                  required
                />
                <button 
                  type="button" 
                  className="text-xl hover:text-blue-400 cursor-pointer" 
                  onClick={handleGameClick}
                >
                  ✎
                </button>
              </div>

              <div className="py-2 flex items-center">
                <label className="text-black block w-24">Password:</label>
                <input
                  className="flex-1 px-3 py-2 mr-2 border rounded"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={disabled}
                  required
                />
                <button 
                  type="button" 
                  className="text-xl hover:text-blue-400 cursor-pointer" 
                  onClick={handleGameClick}
                >
                  ✎
                </button>
              </div>

              <div className="py-2 flex items-center">
                <label className="text-black block w-24">License No.:</label>
                <input
                  className="flex-1 px-3 py-2 mr-2 border rounded"
                  name="licenseno"
                  type="text"
                  value={licenseno}
                  onChange={(e) => setLicenseno(e.target.value)}
                  disabled={disabled}
                  required
                />
                <button 
                  type="button" 
                  className="text-xl hover:text-blue-400 cursor-pointer" 
                  onClick={handleGameClick}
                >
                  ✎
                </button>
              </div>

              <div className="py-2 flex justify-center mt-4">
                <button
                  type="button"
                  onClick={save}
                  disabled={isLoading}
                  className="bg-cyan-400 text-white font-medium py-2 px-6 rounded hover:bg-cyan-500 transition-colors"
                >
                  {isLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        )}

        <Footer />
      </div>
    </div>
  );
};

export default MyProfileDoc;