import { settings } from "$lib/stores/settings.svelte";
import { invoke } from "@tauri-apps/api/core";

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/gs, "$1")
    .replace(/\*(.+?)\*/gs, "$1")
    .replace(/`{3}[\s\S]*?`{3}/g, "")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function createVoiceStore() {
  let isListening = $state(false);
  let isSpeaking = $state(false);
  let interim = $state("");

  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recognition: any = null;
  let currentAudio: HTMLAudioElement | null = null;

  function startListening(onFinal: (text: string) => void) {
    if (!supported || isListening) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interimText = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        } else {
          interimText += event.results[i][0].transcript;
        }
      }
      if (finalText) {
        interim = "";
        onFinal(finalText.trim());
      } else {
        interim = interimText;
      }
    };

    recognition.onend = () => { isListening = false; interim = ""; };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.error("[voice] SpeechRecognition error:", event.error, event.message);
      isListening = false;
      interim = "";
    };

    recognition.start();
    isListening = true;
  }

  function stopListening() {
    recognition?.stop();
    isListening = false;
    interim = "";
  }

  async function speakSystem(text: string) {
    const voice = settings.systemVoiceName || "Ava";
    isSpeaking = true;
    try {
      // invoke awaits until `say` finishes, so isSpeaking tracks correctly.
      // Uses the macOS `say` command — works with all installed voices including Premium.
      await invoke("speak_text", { text, voice });
    } catch {
      // Tauri not available (e.g. browser dev) — fall back to Web Speech API
      window.speechSynthesis?.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.92;
      utterance.onend = () => { isSpeaking = false; };
      utterance.onerror = () => { isSpeaking = false; };
      window.speechSynthesis?.speak(utterance);
      return;
    }
    isSpeaking = false;
  }

  async function fetchElevenLabs(text: string): Promise<Blob> {
    const voiceId = settings.elevenLabsVoiceId || "21m00Tcm4TlvDq8ikWAM";
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": settings.elevenLabsKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}`);
    return res.blob();
  }

  async function fetchOpenAI(text: string): Promise<Blob> {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: settings.openaiVoice || "nova",
      }),
    });
    if (!res.ok) throw new Error(`OpenAI TTS ${res.status}`);
    return res.blob();
  }

  function playBlob(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    isSpeaking = true;
    audio.onended = () => { isSpeaking = false; URL.revokeObjectURL(url); currentAudio = null; };
    audio.onerror = () => { isSpeaking = false; URL.revokeObjectURL(url); currentAudio = null; };
    audio.play().catch(() => { isSpeaking = false; URL.revokeObjectURL(url); currentAudio = null; });
  }

  async function speak(text: string) {
    if (typeof window === "undefined") return;
    const clean = stripMarkdown(text);
    if (!clean) return;

    stopSpeaking();

    const provider = settings.ttsProvider;

    if (provider === "elevenlabs" && settings.elevenLabsKey) {
      try {
        playBlob(await fetchElevenLabs(clean));
      } catch (e) {
        console.error("ElevenLabs TTS failed, falling back to system:", e);
        await speakSystem(clean);
      }
      return;
    }

    if (provider === "openai" && settings.openaiKey) {
      try {
        playBlob(await fetchOpenAI(clean));
      } catch (e) {
        console.error("OpenAI TTS failed, falling back to system:", e);
        await speakSystem(clean);
      }
      return;
    }

    await speakSystem(clean);
  }

  function stopSpeaking() {
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    window.speechSynthesis?.cancel();
    invoke("stop_speaking_native").catch(() => {});
    isSpeaking = false;
  }

  return {
    get isListening() { return isListening; },
    get isSpeaking() { return isSpeaking; },
    get interim() { return interim; },
    get supported() { return supported; },
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}

export const voice = createVoiceStore();
