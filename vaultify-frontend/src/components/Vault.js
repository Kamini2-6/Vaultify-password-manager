import React, { useState, useEffect } from "react";
import sha1 from "crypto-js/sha1";

// --- Utility: Breach check using HIBP k-anonymity ---
async function checkPasswordBreach(password) {
  const hash = sha1(password).toString().toUpperCase();
  const prefix = hash.substring(0, 5);
  const suffix = hash.substring(5);

  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  const data = await response.text();

  const lines = data.split("\n");
  const found = lines.find(line => line.startsWith(suffix));

  if (found) {
    const count = parseInt(found.split(":")[1], 10);
    return { breached: true, count };
  } else {
    return { breached: false };
  }
}


// Utility functions
async function deriveTwoKeys(masterPassword, salt) {
  const enc = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(masterPassword),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const encryptionKey = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  return { encryptionKey };
}

function toBase64(uint8Array) {
  return btoa(String.fromCharCode(...uint8Array));
}

function fromBase64(base64) {
  return new Uint8Array(atob(base64).split("").map(c => c.charCodeAt(0)));
}

async function encryptVault(vaultData, vaultKey) {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const cipher = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    vaultKey,
    enc.encode(JSON.stringify(vaultData))
  );

  return {
    cipher: toBase64(new Uint8Array(cipher)), // base64 string
    iv: toBase64(iv),                         // base64 string
  };
}

async function decryptVault(cipherBase64, ivBase64, key) {
  const dec = new TextDecoder();
  const cipher = fromBase64(cipherBase64);
  const iv = fromBase64(ivBase64);

  const plain = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipher
  );
  return JSON.parse(dec.decode(plain));
}

