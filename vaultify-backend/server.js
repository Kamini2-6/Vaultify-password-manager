import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";


dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB connect using dotenv
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// User schema
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  authKeyHash: String,
  vault: { type: String, default: "" }, // store vault as hex string
  iv: { type: String, default: "" },    // store IV as hex string
  salt: String,
  otpSecret: String,
});

const User = mongoose.model("User", userSchema);

// Signup route

import speakeasy from "speakeasy";
import qrcode from "qrcode";

app.post("/signup", async (req, res) => {
  try {
    const { email, authKeyHash } = req.body;

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "User already exists" });
    }

    const salt = crypto.randomBytes(16).toString("hex");

    // Generate TOTP secret per user
    const secret = speakeasy.generateSecret({ length: 20 });

    const user = new User({
      email,
      authKeyHash,
      vault: "",
      iv: "",
      salt,
      otpSecret: secret.base32,
    });

    await user.save();

    // Generate QR code for authenticator app
    qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
      if (err) return res.status(500).json({ error: "QR generation failed" });

      res.json({
        success: true,
        message: "Signup successful. Scan QR in your Authenticator app.",
        qrCode: data_url,  
        salt, // frontend show karega
      });
    });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ error: "Signup failed" });
  }
});


app.put("/update-auth", async (req, res) => {
  const { email, authKeyHash } = req.body;
  try {
    const user = await User.findOneAndUpdate(
      { email },
      { authKeyHash },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, message: "AuthKey updated" });
  } catch (err) {
    console.error("Update auth error:", err.message);
    res.status(500).json({ error: "Failed to update authKey" });
  }
});


// Login route
app.post("/login", async (req, res) => {
  try {
    const { email, authKeyHash, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found. Please signup first!" });
    }

    if (user.authKeyHash !== authKeyHash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify OTP
    const verified = speakeasy.totp.verify({
      secret: user.otpSecret,
      encoding: "base32",
      token: otp,
      window: 1   // allow ±30 sec drift
    });

    if (!verified) {
      return res.status(401).json({ error: "Invalid OTP" });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({
      success: true,
      token,
      vault: user.vault,
      iv: user.iv,
      salt: user.salt,
      message: "Login successful",
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Login failed" });
  }
});


// Middleware
function authMiddleware(req, res, next) {
  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Vault routes
app.get("/vault", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      vault: user.vault || "",
      iv: user.iv || "",
      salt: user.salt,
    });
  } catch (err) {
    console.error("Vault GET error:", err.message);
    res.status(500).json({ error: "Failed to fetch vault" });
  }
});

app.put("/vault", authMiddleware, async (req, res) => {
  try {
    const { vault, iv } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { vault, iv },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      message: "Vault updated",
      vault: updatedUser.vault,
      iv: updatedUser.iv,
      salt: updatedUser.salt,
    });
  } catch (err) {
    console.error("Vault update error:", err.message);
    res.status(500).json({ error: "Failed to update vault" });
  }
});

app.listen(process.env.PORT || 5000, () =>
  console.log(`Server running on port ${process.env.PORT || 5000}`)
);
