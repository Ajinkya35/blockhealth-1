import React, { useState, useEffect } from "react";
import Web3 from "web3";
import Navbar from "../components/Navbar";
import Sidebar2 from "../components/Sidebar2";
import contract from "../contracts/contract.json";
import { useCookies } from "react-cookie";
import { WEB3_PROVIDER } from "../config/ipfs-config";
import { uploadJSONToPinata, getFromIPFS } from "../services/pinata-service";

const Patients = () => {
    const web3 = new Web3(new Web3.providers.HttpProvider(WEB3_PROVIDER));
    const mycontract = new web3.eth.Contract(
        contract["abi"],
        contract["address"]
    );
    const [patients, setPatients] = useState([]);
    const [cookies, setCookies] = useCookies();

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const patientCIDs = await mycontract.methods.getPatient().call();
                const patientList = [];
                const visitedEmails = new Set();
                
                for (let i = patientCIDs.length - 1; i >= 0; i--) {
                    try {
                        const data = await getFromIPFS(patientCIDs[i]);
                        
                        if (!visitedEmails.has(data.mail) && 
                            data.selectedDoctors && 
                            data.selectedDoctors.includes(cookies['hash'])) {
                            
                            visitedEmails.add(data.mail);
                            data.hash = patientCIDs[i];
                            patientList.push(data);
                        }
                    } catch (error) {
                        console.error(`Error fetching patient data for CID ${patientCIDs[i]}:`, error);
                    }
                }
                
                setPatients(patientList);
            } catch (error) {
                console.error("Error fetching patients:", error);
            }
        };
        
        fetchPatients();
    }, []);

    function view(phash) {
        window.location.href = `/patientData/${phash}`;
    }

    async function treated(phash) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const currentaddress = accounts[0];
            
            const data = await getFromIPFS(phash);
            const selectedDoctors = data.selectedDoctors || [];
            
            // Remove this doctor from the patient's selected doctors list
            const newSelectedDoctors = selectedDoctors.filter(docHash => docHash !== cookies['hash']);
            data.selectedDoctors = newSelectedDoctors;
            
            const newHash = await uploadJSONToPinata(data);
            
            await mycontract.methods.addPatient(newHash).send({ from: currentaddress });
            alert("Patient removed from your list");
            window.location.reload();
        } catch (error) {
            console.error("Error marking patient as treated:", error);
            alert("Failed to update patient status. Please try again.");
        }
    }

    function showPatients() {
        return patients.map((patient, index) => {
            if (patient?.name) {
                return (
                    <tr key={index}>
                        <td>{patient.name}</td>
                        <td>{patient.mail}</td>
                        <td>
                            <input type="button" value="View" onClick={() => view(patient.hash)} />
                        </td>
                        <td>
                            <input type="button" value="Treated" onClick={() => treated(patient.hash)} />
                        </td>
                    </tr>
                );
            }
            return null;
        });
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
                <div style={{ display: "flex", flexDirection: "column", padding: "1rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", padding: "1rem" }}>
                        <table style={{ borderCollapse: "collapse" }}>
                            <thead>
                                <tr>
                                    <th className="">Name</th>
                                    <th className="">Email</th>
                                    <th className="">Details</th>
                                    <th className="">Treated?</th>
                                </tr>
                            </thead>
                            <tbody>
                                {showPatients()}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Patients;