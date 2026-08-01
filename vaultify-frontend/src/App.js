import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Welcome from './components/Welcome';
import Signup from './components/Signup';
import Vault from './components/Vault';


function App() {
  const [vault, setVault] = useState([]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginWrapper setVault={setVault} />} />   {/* ✅ default route */}
        <Route path="/login" element={<LoginWrapper setVault={setVault} />} />
        <Route path="/signup" element={<SignupWrapper />} />
        <Route path="/vault" element={<VaultWrapper vault={vault} setVault={setVault} />} />
      </Routes>
    </BrowserRouter>
  );
}

// ✅ Wrapper for Welcome
function LoginWrapper({ setVault }) {
  const navigate = useNavigate();
  return (
    <Welcome 
      onContinue={(data) => {
        setVault(data);
        navigate("/vault"); // 👈 navigate to vault
      }} 
      onSignup={() => navigate("/signup")} // 👈 navigate to signup
    />
  );
}

// ✅ Wrapper for Signup
function SignupWrapper() {
  const navigate = useNavigate();
  return (
    <Signup onBack={() => navigate("/login")} /> // 👈 navigate back to login
  );
}

// ✅ Wrapper for Vault
function VaultWrapper({ vault, setVault }) {
  const navigate = useNavigate();
  return (
    <Vault 
      vault={vault} 
      onLogout={() => {
        setVault([]);
        navigate("/login"); // 👈 navigate back to login
      }} 
    />
  );
}

export default App;
