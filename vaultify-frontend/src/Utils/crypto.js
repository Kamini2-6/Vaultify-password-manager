// Convert hex string to Uint8Array
function hexToBytes(hex) {
  return Uint8Array.from(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
}

// Convert Uint8Array to hex string
function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Derive both keys (Auth + Encryption)
export async function deriveKeys(password, saltHex) {
  const enc = new TextEncoder();
  const salt = hexToBytes(saltHex);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  // Derive 512 bits → split into two 256-bit keys
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    baseKey,
    512
  );

  const bytes = new Uint8Array(derivedBits);
  const authKeyBytes = bytes.slice(0, 32);
  const encKeyBytes = bytes.slice(32);

  // Auth Key → SHA-256 hash
  const authKeyHashBuffer = await crypto.subtle.digest("SHA-256", authKeyBytes);
  const authKeyHash = bytesToHex(new Uint8Array(authKeyHashBuffer));

  // Encryption Key → AES-GCM
  const encryptionKey = await crypto.subtle.importKey(
    "raw",
    encKeyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );

  return { authKeyHash, encryptionKey };
}

// Encrypt vault data
export async function encryptData(encryptionKey, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    encryptionKey,
    encoded
  );

  return {
    cipherHex: bytesToHex(new Uint8Array(cipherBuffer)),
    ivHex: bytesToHex(iv),
  };
}

// Decrypt vault data
export async function decryptData(encryptionKey, cipherHex, ivHex) {
  try {
    const ciphertext = hexToBytes(cipherHex);
    const iv = hexToBytes(ivHex);

    const plainBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      encryptionKey,
      ciphertext
    );

    return new TextDecoder().decode(plainBuffer);
  } catch (err) {
    console.error("Decryption failed:", err);
    return null;
  }
}
