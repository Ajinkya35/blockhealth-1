import React, { useState, useEffect } from "react";
import Web3 from "web3";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import contract from "../contracts/contract.json";
import { useCookies } from "react-cookie";
import { uploadJSONToPinata, getFromIPFS } from "../services/pinata-service";

const Doctors = () => {
    const [cookies, setCookie] = useCookies(['hash']);
    const [doctors, setDoctors] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentAccount, setCurrentAccount] = useState("");
    const [showAppointmentForm, setShowAppointmentForm] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [appointmentDate, setAppointmentDate] = useState("");
    const [appointmentTime, setAppointmentTime] = useState("");
    const [appointmentReason, setAppointmentReason] = useState("");

    // Available time slots in 24-hour format
    const timeSlots = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"];

    useEffect(() => {
        const init = async () => {
            try {
                await connectWallet();
                await fetchDoctors();
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

    const fetchDoctors = async () => {
        try {
            setIsLoading(true);
            
            // Use a web3 instance connected to the browser provider
            const web3 = new Web3(window.ethereum);
            const mycontract = new web3.eth.Contract(
                contract["abi"],
                contract["address"]
            );
            
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
            
            setDoctors(doctorList);
        } catch (error) {
            console.error("Error fetching doctors:", error);
            setError("Failed to load doctors: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const openAppointmentForm = (doctor) => {
        setSelectedDoctor(doctor);
        setShowAppointmentForm(true);
    };

    const closeAppointmentForm = () => {
        setShowAppointmentForm(false);
        setSelectedDoctor(null);
        setAppointmentDate("");
        setAppointmentTime("");
        setAppointmentReason("");
    };

    const handleDateChange = (e) => {
        setAppointmentDate(e.target.value);
    };

    const handleTimeChange = (time) => {
        setAppointmentTime(time);
    };

    const submitAppointment = async () => {
        try {
            if (!appointmentDate || !appointmentTime) {
                alert("Please select both date and time for the appointment");
                return;
            }

            setIsLoading(true);
            
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
            const patientData = await getFromIPFS(cookies['hash']);
            
            if (!patientData) {
                throw new Error("Failed to retrieve patient data");
            }
            
            // Update selected doctors list
            const selectedDoctors = patientData.selectedDoctors || [];
            
            if (selectedDoctors.includes(selectedDoctor.hash)) {
                alert("Doctor already added");
                closeAppointmentForm();
                return;
            }
            
            // Add appointment info
            const appointments = patientData.appointments || [];
            appointments.push({
                doctorHash: selectedDoctor.hash,
                doctorName: selectedDoctor.name,
                date: appointmentDate,
                time: appointmentTime,
                reason: appointmentReason
            });
            
            // Update patient data
            selectedDoctors.push(selectedDoctor.hash);
            patientData.selectedDoctors = selectedDoctors;
            patientData.appointments = appointments;
            
            // Upload updated data
            const newHash = await uploadJSONToPinata(patientData);
            
            // Update blockchain
            const result = await mycontract.methods.addPatient(newHash).send({ 
                from: address,
                gas: 200000 
            });
            
            // Update cookie with new hash
            setCookie('hash', newHash, { path: '/' });
            
            alert("Appointment booked successfully");
            closeAppointmentForm();
        } catch (error) {
            console.error("Error booking appointment:", error);
            alert("Failed to book appointment: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Get current date in YYYY-MM-DD format for min attribute
    const today = new Date().toISOString().split('T')[0];
    
    // Generate dates for the next 7 days
    const generateNextSevenDays = () => {
        const days = [];
        const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            days.push({
                date: date.toISOString().split('T')[0],
                day: dayNames[date.getDay()],
                dayOfMonth: date.getDate()
            });
        }
        
        return days;
    };
    
    const nextSevenDays = generateNextSevenDays();

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
                    {isLoading ? (
                        <div className="p-4">Loading doctors data...</div>
                    ) : error ? (
                        <div className="p-4" style={{ color: "red" }}>{error}</div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", padding: "1rem" }}>
                            <table style={{ borderCollapse: "collapse", width: "100%" }}>
                                <thead>
                                    <tr>
                                        <th className="">Name</th>
                                        <th className="">Email</th>
                                        <th className="">Speciality</th>
                                        <th className="">Appoint Doctor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {doctors.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" style={{ textAlign: "center" }}>No doctors found</td>
                                        </tr>
                                    ) : (
                                        doctors.map((data, index) => (
                                            <tr key={index}>
                                                <td>{data.name}</td>
                                                <td>{data.mail}</td>
                                                <td>{data.speciality}</td>
                                                <td>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => openAppointmentForm(data)}
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
                                                        Appoint Doctor
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <Footer />
            </div>

            {/* Appointment Form Modal - Compact Version */}
            {showAppointmentForm && selectedDoctor && (
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
                        width: "400px", // Reduced width
                        maxWidth: "90%",
                        maxHeight: "80vh", // Maximum height constraint
                        overflowY: "auto", // Add scrolling if needed
                        boxShadow: "0 4px 8px rgba(0,0,0,0.2)"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                            <h2 style={{ fontSize: "1.2rem", color: "#008B8B", margin: 0 }}>
                                Book Appointment
                            </h2>
                            <button 
                                onClick={closeAppointmentForm}
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
                            <label style={{ display: "block", marginBottom: "3px", fontWeight: "bold", fontSize: "0.9rem" }}>Doctor</label>
                            <input 
                                type="text" 
                                value={selectedDoctor.name} 
                                readOnly
                                style={{ 
                                    width: "100%", 
                                    padding: "6px", 
                                    border: "1px solid #ddd", 
                                    borderRadius: "4px",
                                    fontSize: "0.9rem"
                                }} 
                            />
                        </div>
                        
                        <div style={{ marginBottom: "10px" }}>
                            <label style={{ display: "block", marginBottom: "3px", fontWeight: "bold", fontSize: "0.9rem" }}>Speciality</label>
                            <input 
                                type="text" 
                                value={selectedDoctor.speciality || "General"} 
                                readOnly
                                style={{ 
                                    width: "100%", 
                                    padding: "6px", 
                                    border: "1px solid #ddd", 
                                    borderRadius: "4px",
                                    fontSize: "0.9rem"
                                }} 
                            />
                        </div>
                        
                        <div style={{ marginBottom: "10px" }}>
                            <label style={{ display: "block", marginBottom: "3px", fontWeight: "bold", fontSize: "0.9rem" }}>Appointment Date</label>
                            <input 
                                type="date" 
                                min={today}
                                value={appointmentDate}
                                onChange={handleDateChange}
                                style={{ 
                                    width: "100%", 
                                    padding: "6px", 
                                    border: "1px solid #ddd", 
                                    borderRadius: "4px",
                                    fontSize: "0.9rem"
                                }}
                                required
                            />
                        </div>
                        
                        <div style={{ marginBottom: "10px" }}>
                            <label style={{ display: "block", marginBottom: "3px", fontWeight: "bold", fontSize: "0.9rem" }}>Next 7 Days</label>
                            <div style={{ 
                                display: "flex", 
                                justifyContent: "space-between", 
                                overflowX: "auto", 
                                padding: "5px 0"
                            }}>
                                {nextSevenDays.map((day, idx) => (
                                    <div 
                                        key={idx} 
                                        onClick={() => setAppointmentDate(day.date)}
                                        style={{ 
                                            display: "flex", 
                                            flexDirection: "column", 
                                            alignItems: "center", 
                                            cursor: "pointer",
                                            padding: "4px 6px",
                                            borderRadius: "4px",
                                            backgroundColor: appointmentDate === day.date ? "#008B8B" : "#f0f0f0",
                                            color: appointmentDate === day.date ? "white" : "black",
                                            fontSize: "0.8rem",
                                            margin: "0 2px"
                                        }}
                                    >
                                        <span style={{ fontWeight: "bold" }}>{day.day}</span>
                                        <span>{day.dayOfMonth}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div style={{ marginBottom: "10px" }}>
                            <label style={{ display: "block", marginBottom: "3px", fontWeight: "bold", fontSize: "0.9rem" }}>Appointment Time</label>
                            <div style={{ 
                                display: "grid", 
                                gridTemplateColumns: "repeat(4, 1fr)", 
                                gap: "5px"
                            }}>
                                {timeSlots.map((time, idx) => (
                                    <div 
                                        key={idx}
                                        onClick={() => handleTimeChange(time)}
                                        style={{ 
                                            padding: "4px", 
                                            textAlign: "center",
                                            border: "1px solid #ddd",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                            backgroundColor: appointmentTime === time ? "#008B8B" : "white",
                                            color: appointmentTime === time ? "white" : "black",
                                            fontSize: "0.9rem"
                                        }}
                                    >
                                        {time}
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div style={{ marginBottom: "15px" }}>
                            <label style={{ display: "block", marginBottom: "3px", fontWeight: "bold", fontSize: "0.9rem" }}>Reason for Visit</label>
                            <textarea
                                value={appointmentReason}
                                onChange={(e) => setAppointmentReason(e.target.value)}
                                style={{ 
                                    width: "100%", 
                                    padding: "6px", 
                                    border: "1px solid #ddd", 
                                    borderRadius: "4px",
                                    minHeight: "60px",
                                    fontSize: "0.9rem"
                                }}
                                placeholder="Please describe your symptoms or reason"
                            ></textarea>
                        </div>
                        
                        <button 
                            onClick={submitAppointment}
                            disabled={isLoading || !appointmentDate || !appointmentTime}
                            style={{ 
                                width: "100%",
                                padding: "8px",
                                backgroundColor: "#008B8B",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.9rem",
                                opacity: isLoading || !appointmentDate || !appointmentTime ? 0.7 : 1
                            }}
                        >
                            {isLoading ? "Booking..." : "Book Appointment"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Doctors;