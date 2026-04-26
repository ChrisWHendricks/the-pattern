import type { ModelKey } from "$lib/claude";

type Settings = {
  apiKey: string;
  model: ModelKey;
  showSettingsDialog: boolean;
};

function createSettings() {
  let apiKey = $state(typeof localStorage !== "undefined" ? (localStorage.getItem("oberon_api_key") ?? "") : "");
  let model = $state<ModelKey>(
    (typeof localStorage !== "undefined"
      ? (localStorage.getItem("oberon_model") as ModelKey)
      : null) ?? "haiku"
  );
  let showSettingsDialog = $state(false);

  return {
    get apiKey() { return apiKey; },
    get model() { return model; },
    get showSettingsDialog() { return showSettingsDialog; },
    get hasApiKey() { return apiKey.length > 0; },

    save(newKey: string, newModel: ModelKey) {
      apiKey = newKey;
      model = newModel;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("oberon_api_key", newKey);
        localStorage.setItem("oberon_model", newModel);
      }
      showSettingsDialog = false;
    },

    openSettings() { showSettingsDialog = true; },
    closeSettings() { showSettingsDialog = false; },
  };
}

export const settings = createSettings();
