const encoder = new TextEncoder();
const decoder = new TextDecoder();

const PAIRING_PREFIX = "ghostdm-pair:v1:";
const PAYLOAD_PREFIX = "ghostdm:v2";

export type GhostIdentity = {
  privateKey: JsonWebKey;
  publicKey: JsonWebKey;
  fingerprint: string;
};

export type PairingPublicKey = {
  kty: "EC";
  crv: "P-256";
  x: string;
  y: string;
};

function bytesToBase64Url(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(base64url: string): Uint8Array {
  const base64 = base64url.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return combined;
}

function compareBytes(a: Uint8Array, b: Uint8Array): number {
  const length = Math.min(a.byteLength, b.byteLength);

  for (let index = 0; index < length; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }

  return a.byteLength - b.byteLength;
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", bytesToArrayBuffer(bytes));
  return new Uint8Array(digest);
}

function compactPublicKey(jwk: JsonWebKey): PairingPublicKey {
  if (jwk.kty !== "EC" || jwk.crv !== "P-256" || !jwk.x || !jwk.y) {
    throw new Error("Invalid GhostDM public key");
  }

  return {
    kty: "EC",
    crv: "P-256",
    x: jwk.x,
    y: jwk.y
  };
}

async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    false,
    ["deriveBits"]
  );
}

async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    compactPublicKey(jwk),
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    []
  );
}

async function exportRawPublicKey(jwk: JsonWebKey): Promise<Uint8Array> {
  const key = await importPublicKey(jwk);
  const raw = await crypto.subtle.exportKey("raw", key);
  return new Uint8Array(raw);
}

export async function fingerprintPublicKey(jwk: JsonWebKey): Promise<string> {
  const raw = await exportRawPublicKey(jwk);
  const hash = await sha256(raw);
  const hex = Array.from(hash.slice(0, 8), byte => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
  return hex.match(/.{1,4}/g)?.join(" ") ?? hex;
}

export async function createIdentity(): Promise<GhostIdentity> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    ["deriveBits"]
  );

  const privateKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);

  return {
    privateKey,
    publicKey: compactPublicKey(publicKey),
    fingerprint: await fingerprintPublicKey(publicKey)
  };
}

export function encodePairingCode(publicKey: JsonWebKey): string {
  const payload = JSON.stringify(compactPublicKey(publicKey));
  return `${PAIRING_PREFIX}${bytesToBase64Url(encoder.encode(payload))}`;
}

export function decodePairingCode(code: string): PairingPublicKey {
  const trimmed = code.trim();

  if (!trimmed.startsWith(PAIRING_PREFIX)) {
    throw new Error("Invalid GhostDM pairing code");
  }

  const payload = trimmed.slice(PAIRING_PREFIX.length);
  const parsed = JSON.parse(decoder.decode(base64UrlToBytes(payload))) as JsonWebKey;
  return compactPublicKey(parsed);
}

async function deriveConversationKey(identity: GhostIdentity, peerPublicKey: JsonWebKey): Promise<CryptoKey> {
  const privateKey = await importPrivateKey(identity.privateKey);
  const publicKey = await importPublicKey(peerPublicKey);

  const sharedSecret = await crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: publicKey
    },
    privateKey,
    256
  );

  const ownRaw = await exportRawPublicKey(identity.publicKey);
  const peerRaw = await exportRawPublicKey(peerPublicKey);
  const saltSource = compareBytes(ownRaw, peerRaw) <= 0
    ? concatBytes(ownRaw, peerRaw)
    : concatBytes(peerRaw, ownRaw);
  const salt = await sha256(saltSource);

  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "HKDF",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: bytesToArrayBuffer(salt),
      info: encoder.encode("GhostDM v2 conversation key")
    },
    hkdfKey,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptText(message: string, identity: GhostIdentity, peerPublicKey: JsonWebKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveConversationKey(identity, peerPublicKey);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: bytesToArrayBuffer(iv)
    },
    key,
    encoder.encode(message)
  );

  return [
    PAYLOAD_PREFIX,
    identity.fingerprint.replaceAll(" ", ""),
    bytesToBase64Url(iv),
    bytesToBase64Url(new Uint8Array(encrypted))
  ].join(":");
}

export async function decryptText(payload: string, identity: GhostIdentity, peerPublicKey: JsonWebKey): Promise<string> {
  const parts = payload.trim().split(":");

  if (parts.length !== 5 || parts[0] !== "ghostdm" || parts[1] !== "v2") {
    throw new Error("Invalid GhostDM payload");
  }

  const iv = base64UrlToBytes(parts[3]);
  const ciphertext = base64UrlToBytes(parts[4]);
  const key = await deriveConversationKey(identity, peerPublicKey);

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
  const trimmed = text.trim();
  return trimmed.startsWith("ghostdm:v1:") || trimmed.startsWith(`${PAYLOAD_PREFIX}:`);
}
