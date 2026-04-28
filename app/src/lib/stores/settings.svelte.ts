import type { ModelKey } from "$lib/claude";

export type TtsProvider = "system" | "elevenlabs" | "openai";
export type KnowledgeView = "contextual" | "unified";

function ls(key: string, fallback = "") {
  if (typeof localStorage === "undefined") return fallback;
  return localStorage.getItem(key) ?? fallback;
}

function lsJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
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
  let jiraBaseUrl = $state(ls("oberon_jira_base_url"));
  let jiraProjects = $state<string[]>(lsJson<string[]>("oberon_jira_projects", []));
  let jiraApiUrl = $state(ls("oberon_jira_api_url"));
  let jiraEmail = $state(ls("oberon_jira_email"));
  let jiraApiToken = $state(ls("oberon_jira_api_token"));
  let atlassianClientId = $state(ls("oberon_atlassian_client_id"));
  let atlassianAccessToken = $state(ls("oberon_atlassian_access_token"));
  let atlassianRefreshToken = $state(ls("oberon_atlassian_refresh_token"));
  let atlassianTokenExpiry = $state(Number(ls("oberon_atlassian_token_expiry")) || 0);
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
    get jiraBaseUrl() { return jiraBaseUrl; },
    get jiraProjects() { return jiraProjects; },
    get jiraApiUrl() { return jiraApiUrl; },
    get jiraEmail() { return jiraEmail; },
    get jiraApiToken() { return jiraApiToken; },
    get jiraApiConnected() { return jiraApiUrl.length > 0 && jiraEmail.length > 0 && jiraApiToken.length > 0; },
    get atlassianClientId() { return atlassianClientId; },
    get atlassianAccessToken() { return atlassianAccessToken; },
    get atlassianRefreshToken() { return atlassianRefreshToken; },
    get atlassianTokenExpiry() { return atlassianTokenExpiry; },
    get atlassianConnected() { return atlassianAccessToken.length > 0; },
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
      newJiraBaseUrl: string,
      newJiraProjects: string[],
      newJiraApiUrl: string,
      newJiraEmail: string,
      newJiraApiToken: string,
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
      jiraBaseUrl = newJiraBaseUrl;
      jiraProjects = newJiraProjects;
      jiraApiUrl = newJiraApiUrl;
      jiraEmail = newJiraEmail;
      jiraApiToken = newJiraApiToken;
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
        localStorage.setItem("oberon_jira_base_url", newJiraBaseUrl);
        localStorage.setItem("oberon_jira_projects", JSON.stringify(newJiraProjects));
        localStorage.setItem("oberon_jira_api_url", newJiraApiUrl);
        localStorage.setItem("oberon_jira_email", newJiraEmail);
        localStorage.setItem("oberon_jira_api_token", newJiraApiToken);
      }
      showSettingsDialog = false;
    },

    setAtlassianTokens(params: {
      clientId: string;
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }) {
      atlassianClientId = params.clientId;
      atlassianAccessToken = params.accessToken;
      atlassianRefreshToken = params.refreshToken;
      atlassianTokenExpiry = Date.now() + params.expiresIn * 1000;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("oberon_atlassian_client_id", params.clientId);
        localStorage.setItem("oberon_atlassian_access_token", params.accessToken);
        localStorage.setItem("oberon_atlassian_refresh_token", params.refreshToken);
        localStorage.setItem("oberon_atlassian_token_expiry", String(atlassianTokenExpiry));
      }
    },

    clearAtlassian() {
      atlassianClientId = "";
      atlassianAccessToken = "";
      atlassianRefreshToken = "";
      atlassianTokenExpiry = 0;
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("oberon_atlassian_client_id");
        localStorage.removeItem("oberon_atlassian_access_token");
        localStorage.removeItem("oberon_atlassian_refresh_token");
        localStorage.removeItem("oberon_atlassian_token_expiry");
      }
    },

    openSettings() { showSettingsDialog = true; },
    closeSettings() { showSettingsDialog = false; },
  };
}

export const settings = createSettings();
