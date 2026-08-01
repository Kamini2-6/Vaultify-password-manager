# Vaultify-password-manager
Vaultify is a web-based password manager built on Zero-Knowledge Architecture.  It ensures that user data remains encrypted client-side using PBKDF2 key derivation  and AES-256-GCM encryption. The backend acts only as a dumb storage locker, while  all cryptographic operations happen in the browser via the Web Crypto API. 

---

## 🚀 Features
- **Zero-Knowledge Security** – Master Password never leaves the browser.
- **Client-Side Cryptography** – PBKDF2 key derivation, AES‑256‑GCM encryption/decryption.
- **Authentication** – Auth Key derived from Master Password for login.
- **Vault Management** – Add, view, and manage accounts securely.
- **Password Generator** – Generate strong random passwords.
- **Auto-Lock** – Clears decrypted data after inactivity.
- **Two-Factor Authentication (2FA)** – TOTP integration for extra security.
- **Breach Report** – Check usernames against breach databases (HIBP k‑Anonymity).

---

## 🛠️ Tech Stack
- **Frontend:** React.js, Redux, CSS
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL / MongoDB
- **Cryptography:** Web Crypto API, PBKDF2, AES‑256‑GCM, SHA‑256
- **Authentication:** JWT, TOTP (otplib)

---

## 📂 Project Structure

vaultify/
│── vaultify-backend/
│   ├── server.js
│   ├── package.json
│   ├── .env
│   └── node_modules/
│
│── vaultify-frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.js
│   │   │   ├── Login.css
│   │   │   ├── Signup.js
│   │   │   ├── Signup.css
│   │   │   ├── Vault.js
│   │   │   └── Welcome.js
│   │   │   ├── Welcome.css
│   │   ├── Utils/crypto.js
│   │   ├── App.js
│   │   └── index.js
│   ├── public/
│   └── package.json
│
│── docs/
│   ├── architecture-diagram.png
│   └── threat-model.md
│
│── README.md
│── .gitignore



---

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Kamini2-6/vaultify-password-manager.git
cd Vaultify-password-manager

2. Backend Setup
cd vaultify-backend
npm install
# Add your environment variables in .env
npm start


3. Frontend Setup
cd vaultify-frontend
npm install
npm start


🔑 Usage Flow
User enters Master Password.

PBKDF2 derives:

Auth Key → sent to server for login.

Encryption Key → used locally to encrypt/decrypt vault.

Encrypted vault blob stored in backend DB.

Decryption happens only in browser → server never sees plaintext.

🧪 Demo & Sanity Check
View Raw Data button shows encrypted gibberish stored in DB/state.

Password Generator creates strong random strings.

Auto-Lock clears vault after inactivity.


🛡️ Threat Model
Forgot Master Password?  
→ Data is lost forever. This is a feature, not a bug, ensuring no one (not even admins) can recover your vault without your key.

Server Breach?  
→ Attackers only get encrypted blobs, useless without Master Password.

Auth Key Leak?  
→ 2FA ensures vault cannot be downloaded without TOTP.
