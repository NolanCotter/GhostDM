import { decryptText, encryptText, isGhostPayload, type GhostIdentity, type PairingPublicKey } from "./crypto";
import { extensionApi } from "./extensionApi";

const LOG_PREFIX = "[GhostDM]";
const BUTTON_ID = "ghostdm-encrypt-button";
const TOAST_ID = "ghostdm-status-toast";

type PairingState = {
  identity: GhostIdentity;
  peerPublicKey: PairingPublicKey;
};

function isGhostIdentity(value: unknown): value is GhostIdentity {
  const candidate = value as GhostIdentity;
  return Boolean(candidate?.privateKey && candidate?.publicKey && candidate?.fingerprint);
}

function isPairingPublicKey(value: unknown): value is PairingPublicKey {
  const candidate = value as PairingPublicKey;
  return candidate?.kty === "EC" && candidate.crv === "P-256" && Boolean(candidate.x && candidate.y);
}

async function getPairingState(): Promise<PairingState | null> {
  const identityResult = await extensionApi.storage.local.get("ghostdm_identity");
  const peerResult = await extensionApi.storage.local.get("ghostdm_peer_public_key");

  if (!isGhostIdentity(identityResult.ghostdm_identity) || !isPairingPublicKey(peerResult.ghostdm_peer_public_key)) {
    return null;
  }

  return {
    identity: identityResult.ghostdm_identity,
    peerPublicKey: peerResult.ghostdm_peer_public_key
  };
}

function findTextareas(): HTMLElement[] {
  return Array.from(document.querySelectorAll('[contenteditable="true"], textarea')) as HTMLElement[];
}

function getElementText(el: HTMLElement): string {
  if (el instanceof HTMLTextAreaElement) return el.value;
  return el.innerText || "";
}

function setElementText(el: HTMLElement, text: string): void {
  if (el instanceof HTMLTextAreaElement) {
    el.value = text;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  el.focus();
  document.execCommand("selectAll", false);
  document.execCommand("insertText", false, text);
  el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
}

function showStatus(message: string): void {
  let toast = document.getElementById(TOAST_ID);

  if (!toast) {
    toast = document.createElement("div");
    toast.id = TOAST_ID;
    toast.style.position = "fixed";
    toast.style.right = "18px";
    toast.style.bottom = "68px";
    toast.style.zIndex = "999999";
    toast.style.maxWidth = "260px";
    toast.style.borderRadius = "10px";
    toast.style.padding = "9px 12px";
    toast.style.font = "600 12px system-ui";
    toast.style.background = "#111827";
    toast.style.color = "white";
    toast.style.boxShadow = "0 8px 30px rgba(0,0,0,.28)";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  window.setTimeout(() => {
    toast?.remove();
  }, 2200);
}

async function encryptCurrentInput(): Promise<boolean> {
  const pairing = await getPairingState();

  if (!pairing) {
    console.warn(LOG_PREFIX, "No peer key set.");
    showStatus("Open GhostDM and pair with this chat first.");
    return false;
  }

  const inputs = findTextareas();
  const active = document.activeElement as HTMLElement | null;

  const input = inputs.find(el => el === active || el.contains(active));

  if (!input) {
    showStatus("Focus the DM composer first.");
    return false;
  }

  const plainText = getElementText(input).trim();

  if (!plainText) {
    showStatus("Type a message first.");
    return false;
  }

  if (isGhostPayload(plainText)) {
    showStatus("Message is already encrypted.");
    return false;
  }

  const encrypted = await encryptText(plainText, pairing.identity, pairing.peerPublicKey);
  setElementText(input, encrypted);
  showStatus("Message encrypted.");
  return true;
}

async function decryptVisibleMessages(): Promise<void> {
  const pairing = await getPairingState();
  if (!pairing) return;

  const candidates = Array.from(document.querySelectorAll("span, div"))
    .filter(el => el.textContent?.includes("ghostdm:v") || (el as HTMLElement).dataset.ghostdmOriginal) as HTMLElement[];

  for (const el of candidates) {
    const raw = el.dataset.ghostdmOriginal || el.textContent?.trim();
    if (!raw || !isGhostPayload(raw)) continue;
    if (el.dataset.ghostdmDecrypted === "true") continue;

    try {
      const decrypted = await decryptText(raw, pairing.identity, pairing.peerPublicKey);
      el.dataset.ghostdmOriginal = raw;
      el.dataset.ghostdmDecrypted = "true";
      el.textContent = `🔒 ${decrypted}`;
    } catch {
      el.dataset.ghostdmOriginal = raw;
      el.dataset.ghostdmDecrypted = "false";
      el.textContent = "🔒 GhostDM message. Pairing key does not match.";
    }
  }
}

function injectGhostButton(): void {
  if (document.getElementById(BUTTON_ID)) return;

  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  button.textContent = "Encrypt";
  button.title = "Encrypt focused DM text with GhostDM";
  button.style.position = "fixed";
  button.style.right = "18px";
  button.style.bottom = "18px";
  button.style.zIndex = "999999";
  button.style.border = "0";
  button.style.borderRadius = "999px";
  button.style.padding = "10px 14px";
  button.style.font = "600 13px system-ui";
  button.style.background = "white";
  button.style.color = "black";
  button.style.boxShadow = "0 8px 30px rgba(0,0,0,.25)";
  button.style.cursor = "pointer";

  button.addEventListener("click", () => {
    encryptCurrentInput()
      .then(encrypted => {
        if (!encrypted) return;
        button.textContent = "Encrypted";
        window.setTimeout(() => {
          button.textContent = "Encrypt";
        }, 1400);
      })
      .catch(err => console.error(LOG_PREFIX, err));
  });

  document.body.appendChild(button);
}

function bindHotkey(): void {
  document.addEventListener("keydown", event => {
    if (!(event.metaKey || event.ctrlKey) || !event.shiftKey || event.key.toLowerCase() !== "e") return;

    event.preventDefault();
    encryptCurrentInput().catch(err => console.error(LOG_PREFIX, err));
  });
}

function boot(): void {
  console.log(LOG_PREFIX, "Loaded.");

  injectGhostButton();
  bindHotkey();
  decryptVisibleMessages().catch(err => console.error(LOG_PREFIX, err));

  const observer = new MutationObserver(() => {
    injectGhostButton();
    decryptVisibleMessages().catch(err => console.error(LOG_PREFIX, err));
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  extensionApi.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || (!changes.ghostdm_identity && !changes.ghostdm_peer_public_key)) return;

    document.querySelectorAll<HTMLElement>("[data-ghostdm-decrypted]").forEach(el => {
      el.dataset.ghostdmDecrypted = "false";
    });

    decryptVisibleMessages().catch(err => console.error(LOG_PREFIX, err));
  });
}

boot();
