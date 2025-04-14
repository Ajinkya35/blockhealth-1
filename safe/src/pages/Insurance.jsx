import React, { useState, useEffect } from "react";
import Web3 from "web3";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Sidebar from "../components/Sidebar";
import contract from "../contracts/contract.json";
import { useCookies } from "react-cookie";
import { WEB3_PROVIDER, IPFS_GATEWAY } from "../config/ipfs-config";
import { uploadJSONToPinata, getFromIPFS } from "../services/pinata-service";

const Insurance = () => {
  const web3 = new Web3(new Web3.providers.HttpProvider(WEB3_PROVIDER));
  const mycontract = new web3.eth.Contract(
    contract["abi"],
    contract["address"]
  );
  const [cookies, setCookie] = useCookies();
  const [insurances, setInsurance] = useState([]);

  useEffect(() => {
    const fetchInsurance = async () => {
      try {
        const patientCIDs = await mycontract.methods.getPatient().call();
        
        for (let i = patientCIDs.length - 1; i >= 0; i--) {
          if (patientCIDs[i] === cookies['hash']) {
            const data = await getFromIPFS(patientCIDs[i]);
            setInsurance([data.insurance || []]);
            break;
          }
        }
      } catch (error) {
        console.error("Error fetching insurance data:", error);
      }
    };
    
    fetchInsurance();
  }, []);

  const [addFormData, setAddFormData] = useState({
    company: "",
    policyNo: "",
    expiry: "",
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
          const ins = data.insurance || [];
          ins.push(addFormData);
          data.insurance = ins;
          
          const hash = await uploadJSONToPinata(data);
          
          await mycontract.methods.addPatient(hash).send({ from: currentaddress });
          setCookie('hash', hash);
          alert("Insurance Added");
          window.location.reload();
          break;
        }
      }
    } catch (error) {
      console.error("Error adding insurance:", error);
      alert("Failed to add insurance. Please try again.");
    }
  }

  async function del(policy) {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const currentaddress = accounts[0];

      const patientCIDs = await mycontract.methods.getPatient().call();
      
      for (let i = patientCIDs.length - 1; i >= 0; i--) {
        if (patientCIDs[i] === cookies['hash']) {
          const data = await getFromIPFS(patientCIDs[i]);
          const alls = data.insurance || [];
          const newList = alls.filter(item => item.policyNo !== policy);
          
          data.insurance = newList;
          const hash = await uploadJSONToPinata(data);
          
          await mycontract.methods.addPatient(hash).send({ from: currentaddress });
          setCookie('hash', hash);
          alert("Insurance deleted");
          window.location.reload();
          break;
        }
      }
    } catch (error) {
      console.error("Error deleting insurance:", error);
      alert("Failed to delete insurance. Please try again.");
    }
  }

  function showInsurances() {
    if (insurances.length > 0 && Array.isArray(insurances[0])) {
      return insurances[0].map((data, index) => {
        if (data && data.company) {
          return (
            <tr key={index}>
              <td>{data.company}</td>
              <td>{data.policyNo}</td>
              <td>{data.expiry}</td>
              <td>
                <input type="button" value="Delete" onClick={() => del(data.policyNo)} />
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
                  <th className="">Company</th>
                  <th className="">Policy Number</th>
                  <th className="">Expiry</th>
                  <th className="">Actions</th>
                </tr>
              </thead>
              <tbody>
                {showInsurances()}
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
            <h2>Add an Insurance</h2>
            <input
              type="text"
              name="company"
              required="required"
              placeholder="Company"
              onChange={handleAddFormChange}
            />
            <input
              type="text"
              name="policyNo"
              required="required"
              placeholder="Policy No."
              onChange={handleAddFormChange}
            />
            <input
              type="text"
              name="expiry"
              required="required"
              placeholder="Expiry Date"
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

export default Insurance;