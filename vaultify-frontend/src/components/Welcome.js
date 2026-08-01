import React, { useState } from 'react';
import './Welcome.css';
import { deriveKeys } from '../Utils/crypto';

function Welcome({ onContinue, onSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
   const [otp, setOtp] = useState(""); 
  const [errors, setErrors] = useState({});

  const handleLogin = async () => {
    const newErrors = {};
    if (!email) newErrors.email = "Field is required.";
    if (!password) newErrors.password = "Field is required.";
    if (!otp) newErrors.otp = "OTP is required.";

    setErrors(newErrors);

    // agar errors hain to backend call mat karo
    if (Object.keys(newErrors).length > 0) return;

    try {
      const salt = localStorage.getItem("salt");
      if (!salt) {
        setErrors({ general: "No salt found. Please signup first." });
        return;
      }

      const { authKeyHash, encryptionKey } = await deriveKeys(password, salt);

      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, authKeyHash ,otp}),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrors({ general: data.error || "Login failed" });
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("vault", data.vault || "");
      localStorage.setItem("iv", data.iv || "");
      localStorage.setItem("salt", data.salt);

      onContinue({ ...data, encryptionKey });
    } catch (err) {
      setErrors({ general: "Network error, please try again." });
    }
  };

  return (
    <div className="welcome-page">
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
          <span style={{ color: "green" }}>Welcome</span>{" "}
          <span style={{ color: "blue" }}>To</span>{" "}
          <span style={{ color: "black" }}>Vaulti</span>
          <span style={{ color: "green" }}>fy</span>
        </h2>

        <p className="tagline">Your Zero-Knowledge Password Manager</p>

        <br />
{/* Email */}
        <div className="input-wrapper">
          <input
            type="text"
            placeholder="Enter your valid Email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors({ ...errors, email: "" });
            }}
          />
          {errors.email && <span className="error-message">{errors.email}</span>}
        </div>


         {/* Password */}
        <div className="input-wrapper">
          <input
            type="password"
            placeholder="Enter Master Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors({ ...errors, password: "" });
            }}
          />
          {errors.password && <span className="error-message">{errors.password}</span>}
        </div>

        {/* OTP */}
        <div className="input-wrapper">
          <input
            type="text"
            placeholder="Enter OTP from Authenticator"
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value);
              if (errors.otp) setErrors({ ...errors, otp: "" });
            }}
          />
          {errors.otp && <span className="error-message">{errors.otp}</span>}
        </div>


        <button onClick={handleLogin}>Login</button>

        {errors.general && <p style={{ color: "red" }}>{errors.general}</p>}
        <p>
          Don't have any account?{" "}
          <button
            onClick={onSignup}
            style={{ color: "blue", background: "none", border: "none", textDecoration: "underline", cursor: "pointer" }}
          >
            Create now
          </button>
        </p>

      </div>
    </div>
  );
}

export default Welcome;
