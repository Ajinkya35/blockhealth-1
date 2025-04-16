import React, { useState, useEffect } from "react";
import Web3 from "web3";
import Navbar from "../components/Navbar";
import Sidebar2 from "../components/Sidebar2";
import Footer from "../components/Footer";
import contract from "../contracts/contract.json";
import { useCookies } from "react-cookie";
import { getFromIPFS } from "../services/pinata-service";

const PatientHistory = () => {
    const [cookies, setCookies] = useCookies(['hash', 'treatedPatients']);
    const [treatedPatients, setTreatedPatients] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentAccount, setCurrentAccount] = useState("");
    const [showPatientDetails, setShowPatientDetails] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);

    useEffect(() => {
        const init = async () => {
            try {
                await connectWallet();
                fetchTreatedPatients();
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
            return accounts[0];
        } catch (error) {
            console.error("Wallet connection error:", error);
            setError("Failed to connect wallet: " + error.message);
            throw error;
        }
    };

    const fetchTreatedPatients = () => {
        try {
            // Get treated patients from cookies
            const treatedPatientsList = cookies.treatedPatients || [];
            setTreatedPatients(treatedPatientsList);
        } catch (error) {
            console.error("Error fetching treated patients:", error);
            setError("Failed to load treated patients history");
        }
    };

    const viewDetails = (patient) => {
        setSelectedPatient(patient);
        setShowPatientDetails(true);
    };

    const closePatientDetails = () => {
        setSelectedPatient(null);
        setShowPatientDetails(false);
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

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
                    <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Patient Treatment History</h2>
                    
                    {isLoading ? (
                        <div className="p-4">Loading treatment history...</div>
                    ) : error ? (
                        <div className="p-4 text-red-500">{error}</div>
                    ) : treatedPatients.length === 0 ? (
                        <div className="p-4">No treatment history found. Patients marked as treated will appear here.</div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", padding: "1rem" }}>
                            <table style={{ borderCollapse: "collapse", width: "100%" }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: "8px", borderBottom: "1px solid #ddd", textAlign: "left" }}>Patient Name</th>
                                        <th style={{ padding: "8px", borderBottom: "1px solid #ddd", textAlign: "left" }}>Email</th>
                                        <th style={{ padding: "8px", borderBottom: "1px solid #ddd", textAlign: "left" }}>Treatment Date</th>
                                        <th style={{ padding: "8px", borderBottom: "1px solid #ddd", textAlign: "left" }}>Reason</th>
                                        <th style={{ padding: "8px", borderBottom: "1px solid #ddd", textAlign: "left" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {treatedPatients.map((patient, index) => (
                                        <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                                            <td style={{ padding: "8px" }}>{patient.name}</td>
                                            <td style={{ padding: "8px" }}>{patient.mail}</td>
                                            <td style={{ padding: "8px" }}>{formatDate(patient.treatmentDate)}</td>
                                            <td style={{ padding: "8px" }}>{patient.reason || "General checkup"}</td>
                                            <td style={{ padding: "8px" }}>
                                                <button 
                                                    type="button" 
                                                    onClick={() => viewDetails(patient)}
                                                    style={{ 
                                                        padding: "5px 10px", 
                                                        backgroundColor: "#4285F4", 
                                                        color: "white", 
                                                        border: "none", 
                                                        borderRadius: "5px", 
                                                        cursor: "pointer" 
                                                    }}
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                
                <Footer />
            </div>

            {/* Patient Details Modal */}
            {showPatientDetails && selectedPatient && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "8px",
                        padding: "15px",
                        width: "500px",
                        maxWidth: "90%",
                        maxHeight: "80vh",
                        overflowY: "auto",
                        boxShadow: "0 4px 8px rgba(0,0,0,0.2)"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                            <h2 style={{ fontSize: "1.2rem", color: "#008B8B", margin: 0 }}>
                                Patient Treatment Details
                            </h2>
                            <button 
                                onClick={closePatientDetails}
                                style={{ 
                                    background: "none", 
                                    border: "none", 
                                    fontSize: "1.5rem", 
                                    cursor: "pointer" 
                                }}
                            >
                                &times;
                            </button>
                        </div>
                        
                        <hr style={{ margin: "0 0 10px 0" }} />
                        
                        <div style={{ marginBottom: "20px" }}>
                            <h3 style={{ fontSize: "1.1rem", marginBottom: "10px" }}>Patient Information</h3>
                            <p><strong>Name:</strong> {selectedPatient.name}</p>
                            <p><strong>Email:</strong> {selectedPatient.mail}</p>
                            <p><strong>Treatment Date:</strong> {formatDate(selectedPatient.treatmentDate)}</p>
                        </div>

                        <div style={{ marginBottom: "20px" }}>
                            <h3 style={{ fontSize: "1.1rem", marginBottom: "10px" }}>Treatment Details</h3>
                            <p><strong>Reason:</strong> {selectedPatient.reason || "General checkup"}</p>
                            <p><strong>Notes:</strong> {selectedPatient.notes || "No notes provided"}</p>
                        </div>
                        
                        <button 
                            onClick={closePatientDetails}
                            style={{ 
                                width: "100%",
                                padding: "8px",
                                backgroundColor: "#008B8B",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.9rem",
                                marginTop: "10px"
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientHistory;