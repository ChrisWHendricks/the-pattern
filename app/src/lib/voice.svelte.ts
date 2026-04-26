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

    recognition.onend = () => {
      isListening = false;
      interim = "";
    };

    recognition.onerror = () => {
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

  function speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const clean = stripMarkdown(text);
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => v.name === "Samantha") ??
      voices.find((v) => v.name.includes("Karen")) ??
      voices.find((v) => v.lang.startsWith("en-")) ??
      null;
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => { isSpeaking = true; };
    utterance.onend = () => { isSpeaking = false; };
    utterance.onerror = () => { isSpeaking = false; };

    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel();
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
