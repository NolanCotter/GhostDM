import { extensionApi } from "./extensionApi";

extensionApi.runtime.onInstalled.addListener(() => {
  console.log("[GhostDM] Installed.");
});
