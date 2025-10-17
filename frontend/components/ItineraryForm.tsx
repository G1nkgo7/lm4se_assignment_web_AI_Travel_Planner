"use client";

import type { ChangeEvent, FocusEvent, FormEvent } from "react";
import { useState } from "react";
import { TravelPreferences } from "@/lib/types";
import { VoiceRecorder } from "./VoiceRecorder";

interface ItineraryFormProps {
  onSubmit: (preferences: TravelPreferences) => Promise<void>;
  loading: boolean;
  onDestinationBlur?: (destination: string) => void;
}

interface FormState {
  destination: string;
  startDate: string;
  endDate: string;
  budget: string;
  travelers: string;
  interests: string[];
  notes: string;
}

function formatDate(date: Date) {
  return date.toISOString().split("T")[0];
}

function getDefaultDates() {
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + 3);

  return {
    start: formatDate(today),
    end: formatDate(end)
  };
}

const { start, end } = getDefaultDates();

const interestOptions = [
  "美食",
  "文化",
  "亲子",
  "自然",
  "历史",
  "艺术",
  "购物",
  "夜生活",
  "冒险",
  "休闲"
];

const defaultState: FormState = {
  destination: "",
  startDate: start,
  endDate: end,
  budget: "10000",
  travelers: "2",
  interests: ["美食", "文化"],
  notes: ""
};

export function ItineraryForm({ onSubmit, loading, onDestinationBlur }: ItineraryFormProps) {
  const [form, setForm] = useState<FormState>(defaultState);
  const [voiceTranscript, setVoiceTranscript] = useState("");

  const updateField = (key: Exclude<keyof FormState, "interests">, value: string) => {
    setForm((prev: FormState) => {
      if (key === "startDate") {
        const updatedStart = value;
        const correctedEnd =
          prev.endDate && new Date(prev.endDate) < new Date(updatedStart)
            ? updatedStart
            : prev.endDate;
        return { ...prev, startDate: updatedStart, endDate: correctedEnd };
      }

      if (key === "endDate") {
        const updatedEnd = value;
        if (prev.startDate && new Date(updatedEnd) < new Date(prev.startDate)) {
          return { ...prev, endDate: prev.startDate };
        }
        return { ...prev, endDate: updatedEnd };
      }

      return { ...prev, [key]: value };
    });
  };

  const handleVoiceTranscript = (text: string) => {
    setVoiceTranscript(text);
    setForm((prev: FormState) => ({ ...prev, notes: `${prev.notes}\n${text}`.trim() }));
  };

  const toggleInterest = (interest: string) => {
    setForm(prev => {
      const exists = prev.interests.includes(interest);
      const nextInterests = exists
        ? prev.interests.filter(item => item !== interest)
        : [...prev.interests, interest];

      return { ...prev, interests: nextInterests };
    });
  };

  const handleDestinationBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (!onDestinationBlur) {
      return;
    }
    const value = event.target.value.trim();
    onDestinationBlur(value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const preferences: TravelPreferences = {
      destination: form.destination,
      startDate: form.startDate,
      endDate: form.endDate,
      days: Math.max(
        1,
        Math.ceil(
          (new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      ),
      budget: Number(form.budget),
      travelers: Number(form.travelers),
      interests: form.interests,
      notes: form.notes.trim()
    };

    await onSubmit(preferences);
  };

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-600">旅行目的地</label>
        <input
          className="w-full rounded-md border border-slate-200 px-3 py-2 focus:border-brand focus:outline-none"
          value={form.destination}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            updateField("destination", event.target.value)
          }
          onBlur={handleDestinationBlur}
          placeholder="如：日本东京"
          required
        />
      </div>

      <div className="grid gap-2 md:grid-cols-2 md:gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-slate-600">开始日期</label>
          <input
            type="date"
            className="w-full rounded-md border border-slate-200 px-3 py-2 focus:border-brand focus:outline-none"
            value={form.startDate}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              updateField("startDate", event.target.value)
            }
            required
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-slate-600">结束日期</label>
          <input
            type="date"
            className="w-full rounded-md border border-slate-200 px-3 py-2 focus:border-brand focus:outline-none"
            value={form.endDate}
            min={form.startDate}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              updateField("endDate", event.target.value)
            }
            required
          />
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3 md:gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-slate-600">预算 (元)</label>
          <input
            type="number"
            min={0}
            className="w-full rounded-md border border-slate-200 px-3 py-2 focus:border-brand focus:outline-none"
            value={form.budget}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              updateField("budget", event.target.value)
            }
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-slate-600">同行人数</label>
          <input
            type="number"
            min={1}
            className="w-full rounded-md border border-slate-200 px-3 py-2 focus:border-brand focus:outline-none"
            value={form.travelers}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              updateField("travelers", event.target.value)
            }
          />
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-600">兴趣偏好</label>
        <div className="flex flex-wrap gap-2">
          {interestOptions.map(option => {
            const selected = form.interests.includes(option);
            return (
              <button
                key={option}
                type="button"
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  selected
                    ? "border-brand bg-brand text-white hover:bg-brand-dark"
                    : "border-slate-300 bg-slate-100 text-slate-600 hover:border-brand hover:text-brand"
                }`}
                onClick={() => toggleInterest(option)}
                aria-pressed={selected}
              >
                {option}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">可多选常见标签，稍后可在备注中补充特殊偏好。</p>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-600">补充说明</label>
        <textarea
          className="min-h-[120px] w-full rounded-md border border-slate-200 px-3 py-2 focus:border-brand focus:outline-none"
          value={form.notes}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
            updateField("notes", event.target.value)
          }
          placeholder="可描述特殊需求、酒店偏好、饮食忌口等信息"
        />
      </div>

      <VoiceRecorder onTranscript={handleVoiceTranscript} />
      {voiceTranscript && (
        <p className="text-sm text-slate-500">语音识别内容：{voiceTranscript}</p>
      )}

      <button
        type="submit"
        className="rounded-md bg-brand px-4 py-2 font-semibold text-white transition-colors hover:bg-brand-dark"
        disabled={loading}
      >
        {loading ? "生成中..." : "生成旅行计划"}
      </button>
    </form>
  );
}
