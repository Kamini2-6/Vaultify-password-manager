import React, { useState } from "react";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // अभी demo के लिए password को authKeyHash मान रहे हैं
        body: JSON.stringify({ username, authKeyHash: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Error case → popup दिखाओ
        alert(data.error || "Login failed");
        return;
      }

      // Success case → token save करो
      localStorage.setItem("token", data.token);
      alert("Login successful!");
      // यहां vault page पर redirect कर सकते हैं
      // window.location.href = "/vault";
    } catch (err) {
      alert("Server error, please try again.");
    }
  };

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        textAlign: "center",
        backgroundColor: "#c4d0ca",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <header
        style={{
          background: "#434d65",
          padding: "10px",
          color: "white",
          border: "2px solid white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ margin: 0 }}>
          <span style={{ color: "green" }}>&lt;</span>
          <span style={{ color: "white" }}>VAULTI</span>
          <span style={{ color: "green" }}>FY</span>
          <span style={{ color: "green" }}>/&gt;</span>
        </h3>
        <button
          style={{
            background: "#63d1f0",
            border: "none",
            padding: "10px 20px",
            cursor: "pointer",
            borderRadius: "5px",
          }}
        >
          GitHub
        </button>
      </header>

      {/* Subheading */}
      <h2 style={{ marginTop: "30px" }}>
        <span style={{ color: "green" }}>&lt;</span>
        <span style={{ color: "black" }}>VAULTI</span>
        <span style={{ color: "green" }}>FY</span>
        <span style={{ color: "green" }}>/&gt;</span>
      </h2>
      <h3>Your Zero-Knowledge Password Manager</h3>

      {/* Input fields */}
      <div style={{ marginTop: "30px" }}>
        <input
          type="text"
          placeholder="Enter Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ margin: "10px", padding: "10px", width: "250px" }}
        />
        <input
          type="password"
          placeholder="Enter Master Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ margin: "10px", padding: "10px", width: "250px" }}
        />
        <br />
        <button
          onClick={handleLogin}
          style={{
            background: "green",
            color: "white",
            padding: "10px 20px",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Login
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
