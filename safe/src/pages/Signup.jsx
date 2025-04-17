import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import './Signup.css';
import Web3 from "web3";
import contract from '../contracts/contract.json';
import { uploadJSONToPinata } from "../services/pinata-service";

const Signup = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [currentAccount, setCurrentAccount] = useState('');
    const [type, setType] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [regp, setRegp] = useState({
        "name": "",
        "mail": "",
        "password": "",
        "insurance": [{}],
        "allergies": [{}],
        "medicalhistory": [{}],
        "hospitalizationhistory": [{}],
        "visit": [{}],
        "selectedDoctors": [{}]
    });

    const [regd, setRegd] = useState({
        "name": "",
        "mail": "",
        "password": "",
        "license": "",
        "speciality": ""
    });

    // Check if MetaMask is installed and connected on component mount
    useEffect(() => {
        checkIfWalletIsConnected();
    }, []);

    // Function to check if MetaMask is connected
    const checkIfWalletIsConnected = async () => {
        try {
            // Check if window.ethereum exists
            if (!window.ethereum) {
                console.log("Make sure you have MetaMask installed!");
                return;
            }

            // Check if we're authorized to access the user's wallet
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });

            if (accounts.length !== 0) {
                const account = accounts[0];
                console.log("Found an authorized account:", account);
                setCurrentAccount(account);
                setIsConnected(true);
            } else {
                console.log("No authorized account found");
                setIsConnected(false);
            }
        } catch (error) {
            console.error("Error checking if wallet is connected:", error);
        }
    };

    // Function to connect wallet with error handling
    const connectWallet = async () => {
        try {
            if (!window.ethereum) {
                alert("Please install MetaMask to use this feature!");
                return;
            }

            // Request account access
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            console.log("Connected to account:", accounts[0]);
            setCurrentAccount(accounts[0]);
            setIsConnected(true);

            return accounts[0];
        } catch (error) {
            console.error("Error connecting to MetaMask:", error);
            if (error.code === 4001) {
                // User rejected the request
                alert("You rejected the connection request. Please connect to MetaMask to proceed.");
            } else {
                alert("Failed to connect to MetaMask. Please try again.");
            }
            return null;
        }
    };

    // Email validation function
    const validateEmail = (email) => {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    };

    function handle(e) {
        const newData1 = { ...regp };
        const newData2 = { ...regd };
        newData1[e.target.name] = e.target.value;
        newData2[e.target.name] = e.target.value;

        // Email validation
        if (e.target.name === 'mail') {
            if (!validateEmail(e.target.value) && e.target.value !== '') {
                setEmailError('Please enter a valid email address');
            } else {
                setEmailError('');
            }
        }

        setRegp(newData1);
        setRegd(newData2);
    }

    function handleD(e) {
        const newData = { ...regd };
        newData[e.target.name] = e.target.value;
        setRegd(newData);
    }

    async function register(e) {
        try {
            // Email validation before proceeding
            const emailToCheck = type ? regd.mail : regp.mail;
            if (!validateEmail(emailToCheck)) {
                setEmailError('Please enter a valid email address');
                return;
            }

            // Make sure user is connected to MetaMask
            let currentAddress = currentAccount;
            if (!isConnected) {
                currentAddress = await connectWallet();
                if (!currentAddress) return; // User rejected or connection failed
            }

            // Initialize Web3 with the browser provider (MetaMask)
            const web3 = new Web3(window.ethereum);

            // Validate contract address
            if (!web3.utils.isAddress(contract.address)) {
                console.error("Invalid contract address:", contract.address);
                alert("Invalid contract configuration. Please contact support.");
                return;
            }

            // Create contract instance
            const mycontract = new web3.eth.Contract(
                contract.abi,
                contract.address
            );

            console.log("User type:", type ? "Doctor" : "Patient");

            if (!type) {
                // Register patient
                console.log("Registering patient...");
                console.log("Patient data:", regp);

                const hash = await uploadJSONToPinata(regp);
                console.log("IPFS hash:", hash);

                // Call contract method
                const result = await mycontract.methods.addPatient(hash).send({
                    from: currentAddress,
                    gas: 200000 // Specify gas limit
                });

                console.log("Transaction result:", result);
                alert("Patient account created successfully!");
                window.location.href = "/login";
            } else {
                // Register doctor
                console.log("Registering doctor...");
                console.log("Doctor data:", regd);

                const hash = await uploadJSONToPinata(regd);
                console.log("IPFS hash:", hash);

                // Call contract method
                const result = await mycontract.methods.addDoctor(hash).send({
                    from: currentAddress,
                    gas: 200000 // Specify gas limit
                });

                console.log("Transaction result:", result);
                alert("Doctor account created successfully!");
                window.location.href = "/login";
            }
        } catch (error) {
            console.error("Error in registration:", error);

            // More specific error messages based on error type
            if (error.code === 4001) {
                alert("Transaction rejected by user.");
            } else if (error.message && error.message.includes("User denied")) {
                alert("You rejected the transaction. Please try again.");
            } else if (error.message && error.message.includes("gas")) {
                alert("Transaction failed: Gas estimation failed. Your account may not have enough ETH.");
            } else {
                alert(`Registration failed: ${error.message || "Unknown error"}`);
            }
        }
    }

    return (
        <div className="login-container bg-gradient-to-r from-cyan-500 to-blue-500 via-teal-200 ">
            <form className="login-form backdrop-blur-lg
               [ p-8 md:p-10 lg:p-10 ]
               [ bg-gradient-to-b from-white/60 to-white/30 ]
               [ border-[1px] border-solid border-white border-opacity-30 ]
               [ shadow-black/70 shadow-2xl ]">
                <h2 className="login-form-title">Sign Up</h2>
                {!isConnected && (
                    <div className="metamask-warning">
                        <p>Please connect to MetaMask to register</p>
                        <button
                            type="button"
                            onClick={connectWallet}
                            className="connect-btn"
                            style={{
                                backgroundColor: "#F6851B",
                                color: "white",
                                padding: "8px 16px",
                                borderRadius: "4px",
                                border: "none",
                                marginTop: "10px",
                                cursor: "pointer"
                            }}
                        >
                            Connect Wallet
                        </button>
                    </div>
                )}

                {isConnected && (
                    <div className="metamask-status">
                        <p style={{ fontSize: "0.8rem", color: "green" }}>
                            Connected: {currentAccount.substring(0, 6)}...{currentAccount.substring(38)}
                        </p>
                    </div>
                )}

                <div className="input-container">
                    <div className="input-div">
                        <div className="input-heading">
                            <i className="fas fa-user"></i>
                            <h5>Username</h5>
                        </div>
                        <input name="name" onChange={(e) => handle(e)} id="name" placeholder="Full Name" />
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

                    <div className="input-div">
                        <div className="input-heading">
                            <i className="fas fa-envelope"></i>
                            <h5>Email</h5>
                        </div>
                        <input onChange={(e) => handle(e)} type="mail" placeholder="youremail@gmail.com" id="email" name="mail" />
                        {emailError && <p style={{ color: 'red', fontSize: '0.8rem', margin: '5px 0 0 0' }}>{emailError}</p>}
                    </div>

                    {type &&
                        <div className="input-div" style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div className="input-heading">
                                    <i className="fas fa-suitcase"></i>
                                    <p>Specialization</p>
                                </div>
                                <input onChange={(e) => handleD(e)} type="text" placeholder="Specialization" id="email" name="speciality" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div className="input-heading">
                                    <i className="fas fa-key"></i>
                                    <p>License No.</p>
                                </div>
                                <input onChange={(e) => handleD(e)} type="text" placeholder="License No." id="email" name="license" />
                            </div>
                        </div>
                    }

                    <div className="input-div">
                        <div className="input-heading">
                            <i className="fas fa-lock"></i>
                            <h5>Password</h5>
                        </div>
                        <input onChange={(e) => handle(e)} type="password" placeholder="********" id="password" name="password" />
                    </div>
                </div>

                <input type="button" value="Sign Up" className="btn" onClick={() => { register(type) }} />
                <p style={{ textAlign: "right" }}>Already a user?
                    <Link style={{ marginLeft: "4px", color: "black", textDecoration: "underline" }} to='/login'>Log In.</Link>
                </p>
            </form>
        </div>
    );
};

export default Signup;