import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Web3 from "web3";
import contract from "../contracts/contract.json";
import { useCookies } from "react-cookie";
import "./Login.css";
import { WEB3_PROVIDER, IPFS_GATEWAY } from "../config/ipfs-config";
import { getFromIPFS } from "../services/pinata-service";

const Login = () => {
    const [type, setType] = useState(false);
    const [cookies, setCookie] = useCookies([]);

    const [log, setLog] = useState({
        mail: "",
        password: ""
    });

    const web3 = new Web3(new Web3.providers.HttpProvider(WEB3_PROVIDER));
    const mycontract = new web3.eth.Contract(
        contract["abi"],
        contract["address"]
    );

    function handle(e) {
        const newData = { ...log };
        newData[e.target.name] = e.target.value;
        setLog(newData);
    }

    async function login(e) {
        await window.ethereum.request({
            method: "eth_requestAccounts",
        });

        if (!e) {
            // Patient login
            try {
                const patientCIDs = await mycontract.methods.getPatient().call();
                
                for (const cid of patientCIDs) {
                    try {
                        const data = await getFromIPFS(cid);
                        
                        if (data.mail === log.mail) {
                            if (data.password === log.password) {
                                setCookie('hash', cid);
                                setCookie('name', data.name);
                                setCookie('mail', data.mail);
                                setCookie('type', 'patient');
                                alert("Logged in successfully!");
                                window.location.href = "/myprofile";
                                return;
                            } else {
                                alert("Incorrect password");
                                return;
                            }
                        }
                    } catch (error) {
                        console.error("Error fetching patient data:", error);
                    }
                }
                alert("No patient account found with this email");
            } catch (error) {
                console.error("Error in patient login:", error);
                alert("Login failed. Please try again.");
            }
        } else {
            // Doctor login
            try {
                const doctorCIDs = await mycontract.methods.getDoctor().call();
                
                for (const cid of doctorCIDs) {
                    try {
                        const data = await getFromIPFS(cid);
                        
                        if (data.mail === log.mail) {
                            if (data.password === log.password) {
                                setCookie('hash', cid);
                                setCookie('name', data.name);
                                setCookie('mail', data.mail);
                                setCookie('type', 'doctor');
                                alert("Logged in successfully!");
                                window.location.href = "/myprofiledoc";
                                return;
                            } else {
                                alert("Incorrect password");
                                return;
                            }
                        }
                    } catch (error) {
                        console.error("Error fetching doctor data:", error);
                    }
                }
                alert("No doctor account found with this email");
            } catch (error) {
                console.error("Error in doctor login:", error);
                alert("Login failed. Please try again.");
            }
        }
    }

    return (
        <div className="login-container bg-gradient-to-r from-cyan-500 to-blue-500 via-teal-200 ">
            <form className="login-form backdrop-blur-lg [ p-8 md:p-10 lg:p-10 ] [ bg-gradient-to-b from-white/60 to-white/30 ] [ border-[1px] border-solid border-white border-opacity-30 ] [ shadow-black/70 shadow-2xl ]">
                <h2 className="login-form-title">Log In</h2>
                <div className="input-container">
                    <div className="input-div">
                        <div className="input-heading">
                            <i className="fas fa-user"></i>
                            <h5>Email</h5>
                        </div>
                        <input
                            onChange={(e) => handle(e)}
                            type="email"
                            placeholder="youremail@gmail.com"
                            id="email"
                            name="mail"
                        />
                    </div>
                    <div className="input-div">
                        <div className="input-heading">
                            <i className="fas fa-lock"></i>
                            <h5>Password</h5>
                        </div>
                        <input
                            onChange={(e) => handle(e)}
                            type="password"
                            placeholder="********"
                            id="password"
                            name="password"
                        />
                    </div>
                    <div className="input-div">
                        <div className="input-heading" style={{ margin: "1rem 0", }}>
                            <i className="fas fa-key"></i>
                            <h5>User Type</h5>
                            <select id="user-type" name="type" onChange={() => { setType(!type) }} style={{ padding: '0.5rem', backgroundColor: 'white' }}>
                                <option value="patient">Patient</option>
                                <option value="doctor">Doctor</option>
                            </select>
                        </div>
                    </div>
                    <p style={{ textAlign: "right" }}>Forgot password?</p>
                </div>

                <input
                    type="button"
                    className="btn"
                    value="Log In"
                    onClick={() => { login(type) }}
                />
                <p style={{ textAlign: "right" }}>Don't have an account?
                    <Link style={{ marginLeft: "4px", color: "black", textDecoration: "underline" }} to='/signup'>Sign Up.</Link>
                </p>
            </form>
        </div>
    );
};

export default Login;