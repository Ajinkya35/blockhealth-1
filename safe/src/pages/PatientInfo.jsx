import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useCookies } from "react-cookie";

import Navbar from "../components/Navbar";
import Sidebar2 from "../components/Sidebar2";
import Footer from "../components/Footer";
import Web3 from "web3";
import { getFromIPFS } from "../services/pinata-service";

const PatientInfo = () => {
    const { phash } = useParams();
    const [patient, setPatient] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPatient = async () => {
            try {
                setIsLoading(true);
                
                if (!phash) {
                    throw new Error("No patient hash provided");
                }
                
                console.log("Fetching patient data for hash:", phash);
                
                // Get patient data directly
                const data = await getFromIPFS(phash);
                
                if (!data) {
                    throw new Error("Failed to retrieve patient data");
                }
                
                console.log("Retrieved patient data:", data);
                
                // Set patient data
                setPatient(data);
            } catch (error) {
                console.error("Error fetching patient data:", error);
                setError("Failed to load patient data: " + error.message);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchPatient();
    }, [phash]);

    const renderTable = (title, headers, data, renderRow) => {
        return (
            <div style={{ display: "flex", flexDirection: "column", padding: "1rem" }}>
                <h1 style={{ fontSize: '2rem' }}>{title}</h1>
                <table style={{ borderCollapse: "collapse", width: "100%", marginTop: "10px" }}>
                    <thead>
                        <tr>
                            {headers.map((header, index) => (
                                <th key={index} style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data && data.length > 0 ? (
                            data.map((item, index) => renderRow(item, index))
                        ) : (
                            <tr>
                                <td colSpan={headers.length} style={{ textAlign: "center", padding: "8px" }}>
                                    No records found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
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
                
                {isLoading ? (
                    <div className="p-4">Loading patient data...</div>
                ) : error ? (
                    <div className="p-4 text-red-500">{error}</div>
                ) : patient ? (
                    <div style={{ display: "flex", flexDirection: "column", padding: "1rem" }}>
                        <div className="p-4 mb-4 bg-blue-50 rounded-lg">
                            <h1 className="text-xl font-bold mb-2">Patient: {patient.name}</h1>
                            <p className="text-gray-600">Email: {patient.mail}</p>
                        </div>
                        
                        {renderTable(
                            "Insurance",
                            ["Company", "Policy No.", "Expiry"],
                            patient.insurance,
                            (item, index) => (
                                item.company && (
                                    <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                                        <td style={{ padding: "8px" }}>{item.company}</td>
                                        <td style={{ padding: "8px" }}>{item.policyNo}</td>
                                        <td style={{ padding: "8px" }}>{item.expiry}</td>
                                    </tr>
                                )
                            )
                        )}
                        
                        {renderTable(
                            "Allergies",
                            ["Name", "Type", "Medication"],
                            patient.allergies,
                            (item, index) => (
                                item.name && (
                                    <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                                        <td style={{ padding: "8px" }}>{item.name}</td>
                                        <td style={{ padding: "8px" }}>{item.type}</td>
                                        <td style={{ padding: "8px" }}>{item.medication}</td>
                                    </tr>
                                )
                            )
                        )}
                        
                        {renderTable(
                            "Medical History",
                            ["Disease", "Diagnosed Date", "Status"],
                            patient.medicalhistory,
                            (item, index) => (
                                item.disease && (
                                    <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                                        <td style={{ padding: "8px" }}>{item.disease}</td>
                                        <td style={{ padding: "8px" }}>{item.time}</td>
                                        <td style={{ padding: "8px" }}>{item.solved}</td>
                                    </tr>
                                )
                            )
                        )}
                        
                        {renderTable(
                            "Hospitalization History",
                            ["Admitted On", "Discharged On", "Reason", "Surgery"],
                            patient.hospitalizationhistory,
                            (item, index) => (
                                item.datefrom && (
                                    <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                                        <td style={{ padding: "8px" }}>{item.datefrom}</td>
                                        <td style={{ padding: "8px" }}>{item.dateto}</td>
                                        <td style={{ padding: "8px" }}>{item.reason}</td>
                                        <td style={{ padding: "8px" }}>{item.surgery}</td>
                                    </tr>
                                )
                            )
                        )}
                        
                        {renderTable(
                            "Checkup History",
                            ["Name Of Professional", "Date Of Visit", "Reason"],
                            patient.visit,
                            (item, index) => (
                                item.name && (
                                    <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                                        <td style={{ padding: "8px" }}>{item.name}</td>
                                        <td style={{ padding: "8px" }}>{item.date}</td>
                                        <td style={{ padding: "8px" }}>{item.reason}</td>
                                    </tr>
                                )
                            )
                        )}
                    </div>
                ) : (
                    <div className="p-4">No patient data found</div>
                )}
                
                <Footer />
            </div>
        </div>
    );
};

export default PatientInfo;