const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0));
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: bytesToArrayBuffer(salt),
      iterations: 250000,
      hash: "SHA-256"
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptText(message: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: bytesToArrayBuffer(iv)
    },
    key,
    encoder.encode(message)
  );

  return [
    "ghostdm:v1",
    bytesToBase64(salt),
    bytesToBase64(iv),
    bytesToBase64(new Uint8Array(encrypted))
  ].join(":");
}

export async function decryptText(payload: string, passphrase: string): Promise<string> {
  const parts = payload.split(":");

  if (parts.length !== 5 || parts[0] !== "ghostdm" || parts[1] !== "v1") {
    throw new Error("Invalid GhostDM payload");
  }

  const salt = base64ToBytes(parts[2]);
  const iv = base64ToBytes(parts[3]);
  const ciphertext = base64ToBytes(parts[4]);

  const key = await deriveKey(passphrase, salt);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: bytesToArrayBuffer(iv)
    },
    key,
    bytesToArrayBuffer(ciphertext)
  );

  return decoder.decode(decrypted);
}

export function isGhostPayload(text: string): boolean {
  return text.trim().startsWith("ghostdm:v1:");
}
