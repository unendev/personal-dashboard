"use client";

import { useState, useEffect, useCallback } from 'react';

interface UseTtsOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export function useTTS(options: UseTtsOptions = {}) {
  const { lang = 'ru-RU', rate = 1, pitch = 1, volume = 1 } = options;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

  useEffect(() => {
    if (synth) {
      // Load voices. Some browsers populate them asynchronously.
      const loadVoices = () => {
        setVoices(synth.getVoices());
      };

      loadVoices();
      if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = loadVoices;
      }
    }

    return () => {
      if (synth && synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = null;
      }
    };
  }, [synth]);

  const speak = useCallback((text: string) => {
    if (!synth || !text) {
      console.warn("Speech synthesis not available or no text provided.");
      return;
    }

    if (synth.speaking) {
      synth.cancel(); // Stop current speech if any
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    // Try to find a suitable Russian voice
    const russianVoice = voices.find(
      (voice) => voice.lang === lang && voice.localService
    );
    if (russianVoice) {
      utterance.voice = russianVoice;
    } else {
      console.warn(`No local voice found for ${lang}. Using default.`);
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (event) => {
      console.error('SpeechSynthesisUtterance.onerror', event);
      setIsSpeaking(false);
    };

    synth.speak(utterance);
  }, [synth, lang, rate, pitch, volume, voices]);

  const cancel = useCallback(() => {
    if (synth && synth.speaking) {
      synth.cancel();
      setIsSpeaking(false);
    }
  }, [synth]);

  return { speak, cancel, isSpeaking, voices };
}
