import React, { useState, useEffect } from "react";
import Web3 from "web3";
import Navbar from "../components/Navbar";
import Sidebar2 from "../components/Sidebar2";
import Footer from "../components/Footer";
import contract from "../contracts/contract.json";
import { useCookies } from "react-cookie";
import { getFromIPFS } from "../services/pinata-service";

const PatientHistory = () => {
    const [cookies, setCookies] = useCookies(['hash']);
    const [treatmentHistory, setTreatmentHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortBy, setSortBy] = useState("date"); // Default sort by date
    
    useEffect(() => {
        const fetchTreatmentHistory = async () => {
            try {
                setIsLoading(true);
                
                if (!cookies['hash']) {
                    setError("Your session data couldn't be found. Please log in again.");
                    return;
                }
                
                // Get doctor data
                const data = await getFromIPFS(cookies['hash']);
                
                if (!data) {
                    throw new Error("Failed to retrieve doctor data");
                }
                
                // Get treatment history
                const history = data.treatmentHistory || [];
                
                // Sort treatment history based on selected criteria
                sortHistoryList(history);
                
                setTreatmentHistory(history);
            } catch (error) {
                console.error("Error fetching treatment history:", error);
                setError("Failed to load treatment history: " + error.message);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchTreatmentHistory();
    }, [cookies, sortBy]);
    
    // Function to sort treatment history
    const sortHistoryList = (historyList) => {
        switch(sortBy) {
            case "date":
                // Sort by treatment date (most recent first)
                return historyList.sort((a, b) => new Date(b.treatmentDate) - new Date(a.treatmentDate));
            case "name":
                // Sort alphabetically by patient name
                return historyList.sort((a, b) => a.patientName.localeCompare(b.patientName));
            default:
                return historyList;
        }
    };
    
    // Function to handle sort change
    const handleSortChange = (newSortBy) => {
        setSortBy(newSortBy);
    };
    
    // Format date for display
    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString("en-US", {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return dateString;
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
                    <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Patient Treatment History</h1>
                    
                    {isLoading ? (
                        <div className="p-4">Loading treatment history...</div>
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
                                    <option value="date">Treatment Date</option>
                                    <option value="name">Patient Name</option>
                                </select>
                            </div>
                            
                            {treatmentHistory.length === 0 ? (
                                <div className="p-4 text-center">No treatment history found</div>
                            ) : (
                                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                                    <thead>
                                        <tr>
                                            <th style={{ padding: "8px", borderBottom: "1px solid #ddd", textAlign: "left" }}>Patient Name</th>
                                            <th style={{ padding: "8px", borderBottom: "1px solid #ddd", textAlign: "left" }}>Email</th>
                                            <th style={{ padding: "8px", borderBottom: "1px solid #ddd", textAlign: "left" }}>Treatment Date</th>
                                            <th style={{ padding: "8px", borderBottom: "1px solid #ddd", textAlign: "left" }}>Appointment Info</th>
                                            <th style={{ padding: "8px", borderBottom: "1px solid #ddd", textAlign: "left" }}>Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {treatmentHistory.map((record, index) => (
                                            <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                                                <td style={{ padding: "8px" }}>{record.patientName}</td>
                                                <td style={{ padding: "8px" }}>{record.patientEmail}</td>
                                                <td style={{ padding: "8px" }}>{formatDate(record.treatmentDate)}</td>
                                                <td style={{ padding: "8px" }}>{record.appointmentInfo}</td>
                                                <td style={{ padding: "8px" }}>{record.notes}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
                
                <Footer />
            </div>
        </div>
    );
};

export default PatientHistory;