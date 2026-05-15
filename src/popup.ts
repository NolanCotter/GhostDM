import { extensionApi } from "./extensionApi";

const input = document.getElementById("passphrase") as HTMLInputElement;
const saveButton = document.getElementById("save") as HTMLButtonElement;
const clearButton = document.getElementById("clear") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;

async function refreshStatus(): Promise<void> {
  const result = await extensionApi.storage.local.get("ghostdm_passphrase");
  statusEl.textContent = typeof result.ghostdm_passphrase === "string"
    ? "Passphrase saved locally."
    : "No passphrase saved.";
}

saveButton.addEventListener("click", async () => {
  const passphrase = input.value.trim();

  if (!passphrase) {
    statusEl.textContent = "Enter a passphrase first.";
    return;
  }

  await extensionApi.storage.local.set({
    ghostdm_passphrase: passphrase
  });

  input.value = "";
  await refreshStatus();
});

clearButton.addEventListener("click", async () => {
  await extensionApi.storage.local.remove("ghostdm_passphrase");
  input.value = "";
  await refreshStatus();
});

refreshStatus();
