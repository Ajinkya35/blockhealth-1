import React, { useState, useEffect } from "react";
import Web3 from "web3";
import Navbar from "../components/Navbar";
import Sidebar2 from "../components/Sidebar2";
import Footer from "../components/Footer";
import contract from "../contracts/contract.json";
import { useCookies } from "react-cookie";
import { uploadJSONToPinata, getFromIPFS } from "../services/pinata-service";

const Patients = () => {
    const [cookies, setCookies] = useCookies(['hash']);
    const [patients, setPatients] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentAccount, setCurrentAccount] = useState("");
    const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [sortBy, setSortBy] = useState("date"); // Default sort by date

    useEffect(() => {
        const init = async () => {
            try {
                await connectWallet();
                await fetchPatients();
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

    const fetchPatients = async () => {
        try {
            setIsLoading(true);
            
            if (!cookies['hash']) {
                console.warn("No hash found in cookies");
                setError("Your session data couldn't be found. Please log in again.");
                return;
            }
            
            // Use a web3 instance connected to the browser provider
            const web3 = new Web3(window.ethereum);
            const mycontract = new web3.eth.Contract(
                contract["abi"],
                contract["address"]
            );
            
            const patientCIDs = await mycontract.methods.getPatient().call();
            const patientList = [];
            const visitedEmails = new Set();
            
            console.log("Fetching patients for doctor hash:", cookies['hash']);
            
            for (let i = patientCIDs.length - 1; i >= 0; i--) {
                try {
                    const data = await getFromIPFS(patientCIDs[i]);
                    
                    if (!data) continue;
                    
                    if (!visitedEmails.has(data.mail) && 
                        data.selectedDoctors && 
                        data.selectedDoctors.includes(cookies['hash'])) {
                        
                        visitedEmails.add(data.mail);
                        data.hash = patientCIDs[i];
                        
                        // Format appointment data if it exists
                        if (data.appointments && data.appointments.length > 0) {
                            data.formattedAppointments = data.appointments.filter(
                                app => app.doctorHash === cookies['hash']
                            );
                            
                            // Add the next appointment date and priority information
                            if (data.formattedAppointments.length > 0) {
                                // Sort appointments by date (newest first)
                                data.formattedAppointments.sort((a, b) => {
                                    return new Date(b.date) - new Date(a.date);
                                });
                                
                                data.nextAppointment = data.formattedAppointments[0];
                                
                                // Calculate priority based on appointment date
                                const appointmentDate = new Date(data.nextAppointment.date);
                                const today = new Date();
                                const daysDifference = Math.round((appointmentDate - today) / (1000 * 60 * 60 * 24));
                                
                                // Set priority level
                                if (daysDifference < 0) {
                                    data.priority = "past";
                                    data.priorityLabel = "Past";
                                } else if (daysDifference === 0) {
                                    data.priority = "today";
                                    data.priorityLabel = "Today";
                                } else if (daysDifference <= 3) {
                                    data.priority = "upcoming";
                                    data.priorityLabel = "Soon";
                                } else {
                                    data.priority = "scheduled";
                                    data.priorityLabel = "Scheduled";
                                }
                            } else {
                                data.priority = "none";
                                data.priorityLabel = "No Appointment";
                            }
                        } else {
                            data.formattedAppointments = [];
                            data.priority = "none";
                            data.priorityLabel = "No Appointment";
                        }
                        
                        patientList.push(data);
                    }
                } catch (error) {
                    console.error(`Error fetching patient data for CID ${patientCIDs[i]}:`, error);
                }
            }
            
            // Sort the patient list based on the current sort criteria
            sortPatientList(patientList);
            
            setPatients(patientList);
        } catch (error) {
            console.error("Error fetching patients:", error);
            setError("Failed to load patients: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Function to sort patients based on selected criteria
    const sortPatientList = (patientList) => {
        switch(sortBy) {
            case "date":
                // Sort by appointment date (upcoming first, then today, then past)
                return patientList.sort((a, b) => {
                    const priorityOrder = { today: 0, upcoming: 1, scheduled: 2, past: 3, none: 4 };
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                });
            case "name":
                // Sort alphabetically by name
                return patientList.sort((a, b) => a.name.localeCompare(b.name));
            case "priority":
                // Sort by explicit priority (could be used if you add a custom priority field)
                const priorityOrder = { high: 0, medium: 1, low: 2, none: 3 };
                return patientList.sort((a, b) => {
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                });
            default:
                return patientList;
        }
    };

    // Function to handle sort change
    const handleSortChange = (newSortBy) => {
        setSortBy(newSortBy);
        const sortedPatients = [...patients];
        sortPatientList(sortedPatients);
        setPatients(sortedPatients);
    };

    const view = (phash) => {
        window.location.href = `/patientData/${phash}`;
    };

    const showAppointments = (patient) => {
        setSelectedPatient(patient);
        setShowAppointmentDetails(true);
    };

    const closeAppointmentDetails = () => {
        setSelectedPatient(null);
        setShowAppointmentDetails(false);
    };

    const treated = async (phash) => {
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
            
            // Get patient data
            const data = await getFromIPFS(phash);
            
            if (!data) {
                throw new Error("Failed to retrieve patient data");
            }
            
            // Remove this doctor from the patient's selected doctors list
            const selectedDoctors = data.selectedDoctors || [];
            const newSelectedDoctors = selectedDoctors.filter(docHash => docHash !== cookies['hash']);
            data.selectedDoctors = newSelectedDoctors;
            
            // Mark appointments as completed
            if (data.appointments && data.appointments.length > 0) {
                data.appointments = data.appointments.map(app => {
                    if (app.doctorHash === cookies['hash']) {
                        return { ...app, status: 'completed' };
                    }
                    return app;
                });
            }
            
            console.log("Updating patient data with:", data);
            
            // Upload updated data
            const newHash = await uploadJSONToPinata(data);
            
            console.log("New IPFS hash:", newHash);
            
            // Update blockchain
            const result = await mycontract.methods.addPatient(newHash).send({ 
                from: address,
                gas: 200000 
            });
            
            console.log("Transaction result:", result);
            
            alert("Patient marked as treated");
            
            // Refresh patients list
            fetchPatients();
        } catch (error) {
            console.error("Error marking patient as treated:", error);
            alert("Failed to update patient status: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Function to get priority color
    const getPriorityColor = (priority) => {
        switch(priority) {
            case "today":
                return "#ff4d4d"; // Red
            case "upcoming":
                return "#ffaa00"; // Orange
            case "scheduled":
                return "#4CAF50"; // Green
            case "past":
                return "#999999"; // Gray
            case "none":
            default:
                return "#999999"; // Gray
        }
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
                    {isLoading ? (
                        <div className="p-4">Loading patients data...</div>
                    ) : error ? (
                        <div className="p-4 text-red-500">{error}</div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", padding: "1rem" }}>
                            {/* Sort Controls */}
                            <div style={{ marginBottom: "20px", display: "flex", alignItems: "center" }}>
                                <span style={{ marginRight: "10px", fontWeight: "bold" }}>Sort by:</span>
                                <select 
                                    value={sortBy}
                                    onChange={(e) => handleSortChange(e.target.value)}
                                    style={{
                                        padding: "5px 10px",
                                        borderRadius: "4px",
                                        border: "1px solid #ddd"
                                    }}
                                >
                                    <option value="date">Appointment Date</option>
                                    <option value="name">Name</option>
                                    <option value="priority">Priority</option>
                                </select>
                            </div>
                            
                            <table style={{ borderCollapse: "collapse", width: "100%" }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: "8px", borderBottom: "1px solid #ddd", textAlign: "left" }}>Name</th>
                                        <th style={{ padding: "8px", borderBottom: "1px solid #ddd", textAlign: "left" }}>Email</th>
                                        <th style={{ padding: "8px", borderBottom: "1px solid #ddd", textAlign: "left" }}>Priority</th>
                                        <th style={{ padding: "8px", borderBottom: "1px solid #ddd", textAlign: "left" }}>Next Appointment</th>
                                        <th style={{ padding: "8px", borderBottom: "1px solid #ddd", textAlign: "left" }}>Appointment</th>
                                        <th style={{ padding: "8px", borderBottom: "1px solid #ddd", textAlign: "left" }}>Details</th>
                                        <th style={{ padding: "8px", borderBottom: "1px solid #ddd", textAlign: "left" }}>Treated?</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {patients.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: "center", padding: "8px" }}>No patients found</td>
                                        </tr>
                                    ) : (
                                        patients.map((patient, index) => (
                                            patient?.name && (
                                                <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                                                    <td style={{ padding: "8px" }}>{patient.name}</td>
                                                    <td style={{ padding: "8px" }}>{patient.mail}</td>
                                                    <td style={{ padding: "8px" }}>
                                                        <span style={{
                                                            display: "inline-block",
                                                            padding: "3px 8px",
                                                            backgroundColor: getPriorityColor(patient.priority),
                                                            color: "white",
                                                            borderRadius: "12px",
                                                            fontSize: "0.8rem"
                                                        }}>
                                                            {patient.priorityLabel}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: "8px" }}>
                                                        {patient.nextAppointment ? (
                                                            <div>
                                                                <div>{patient.nextAppointment.date}</div>
                                                                <div>{patient.nextAppointment.time}</div>
                                                            </div>
                                                        ) : (
                                                            <span>N/A</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: "8px" }}>
                                                        {patient.formattedAppointments && patient.formattedAppointments.length > 0 ? (
                                                            <button 
                                                                type="button" 
                                                                onClick={() => showAppointments(patient)}
                                                                style={{ 
                                                                    padding: "5px 10px", 
                                                                    backgroundColor: "#FFA500", 
                                                                    color: "white", 
                                                                    border: "none", 
                                                                    borderRadius: "5px", 
                                                                    cursor: "pointer" 
                                                                }}
                                                            >
                                                                View Appointment
                                                            </button>
                                                        ) : (
                                                            <span>No appointments</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: "8px" }}>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => view(patient.hash)}
                                                            disabled={isLoading}
                                                            style={{ 
                                                                padding: "5px 10px", 
                                                                backgroundColor: "#4285F4", 
                                                                color: "white", 
                                                                border: "none", 
                                                                borderRadius: "5px", 
                                                                cursor: "pointer" 
                                                            }}
                                                        >
                                                            View
                                                        </button>
                                                    </td>
                                                    <td style={{ padding: "8px" }}>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => treated(patient.hash)}
                                                            disabled={isLoading}
                                                            style={{ 
                                                                padding: "5px 10px", 
                                                                backgroundColor: "#4CAF50", 
                                                                color: "white", 
                                                                border: "none", 
                                                                borderRadius: "5px", 
                                                                cursor: "pointer" 
                                                            }}
                                                        >
                                                            Treated
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                
                <Footer />
            </div>

            {/* Appointment Details Modal */}
            {showAppointmentDetails && selectedPatient && (
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
                        width: "400px",
                        maxWidth: "90%",
                        maxHeight: "80vh",
                        overflowY: "auto",
                        boxShadow: "0 4px 8px rgba(0,0,0,0.2)"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                            <h2 style={{ fontSize: "1.2rem", color: "#008B8B", margin: 0 }}>
                                Appointment Details
                            </h2>
                            <button 
                                onClick={closeAppointmentDetails}
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
                        
                        <div style={{ marginBottom: "10px" }}>
                            <p style={{ fontWeight: "bold", margin: "0 0 5px 0" }}>Patient: {selectedPatient.name}</p>
                        </div>
                        
                        {selectedPatient.formattedAppointments && selectedPatient.formattedAppointments.length > 0 ? (
                            selectedPatient.formattedAppointments.map((app, idx) => (
                                <div key={idx} style={{ 
                                    padding: "10px", 
                                    marginBottom: "10px", 
                                    backgroundColor: "#f8f9fa",
                                    borderRadius: "5px",
                                    border: "1px solid #dee2e6"
                                }}>
                                    <p style={{ margin: "0 0 5px 0" }}><strong>Date:</strong> {app.date}</p>
                                    <p style={{ margin: "0 0 5px 0" }}><strong>Time:</strong> {app.time}</p>
                                    <p style={{ margin: "0 0 5px 0" }}><strong>Reason:</strong> {app.reason || "Not specified"}</p>
                                    <p style={{ margin: "0 0 5px 0" }}><strong>Status:</strong> {app.status || "Scheduled"}</p>
                                </div>
                            ))
                        ) : (
                            <p>No appointment details available</p>
                        )}
                        
                        <button 
                            onClick={closeAppointmentDetails}
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

export default Patients;