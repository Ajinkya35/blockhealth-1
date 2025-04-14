import React, { useState, useEffect } from "react";
import Web3 from "web3";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import contract from "../contracts/contract.json";
import { useCookies } from "react-cookie";
import { WEB3_PROVIDER, IPFS_GATEWAY } from "../config/ipfs-config";
import { uploadJSONToPinata, getFromIPFS } from "../services/pinata-service";

const Doctors = () => {
    const [cookies, setCookie] = useCookies();
    const [doctors, setDoc] = useState([]);
    const web3 = new Web3(new Web3.providers.HttpProvider(WEB3_PROVIDER));
    const mycontract = new web3.eth.Contract(
        contract["abi"],
        contract["address"]
    );

    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const doctorCIDs = await mycontract.methods.getDoctor().call();
                const doctorList = [];
                
                for (let i = 0; i < doctorCIDs.length; i++) {
                    try {
                        const data = await getFromIPFS(doctorCIDs[i]);
                        data.hash = doctorCIDs[i];
                        doctorList.push(data);
                    } catch (error) {
                        console.error(`Error fetching doctor data for CID ${doctorCIDs[i]}:`, error);
                    }
                }
                
                setDoc(doctorList);
            } catch (error) {
                console.error("Error fetching doctors:", error);
            }
        };
        
        fetchDoctors();
    }, []);

    async function add(hash) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const currentaddress = accounts[0];

            const patientCIDs = await mycontract.methods.getPatient().call();
            
            for (let i = patientCIDs.length - 1; i >= 0; i--) {
                if (patientCIDs[i] === cookies['hash']) {
                    const patientData = await getFromIPFS(patientCIDs[i]);
                    const selectedDoctors = patientData.selectedDoctors || [];
                    
                    if (!selectedDoctors.includes(hash)) {
                        selectedDoctors.push(hash);
                        patientData.selectedDoctors = selectedDoctors;
                        
                        const newHash = await uploadJSONToPinata(patientData);
                        
                        await mycontract.methods.addPatient(newHash).send({ from: currentaddress });
                        setCookie('hash', newHash);
                        alert("Doctor added successfully");
                        window.location.reload();
                    } else {
                        alert("Doctor already added");
                    }
                    break;
                }
            }
        } catch (error) {
            console.error("Error adding doctor:", error);
            alert("Failed to add doctor. Please try again.");
        }
    }

    function showDoctors() {
        return doctors.map((data, index) => (
            <tr key={index}>
                <td>{data.name}</td>
                <td>{data.mail}</td>
                <td>{data.speciality}</td>
                <td><input type="button" value="Add" onClick={() => add(data.hash)} /></td>
            </tr>
        ));
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
                <div style={{ display: "flex", flexDirection: "column", padding: "1rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", padding: "1rem" }}>
                        <table style={{ borderCollapse: "collapse" }}>
                            <thead>
                                <tr>
                                    <th className="">Name</th>
                                    <th className="">Email</th>
                                    <th className="">Speciality</th>
                                    <th className="">Book Doctor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {showDoctors()}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Doctors;