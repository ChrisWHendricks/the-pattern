import type { ModelKey } from "$lib/claude";

function ls(key: string, fallback = "") {
  if (typeof localStorage === "undefined") return fallback;
  return localStorage.getItem(key) ?? fallback;
}

function createSettings() {
  let apiKey = $state(ls("oberon_api_key"));
  let model = $state<ModelKey>((ls("oberon_model") as ModelKey) || "haiku");
  let vaultPath = $state(ls("oberon_vault_path"));
  let showSettingsDialog = $state(false);

  return {
    get apiKey() { return apiKey; },
    get model() { return model; },
    get vaultPath() { return vaultPath; },
    get showSettingsDialog() { return showSettingsDialog; },
    get hasApiKey() { return apiKey.length > 0; },

    save(newKey: string, newModel: ModelKey, newVaultPath: string) {
      apiKey = newKey;
      model = newModel;
      vaultPath = newVaultPath;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("oberon_api_key", newKey);
        localStorage.setItem("oberon_model", newModel);
        localStorage.setItem("oberon_vault_path", newVaultPath);
      }
      showSettingsDialog = false;
    },

    openSettings() { showSettingsDialog = true; },
    closeSettings() { showSettingsDialog = false; },
  };
}

export const settings = createSettings();
