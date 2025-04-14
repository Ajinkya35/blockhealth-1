import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Sidebar2 from "../components/Sidebar2";
import Footer from "../components/Footer";
import { useCookies } from 'react-cookie';
import Web3 from "web3";
import contract from '../contracts/contract.json';
import { WEB3_PROVIDER } from "../config/ipfs-config";
import { getFromIPFS, uploadJSONToPinata } from "../services/pinata-service";

const MyProfileDoc = () => {
  const [cookies, setCookie] = useCookies();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [licenseno, setLicenseno] = useState("");
  const [disabled, setDisabled] = useState(true);

  const web3 = new Web3(new Web3.providers.HttpProvider(WEB3_PROVIDER));
  const mycontract = new web3.eth.Contract(
    contract["abi"],
    contract["address"]
  );

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (cookies['hash']) {
          const data = await getFromIPFS(cookies['hash']);
          setName(data.name || "");
          setEmail(data.mail || "");
          setPassword(data.password || "");
          setLicenseno(data.license || "");
        }
      } catch (error) {
        console.error("Error fetching doctor profile:", error);
      }
    };
    
    fetchProfile();
  }, [cookies['hash']]);

  function handleGameClick() {
    setDisabled(!disabled);
  }

  async function save() {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const currentaddress = accounts[0];

      const doctorCIDs = await mycontract.methods.getDoctor().call();
      
      for (let i = doctorCIDs.length - 1; i >= 0; i--) {
        if (doctorCIDs[i] === cookies['hash']) {
          const data = await getFromIPFS(doctorCIDs[i]);
          
          // Update fields
          data.name = name;
          data.mail = email;
          data.password = password;
          data.license = licenseno;
          
          const newHash = await uploadJSONToPinata(data);
          
          await mycontract.methods.addDoctor(newHash).send({ from: currentaddress });
          setCookie('hash', newHash);
          setCookie('name', name);
          setCookie('mail', email);
          
          alert("Profile updated successfully");
          window.location.reload();
          break;
        }
      }
    } catch (error) {
      console.error("Error saving doctor profile:", error);
      alert("Failed to save profile. Please try again.");
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
        <div className="flex justify-center m-10 ">
          <form className="p-5 bg-slate-100 rounded-lg">
            <h1 className="text-center text-lg">Doctor Profile</h1>

            <div className="py-2">
              <label className="text-black">
                Name:
                <input
                  id="inp"
                  style={{ padding: "10px", margin: "10px", color: "black" }}
                  name="name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={disabled}
                  required />
              </label>
              <input type="button" value="✎" className="text-2xl hover:text-blue-400 cursor-pointer" onClick={handleGameClick}></input>
            </div>

            <div className="py-2">
              <label className="text-black">
                Email:
                <input
                  id="inp"
                  style={{ padding: "10px", margin: "10px" }}
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={disabled}
                  required />
              </label>
              <input type="button" value="✎" className="text-2xl hover:text-blue-400 cursor-pointer" onClick={handleGameClick}></input>
            </div>

            <div className="py-2">
              <label className="text-black">
                Password:
                <input
                  style={{ padding: "10px", margin: "10px" }}
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={disabled}
                  required />
              </label>
              <input type="button" value="✎" className="text-2xl hover:text-blue-400 cursor-pointer" onClick={handleGameClick}></input>
            </div>

            <div className="py-2">
              <label className="text-black">
                License No.:
                <input
                  style={{ padding: "10px", margin: "10px" }}
                  name="licenseno"
                  type="text"
                  value={licenseno}
                  onChange={(e) => setLicenseno(e.target.value)}
                  disabled={disabled}
                  required />
              </label>
              <input type="button" value="✎" className="text-2xl hover:text-blue-400 cursor-pointer" onClick={handleGameClick}></input>
            </div>

            <div className="py-2">
              <input type="button" value="Save" onClick={save} className="bg-cyan-400 text-white font-medium p-3" />
            </div>
          </form>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default MyProfileDoc;