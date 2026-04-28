import type { ModelKey } from "$lib/claude";

export type TtsProvider = "system" | "elevenlabs" | "openai";
export type KnowledgeView = "contextual" | "unified";

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
  let ttsProvider = $state<TtsProvider>((ls("oberon_tts_provider") as TtsProvider) || "system");
  let elevenLabsKey = $state(ls("oberon_elevenlabs_key"));
  let elevenLabsVoiceId = $state(ls("oberon_elevenlabs_voice_id") || "21m00Tcm4TlvDq8ikWAM");
  let openaiKey = $state(ls("oberon_openai_key"));
  let openaiVoice = $state(ls("oberon_openai_voice") || "nova");
  let systemVoiceName = $state(ls("oberon_system_voice"));
  let devMode = $state(ls("oberon_dev_mode") === "true");
  let knowledgeView = $state<KnowledgeView>((ls("oberon_knowledge_view") as KnowledgeView) || "contextual");
  let showSettingsDialog = $state(false);

  return {
    get apiKey() { return apiKey; },
    get model() { return model; },
    get vaultPath() { return vaultPath; },
    get autosave() { return autosave; },
    get ttsEnabled() { return ttsEnabled; },
    get ttsProvider() { return ttsProvider; },
    get elevenLabsKey() { return elevenLabsKey; },
    get elevenLabsVoiceId() { return elevenLabsVoiceId; },
    get openaiKey() { return openaiKey; },
    get openaiVoice() { return openaiVoice; },
    get systemVoiceName() { return systemVoiceName; },
    get devMode() { return devMode; },
    get knowledgeView() { return knowledgeView; },
    get showSettingsDialog() { return showSettingsDialog; },
    get hasApiKey() { return apiKey.length > 0; },

    setKnowledgeView(view: KnowledgeView) {
      knowledgeView = view;
      if (typeof localStorage !== "undefined")
        localStorage.setItem("oberon_knowledge_view", view);
    },

    save(
      newKey: string,
      newModel: ModelKey,
      newVaultPath: string,
      newAutosave: boolean,
      newTts: boolean,
      newTtsProvider: TtsProvider,
      newElevenLabsKey: string,
      newElevenLabsVoiceId: string,
      newOpenaiKey: string,
      newOpenaiVoice: string,
      newSystemVoiceName: string,
      newDevMode: boolean,
    ) {
      apiKey = newKey;
      model = newModel;
      vaultPath = newVaultPath;
      autosave = newAutosave;
      ttsEnabled = newTts;
      ttsProvider = newTtsProvider;
      elevenLabsKey = newElevenLabsKey;
      elevenLabsVoiceId = newElevenLabsVoiceId;
      openaiKey = newOpenaiKey;
      openaiVoice = newOpenaiVoice;
      systemVoiceName = newSystemVoiceName;
      devMode = newDevMode;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("oberon_api_key", newKey);
        localStorage.setItem("oberon_model", newModel);
        localStorage.setItem("oberon_vault_path", newVaultPath);
        localStorage.setItem("oberon_autosave", String(newAutosave));
        localStorage.setItem("oberon_tts", String(newTts));
        localStorage.setItem("oberon_tts_provider", newTtsProvider);
        localStorage.setItem("oberon_elevenlabs_key", newElevenLabsKey);
        localStorage.setItem("oberon_elevenlabs_voice_id", newElevenLabsVoiceId);
        localStorage.setItem("oberon_openai_key", newOpenaiKey);
        localStorage.setItem("oberon_openai_voice", newOpenaiVoice);
        localStorage.setItem("oberon_system_voice", newSystemVoiceName);
        localStorage.setItem("oberon_dev_mode", String(newDevMode));
      }
      showSettingsDialog = false;
    },

    openSettings() { showSettingsDialog = true; },
    closeSettings() { showSettingsDialog = false; },
  };
}

export const settings = createSettings();
