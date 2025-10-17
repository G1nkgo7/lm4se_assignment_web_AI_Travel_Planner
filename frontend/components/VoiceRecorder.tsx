"use client";

import { useEffect, useRef, useState } from "react";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
}

type RecognitionConstructor = typeof window.webkitSpeechRecognition;

type RecognitionInstance = InstanceType<RecognitionConstructor>;

export function VoiceRecorder({ onTranscript }: VoiceRecorderProps) {
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" && "webkitSpeechRecognition" in window;
    setSpeechSupported(supported);
    if (!supported) {
      recognitionRef.current = null;
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript.trim();
      onTranscript(transcript);
      setIsRecording(false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setError(event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [onTranscript]);

  const toggleRecording = () => {
    const recognition = recognitionRef.current;

    if (!speechSupported || !recognition) {
      setError("当前浏览器不支持语音识别，请改用文本输入。");
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
      return;
    }

    setError(null);
    setIsRecording(true);
    recognition.start();
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={toggleRecording}
        className={`rounded-md px-4 py-2 text-white transition-colors ${
          isRecording ? "bg-red-500 hover:bg-red-600" : "bg-brand hover:bg-brand-dark"
        }`}
      >
        {isRecording ? "停止录音" : "语音输入"}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!speechSupported && (
        <p className="text-sm text-slate-500">
          浏览器缺少 Web Speech API 支持，推荐使用科大讯飞 SDK。
        </p>
      )}
    </div>
  );
}