function Vault({ onLogout }) {
  const [site, setSite] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [logins, setLogins] = useState([]);
  const [vaultKey, setVaultKey] = useState(null);
  const [unlocked, setUnlocked] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [notification, setNotification] = useState("");
  const [confirmIndex, setConfirmIndex] = useState(null);


  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(""); // 3 seconds baad auto hide
    }, 3000);
  };


  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://localhost:5000/vault", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        window.vaultData = data;
      })
      .catch(() => alert("Failed to load vault"));
  }, []);

  useEffect(() => {
    const savedLogins = localStorage.getItem("vaultLogins");
    if (savedLogins) {
      setLogins(JSON.parse(savedLogins));
    }
  }, []);

  // ✅ New useEffect for auto-lock
  useEffect(() => {
    let timer;
    if (unlocked) {
      timer = setTimeout(() => {
        setUnlocked(false);
        setVaultKey(null);
        setLogins([]);
        alert("Vault locked due to inactivity. Please re-enter your Master Password.");
      }, 5 * 60 * 1000); // 5 minutes inactivity
    }
    return () => clearTimeout(timer);
  }, [unlocked]);


  const handleUnlock = async (masterPassword) => {
    try {
      const { vault, iv, salt } = window.vaultData;
      const { encryptionKey } = await deriveTwoKeys(masterPassword, salt);
      setVaultKey(encryptionKey);

       // If vault is empty, just unlock with empty array
    if (!vault || !iv) {
      setLogins([]);
      setUnlocked(true);
      localStorage.setItem("vaultLogins", JSON.stringify([]));
      return;
    }

      const decryptedVault = await decryptVault(vault, iv, encryptionKey);
      setLogins(decryptedVault || []);
      setUnlocked(true);
      localStorage.setItem("vaultLogins", JSON.stringify(decryptedVault));
    } catch (err) {
      console.error("Unlock error:", err);
      alert("Vault could not be decrypted. Please check your Master Password.");
    }
  };

  const handleAddLogin = async () => {
    if (site && username && password) {
      const token = localStorage.getItem("token");

      if (!token || !vaultKey) {
        alert("Vault key not available. Please Login again.");
        return;
      }

      // Breach check
      const result = await checkPasswordBreach(password);
      const newLogin = {
        site,
        username,
        password,
        show: false,
        breach: result.breached
          ? `⚠️ Found in ${result.count} breaches`
          : "✅ Safe",
      };

      const updatedLogins = [...logins, newLogin];
      setLogins(updatedLogins);

      // Encrypt and save to backend
      const { cipher, iv } = await encryptVault(updatedLogins, vaultKey);
      await fetch("http://localhost:5000/vault", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vault: cipher, iv, salt: window.vaultData.salt }),
      });

      showNotification("Password added successfully!");
      setSite("");
      setUsername("");
      setPassword("");
    } else {
      alert("Please fill all fields");
    }
  };

  const handleDelete = async (index) => {
    const token = localStorage.getItem("token");
    if (!token || !vaultKey) {
      alert("Vault key not available. Please Login again.");
      return;
    }
    showNotification("Password deleted successfully!");

    const updatedLogins = logins.filter((_, i) => i !== index);
    setLogins(updatedLogins);

    const { cipher, iv } = await encryptVault(updatedLogins, vaultKey);

    await fetch("http://localhost:5000/vault", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ vault: cipher, iv, salt: window.vaultData.salt }),
    });
  };

  const togglePassword = (index) => {
    const updated = [...logins];
    updated[index].show = !updated[index].show;
    setLogins(updated);
  };

  const handleLogout = async () => {
    localStorage.removeItem("vaultLogins");
    setUnlocked(false);
    setVaultKey(null);
    setLogins([]);
    window.vaultData = null;
    onLogout();
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard ✅");
    } catch (err) {
      alert("Failed to copy ❌");
      console.error("Copy error:", err);
    }
  };


  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* Vault UI (blurred when locked) */}
      <div
        style={{
          textAlign: "center",
          backgroundColor: "#c4d0ca",
          minHeight: "100vh",
          filter: unlocked ? "none" : "blur(6px)",
          pointerEvents: unlocked ? "auto" : "none",
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
            onClick={handleLogout}
            style={{
              background: "red",
              border: "none",
              padding: "10px 20px",
              cursor: "pointer",
              borderRadius: "5px",
              color: "white",
            }}
          >
            Logout
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
            placeholder="Enter website URL"
            value={site}
            onChange={(e) => setSite(e.target.value)}
            style={{ margin: "10px", padding: "10px", width: "250px" }}
          />
          <input
            type="text"
            placeholder="Enter Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ margin: "10px", padding: "10px", width: "250px" }}
          />
          <input
            type="password"
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ margin: "10px", padding: "10px", width: "250px" }}
          />
          <br />
          <button
            onClick={handleAddLogin}
            style={{
              background: "green",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Add Password
          </button>
        </div>

        {/* Vault Table */}
        <h2>Your Vault</h2>
        <table
          style={{
            width: "80%",
            margin: "20px auto",
            borderCollapse: "collapse",
            boxShadow: "0px 4px 10px rgba(0,0,0,0.2)",
          }}
        >
          <thead style={{ background: "#457b9d", color: "white" }}>
            <tr>
              <th>Site</th>
              <th>Username</th>
              <th>Password</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {logins.map((login, index) => (
              <tr key={index}>
                <td>{login.site}</td>
                <td>{login.username}</td>
                <td>
                  {login.show ? login.password : "*".repeat(login.password.length)}
                  <button
                    onClick={() => togglePassword(index)}
                    style={{
                      marginLeft: "10px",
                      background: "#63d1f0",
                      border: "none",
                      padding: "5px 10px",
                      borderRadius: "5px",
                      cursor: "pointer",
                    }}
                  >
                    {login.show ? "Hide" : "Show"}
                  </button>
                </td>
                <td>{login.breach || "Checking..."}</td>
                <td>
                  {/* Copy button */}
                  <button
                    onClick={() => handleCopy(login.password)}
    style={{ marginRight: "8px" }}
  >
    Copy
  </button>

  <button
    onClick={() => setConfirmIndex(index)}
    style={{ background: "orange", color: "white" }}
  >
    Delete
  </button>

  {/* Confirmation only shows inline, not replacing buttons */}
  {confirmIndex === index && (
    <span style={{ marginLeft: "10px" }}>
      <button
        onClick={() => handleDelete(index)}
        style={{ background: "red", color: "white", marginRight: "5px" }}
      >
        Confirm
      </button>
      <button
        onClick={() => setConfirmIndex(null)}
        style={{ background: "grey", color: "white" }}
      >
        Cancel
      </button>
    </span>
  )}
                </td>
              </tr>
            ))}
            {logins.length === 0 && (
              <tr>
                <td colSpan="5">No passwords added yet</td>
              </tr>
            )}
          </tbody>

        </table>
      </div>

      {/* Unlock overlay */}
      {
        !unlocked && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "rgba(255,255,255,0.9)",
              padding: "30px",
              borderRadius: "10px",
              boxShadow: "0px 4px 20px rgba(0,0,0,0.3)",
              textAlign: "center",

            }}
          >
            <h2>Unlock Your Vault</h2>
            <input
              type="password"
              id="masterPass"
              placeholder="Enter Master Password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              style={{ padding: "10px", width: "250px", marginBottom: "15px" }}
            />

            <br />
            <button
              onClick={() =>
                handleUnlock(masterPassword)
              }
              style={{
                background: "green",
                color: "white",
                padding: "10px 20px",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Unlock
            </button>
          </div>
        )
      }
      {
        notification && (
          <div
            style={{
              position: "fixed",
              bottom: "20px",
              right: "20px",
              background: "#4caf50",
              color: "white",
              padding: "10px 20px",
              borderRadius: "5px",
              boxShadow: "0px 4px 10px rgba(0,0,0,0.3)",
            }}
          >
            {notification}
          </div>
        )
      }
    </div >
  );
}

export default Vault;
