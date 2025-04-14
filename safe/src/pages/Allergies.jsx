import React, { useState, useEffect } from "react";
import Web3 from "web3";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import contract from "../contracts/contract.json";
import { useCookies } from "react-cookie";
import { WEB3_PROVIDER, IPFS_GATEWAY } from "../config/ipfs-config";
import { uploadJSONToPinata, getFromIPFS } from "../services/pinata-service";

const Allergies = () => {
  const web3 = new Web3(new Web3.providers.HttpProvider(WEB3_PROVIDER));
  const mycontract = new web3.eth.Contract(
    contract["abi"],
    contract["address"]
  );
  const [cookies, setCookie] = useCookies();
  const [allergies, setallergies] = useState([]);

  useEffect(() => {
    const fetchAllergies = async () => {
      try {
        const patientCIDs = await mycontract.methods.getPatient().call();
        
        for (let i = patientCIDs.length - 1; i >= 0; i--) {
          if (patientCIDs[i] === cookies['hash']) {
            const data = await getFromIPFS(patientCIDs[i]);
            setallergies([data.allergies || []]);
            break;
          }
        }
      } catch (error) {
        console.error("Error fetching allergies:", error);
      }
    };
    
    fetchAllergies();
  }, []);

  const [addFormData, setAddFormData] = useState({
    name: "",
    type: "",
    medication: "",
  });

  const handleAddFormChange = (event) => {
    const newFormData = { ...addFormData };
    newFormData[event.target.name] = event.target.value;
    setAddFormData(newFormData);
  };

  async function submit() {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const currentaddress = accounts[0];

      const patientCIDs = await mycontract.methods.getPatient().call();
      
      for (let i = patientCIDs.length - 1; i >= 0; i--) {
        if (patientCIDs[i] === cookies['hash']) {
          const data = await getFromIPFS(patientCIDs[i]);
          const allergyList = data.allergies || [];
          allergyList.push(addFormData);
          data.allergies = allergyList;
          
          const hash = await uploadJSONToPinata(data);
          
          await mycontract.methods.addPatient(hash).send({ from: currentaddress });
          setCookie('hash', hash);
          alert("Allergy added");
          window.location.reload();
          break;
        }
      }
    } catch (error) {
      console.error("Error adding allergy:", error);
      alert("Failed to add allergy. Please try again.");
    }
  }

  async function del(name) {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const currentaddress = accounts[0];

      const patientCIDs = await mycontract.methods.getPatient().call();
      
      for (let i = patientCIDs.length - 1; i >= 0; i--) {
        if (patientCIDs[i] === cookies['hash']) {
          const data = await getFromIPFS(patientCIDs[i]);
          const allergyList = data.allergies || [];
          const newList = allergyList.filter(item => item.name !== name);
          
          data.allergies = newList;
          const hash = await uploadJSONToPinata(data);
          
          await mycontract.methods.addPatient(hash).send({ from: currentaddress });
          setCookie('hash', hash);
          alert("Allergy deleted");
          window.location.reload();
          break;
        }
      }
    } catch (error) {
      console.error("Error deleting allergy:", error);
      alert("Failed to delete allergy. Please try again.");
    }
  }

  function showAllergies() {
    if (allergies.length > 0 && Array.isArray(allergies[0])) {
      return allergies[0].map((allergy, index) => {
        if (allergy && allergy.name) {
          return (
            <tr key={index}>
              <td>{allergy.name}</td>
              <td>{allergy.type}</td>
              <td>{allergy.medication}</td>
              <td>
                <input type="button" value="Delete" onClick={() => del(allergy.name)} />
              </td>
            </tr>
          );
        }
        return null;
      });
    }
    return null;
  }

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
          <form style={{ width: "100%" }}>
            <table style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th className="">Name</th>
                  <th className="">Type</th>
                  <th className="">Medication Required</th>
                  <th className="">Actions</th>
                </tr>
              </thead>
              <tbody>
                {showAllergies()}
              </tbody>
            </table>
          </form>

          <form style={{
            display: 'flex', flexDirection: 'column', gap: '1rem',
            backgroundColor: 'rgb(3, 201, 215)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '24px',
            borderRadius: '20px',
          }}>
            <h2>Add an Allergy</h2>
            <input
              type="text"
              name="name"
              required="required"
              placeholder="Name"
              onChange={handleAddFormChange}
            />
            <input
              type="text"
              name="type"
              required="required"
              placeholder="Type"
              onChange={handleAddFormChange}
            />
            <input
              type="text"
              name="medication"
              required="required"
              placeholder="Medication Required"
              onChange={handleAddFormChange}
            />
            <input type="button" value="Save" onClick={submit} />
          </form>
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default Allergies;