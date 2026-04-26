import type { ModelKey } from "$lib/claude";

function ls(key: string, fallback = "") {
  if (typeof localStorage === "undefined") return fallback;
  return localStorage.getItem(key) ?? fallback;
}

function createSettings() {
  let apiKey = $state(ls("oberon_api_key"));
  let model = $state<ModelKey>((ls("oberon_model") as ModelKey) || "haiku");
  let vaultPath = $state(ls("oberon_vault_path"));
  let autosave = $state(ls("oberon_autosave") === "true");
  let ttsEnabled = $state(ls("oberon_tts") === "true");
  let showSettingsDialog = $state(false);

  return {
    get apiKey() { return apiKey; },
    get model() { return model; },
    get vaultPath() { return vaultPath; },
    get autosave() { return autosave; },
    get ttsEnabled() { return ttsEnabled; },
    get showSettingsDialog() { return showSettingsDialog; },
    get hasApiKey() { return apiKey.length > 0; },

    save(newKey: string, newModel: ModelKey, newVaultPath: string, newAutosave: boolean, newTts: boolean) {
      apiKey = newKey;
      model = newModel;
      vaultPath = newVaultPath;
      autosave = newAutosave;
      ttsEnabled = newTts;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("oberon_api_key", newKey);
        localStorage.setItem("oberon_model", newModel);
        localStorage.setItem("oberon_vault_path", newVaultPath);
        localStorage.setItem("oberon_autosave", String(newAutosave));
        localStorage.setItem("oberon_tts", String(newTts));
      }
      showSettingsDialog = false;
    },

    openSettings() { showSettingsDialog = true; },
    closeSettings() { showSettingsDialog = false; },
  };
}

export const settings = createSettings();
