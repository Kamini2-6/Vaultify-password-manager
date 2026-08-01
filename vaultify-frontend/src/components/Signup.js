import React, { useState, useEffect } from "react";
import "./Signup.css";
import { deriveKeys, encryptData} from "../Utils/crypto";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Link } from "react-router-dom";


function Signup({ onBack }) {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [genMessage, setGenMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [qrCode, setQrCode] = useState("");

  // Email regex for validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const strongPasswordRegex =
    /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  useEffect(() => {
    console.log("Password State:", newPassword);
  }, [newPassword]);

  // Generate password
function generatePassword() {
  const length = 12;

  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&";

  let password = "";

  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  setNewPassword(password);
  setShowPassword(true);
  setGenMessage("Strong password generated ✅");
  setTimeout(() => setGenMessage(""), 3000);
}

  const handleSignup = async () => {
    const newErrors = {};
    if (!email) {
      newErrors.email = "Field is required.";
    }
    else if (!emailRegex.test(email)) {
      newErrors.email = "Please enter a valid email.";
    }

    if (!newPassword) newErrors.password = "Field is required.";
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    try {
      if (!strongPasswordRegex.test(newPassword)) {
        alert("Password must be at least 8 characters long and include a capital letter, number, and special character.");
        return;
      }

      // Step 1: Signup request
      const response = await fetch("http://localhost:5000/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, authKeyHash: "" }),
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error || "Signup failed");
        return;
      }

      // Step 2: Derive authKeyHash from password + salt

      const { authKeyHash , encryptionKey} = await deriveKeys(newPassword, data.salt);

      await fetch("http://localhost:5000/update-auth", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, authKeyHash }),
      });

      // Step 3: Encrypt empty vault initially
const { ciperHex, ivHex } = await encryptData(encryptionKey, JSON.stringify([]));

// Save vault + iv + salt in DB
await fetch("http://localhost:5000/update-vault", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, vault: ciperHex, ivHex, salt: data.salt }),
});

      localStorage.setItem("salt", data.salt);


      // Step 3: Show QR code for 2FA setup
      if (data.qrCode) {
        setQrCode(data.qrCode);
        alert("Scan QR in Google Authenticator and enter OTP to verify.");
      }
    } catch (err) {
      console.error("Signup error:", err);
      alert("Server error, please try again.");
    }
  };

  return (
    <div className="welcome-page">
      {genMessage && (
        <div className="notification-fixed">
          <p>{genMessage}</p>
        </div>
      )}

      <header className="welcome-header">
        <h2 style={{ margin: 0 }}>
          <span style={{ color: "green" }}>&lt;</span>
          <span>VAULTI</span>
          <span style={{ color: "green" }}>FY</span>
          <span style={{ color: "green" }}>/&gt;</span>
        </h2>
      </header>

      <div className="welcome-box">
        <h2 className="app-title">
          <span style={{ color: "green" }}>Create </span>
          <span style={{ color: "green" }}> Your </span>
          <span style={{ color: "green" }}>&lt;</span>
          <span>VAULTI</span>
          <span style={{ color: "green" }}>FY</span>
          <span style={{ color: "green" }}>/&gt;</span>
          <span style={{ color: "green" }}> Account </span>
        </h2>
        <p className="tagline">Secure your digital world! </p>

        {/* Username-Email */}
        <div className="input-field">
          <input
            type="text"
            placeholder="Enter Your valid Email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors({ ...errors, email: "" });
            }}
            className={errors.email ? "input-error" : ""}
          />
          {errors.email && (
            <>
              <span className="input-error-icon">!</span>
              <span className="error-message">{errors.email}</span>
            </>
          )}
        </div>

        {/* Password */}
        <div className="password-field">
          <input
            type={showPassword ? "text" : "password"}
            value={newPassword}
            placeholder="Enter New Password"
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (errors.password) setErrors({ ...errors, password: "" });
            }}
            className={errors.password ? "input-error" : ""}
          />

          {/* Eye icon for show/hide */}
          <span className="eye-icon" onClick={() => setShowPassword(!showPassword)} title={showPassword ? "Hide Password" : "Show Password"}>
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </span>

          {/* Copy icon */}
          <span className="copy-icon" onClick={() => {
            navigator.clipboard.writeText(newPassword);
            setGenMessage("Password copied to clipboard ✅");
            setTimeout(() => setGenMessage(""), 3000);
          }} title="Copy Password">
            📋
          </span>

          {errors.password && (
            <>
              <span className="input-error-icon">!</span>
              <span className="error-message">{errors.password}</span>
            </>
          )}
        </div>

        {/* Generate Password */}
        <div>
          <button type="button" 
          className="btn-secondary"
           onClick={generatePassword}>
            Generate Password
          </button>
        </div>
        <br />

        {/* Signup */}
        <button
          type="button"
          className="btn-primary signup-btn"
          onClick={handleSignup}>
          Sign Up
        </button>


        {/* QR  */}
        {qrCode && (
          <div className="qr-section">
            <img src={qrCode} alt="Scan QR for 2FA" />
            <p>Use this QR in your Authenticator app. OTP will be required at login.</p>
          </div>
        )}


        <Link to="/login" className="btn-link">
          Back to Login
        </Link>
      </div>
    </div>
  );
}

export default Signup;
