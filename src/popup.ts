import {
  createIdentity,
  decodePairingCode,
  encodePairingCode,
  fingerprintPublicKey,
  type GhostIdentity,
  type PairingPublicKey
} from "./crypto";
import { extensionApi } from "./extensionApi";

const pairingCodeEl = document.getElementById("pairing-code") as HTMLTextAreaElement;
const copyButton = document.getElementById("copy") as HTMLButtonElement;
const peerCodeEl = document.getElementById("peer-code") as HTMLTextAreaElement;
const savePeerButton = document.getElementById("save-peer") as HTMLButtonElement;
const clearPeerButton = document.getElementById("clear-peer") as HTMLButtonElement;
const ownFingerprintEl = document.getElementById("own-fingerprint") as HTMLDivElement;
const peerFingerprintEl = document.getElementById("peer-fingerprint") as HTMLDivElement;
const statusEl = document.getElementById("status") as HTMLDivElement;

function isGhostIdentity(value: unknown): value is GhostIdentity {
  const candidate = value as GhostIdentity;
  return Boolean(candidate?.privateKey && candidate?.publicKey && candidate?.fingerprint);
}

function isPairingPublicKey(value: unknown): value is PairingPublicKey {
  const candidate = value as PairingPublicKey;
  return candidate?.kty === "EC" && candidate.crv === "P-256" && Boolean(candidate.x && candidate.y);
}

async function getIdentity(): Promise<GhostIdentity> {
  const result = await extensionApi.storage.local.get("ghostdm_identity");

  if (isGhostIdentity(result.ghostdm_identity)) {
    return result.ghostdm_identity;
  }

  const identity = await createIdentity();
  await extensionApi.storage.local.set({ ghostdm_identity: identity });
  return identity;
}

async function refreshStatus(): Promise<void> {
  const [identity, storage] = await Promise.all([
    getIdentity(),
    extensionApi.storage.local.get("ghostdm_peer_public_key")
  ]);
  const peerPublicKey = storage.ghostdm_peer_public_key;

  pairingCodeEl.value = encodePairingCode(identity.publicKey);
  ownFingerprintEl.textContent = `Your fingerprint: ${identity.fingerprint}`;

  if (isPairingPublicKey(peerPublicKey)) {
    const fingerprint = await fingerprintPublicKey(peerPublicKey);
    peerFingerprintEl.textContent = `Peer fingerprint: ${fingerprint}`;
    statusEl.textContent = "Paired. Compare fingerprints before trusting the chat.";
    return;
  }

  peerFingerprintEl.textContent = "Peer fingerprint: not paired";
  statusEl.textContent = "Not paired. Exchange pairing codes first.";
}

copyButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(pairingCodeEl.value);
  statusEl.textContent = "Pairing code copied.";
});

savePeerButton.addEventListener("click", async () => {
  try {
    const peerPublicKey = decodePairingCode(peerCodeEl.value);
    await extensionApi.storage.local.set({ ghostdm_peer_public_key: peerPublicKey });
    peerCodeEl.value = "";
    await refreshStatus();
  } catch {
    statusEl.textContent = "That pairing code is not valid.";
  }
});

clearPeerButton.addEventListener("click", async () => {
  await extensionApi.storage.local.remove("ghostdm_peer_public_key");
  peerCodeEl.value = "";
  await refreshStatus();
});

refreshStatus().catch(() => {
  statusEl.textContent = "Could not load GhostDM keys.";
});
