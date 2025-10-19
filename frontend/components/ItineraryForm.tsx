"use client";

import type { ChangeEvent, FocusEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { TravelPreferences } from "@/lib/types";
import { VoiceRecorder } from "./VoiceRecorder";

interface ItineraryFormProps {
  onSubmit: (preferences: TravelPreferences) => Promise<void>;
  loading: boolean;
  onDestinationBlur?: (destination: string) => void;
  initialPreferences?: TravelPreferences | null;
}

interface FormState {
  destination: string;
  resolvedDestination: string;
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
  resolvedDestination: "",
  startDate: start,
  endDate: end,
  budget: "10000",
  travelers: "2",
  interests: ["美食", "文化"],
  notes: ""
};

const MIN_DESTINATION_QUERY_LENGTH = 1;
const DESTINATION_SUGGESTION_DEBOUNCE_MS = 500;

const PROVINCE_BY_ADCODE_PREFIX: Record<string, { full: string; aliases: string[] }> = {
  "11": { full: "北京市", aliases: ["北京"] },
  "12": { full: "天津市", aliases: ["天津"] },
  "13": { full: "河北省", aliases: ["河北"] },
  "14": { full: "山西省", aliases: ["山西"] },
  "15": { full: "内蒙古自治区", aliases: ["内蒙古"] },
  "21": { full: "辽宁省", aliases: ["辽宁"] },
  "22": { full: "吉林省", aliases: ["吉林"] },
  "23": { full: "黑龙江省", aliases: ["黑龙江"] },
  "31": { full: "上海市", aliases: ["上海"] },
  "32": { full: "江苏省", aliases: ["江苏"] },
  "33": { full: "浙江省", aliases: ["浙江"] },
  "34": { full: "安徽省", aliases: ["安徽"] },
  "35": { full: "福建省", aliases: ["福建"] },
  "36": { full: "江西省", aliases: ["江西"] },
  "37": { full: "山东省", aliases: ["山东"] },
  "41": { full: "河南省", aliases: ["河南"] },
  "42": { full: "湖北省", aliases: ["湖北"] },
  "43": { full: "湖南省", aliases: ["湖南"] },
  "44": { full: "广东省", aliases: ["广东"] },
  "45": { full: "广西壮族自治区", aliases: ["广西"] },
  "46": { full: "海南省", aliases: ["海南"] },
  "50": { full: "重庆市", aliases: ["重庆"] },
  "51": { full: "四川省", aliases: ["四川"] },
  "52": { full: "贵州省", aliases: ["贵州"] },
  "53": { full: "云南省", aliases: ["云南"] },
  "54": { full: "西藏自治区", aliases: ["西藏"] },
  "61": { full: "陕西省", aliases: ["陕西"] },
  "62": { full: "甘肃省", aliases: ["甘肃"] },
  "63": { full: "青海省", aliases: ["青海"] },
  "64": { full: "宁夏回族自治区", aliases: ["宁夏"] },
  "65": { full: "新疆维吾尔自治区", aliases: ["新疆"] },
  "71": { full: "台湾省", aliases: ["台湾"] },
  "81": { full: "香港特别行政区", aliases: ["香港"] },
  "82": { full: "澳门特别行政区", aliases: ["澳门"] }
};

function appendProvinceIfMissing(name: string, adcode?: string): string {
  const normalized = name.trim();
  if (!normalized || !adcode || adcode.length < 2) {
    return normalized;
  }

  const province = PROVINCE_BY_ADCODE_PREFIX[adcode.slice(0, 2)];
  if (!province) {
    return normalized;
  }

  const hasProvince = [province.full, ...province.aliases].some(alias =>
    alias ? normalized.includes(alias) : false
  );

  if (hasProvince) {
    return normalized;
  }

  return `${province.full}${normalized}`;
}

interface DestinationSuggestion {
  id: string;
  label: string;
  description?: string;
  category?: "city" | "district" | "station" | "attraction" | "other";
  meta?: {
    name?: string;
    adcode?: string;
    level?: string;
    typecode?: string;
  };
}

function preferencesToFormState(preferences: TravelPreferences): FormState {
  return {
    destination: preferences.destination,
    resolvedDestination: preferences.destinationFull ?? preferences.destination,
    startDate: preferences.startDate,
    endDate: preferences.endDate,
    budget: String(preferences.budget ?? 0),
    travelers: String(preferences.travelers ?? 1),
    interests: preferences.interests ?? [],
    notes: preferences.notes ?? ""
  };
}

export function ItineraryForm({
  onSubmit,
  loading,
  onDestinationBlur,
  initialPreferences
}: ItineraryFormProps) {
  const [form, setForm] = useState<FormState>(defaultState);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [suggestions, setSuggestions] = useState<DestinationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const destinationFieldRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!initialPreferences) {
      return;
    }
    setForm(preferencesToFormState(initialPreferences));
  }, [initialPreferences]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        destinationFieldRef.current &&
        !destinationFieldRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const rawQuery = form.destination.trim();

    if (rawQuery.length < MIN_DESTINATION_QUERY_LENGTH) {
      setDebouncedQuery("");
      return;
    }

    const handle = window.setTimeout(() => {
      setDebouncedQuery(rawQuery);
    }, DESTINATION_SUGGESTION_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(handle);
    };
  }, [form.destination]);

  useEffect(() => {
    const query = debouncedQuery;

    if (!query || query.length < MIN_DESTINATION_QUERY_LENGTH) {
      setSuggestions([]);
      setFetchingSuggestions(false);
      setSuggestionError(null);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    let active = true;

    const load = async () => {
      setFetchingSuggestions(true);
      setSuggestionError(null);

      try {
        const response = await fetch(
          `/api/maps/suggestions?query=${encodeURIComponent(query)}`,
          { signal }
        );

        if (!response.ok) {
          const detail = await response.text();
          throw new Error(detail || `地图服务请求失败: ${response.status}`);
        }

        const payload = (await response.json()) as DestinationSuggestion[];
        if (!active) {
          return;
        }

        const list = Array.isArray(payload) ? payload : [];
        setSuggestions(list);
        if (list.length > 0) {
          setShowSuggestions(true);
        }
      } catch (error) {
        if (!signal.aborted && active) {
          console.warn("获取目的地建议失败", error);
          setSuggestions([]);
          setSuggestionError("地点服务暂时不可用，请稍后重试。");
        }
      } finally {
        if (active) {
          setFetchingSuggestions(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [debouncedQuery]);

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

      if (key === "destination") {
        return { ...prev, destination: value, resolvedDestination: value };
      }

      return { ...prev, [key]: value };
    });
  };

  const deriveDisplayDestination = (suggestion: DestinationSuggestion) => {
    const metaName = suggestion.meta?.name?.trim();
    const labelSegments = suggestion.label.split(/\s+/).filter(Boolean);
    let displayName = metaName || (labelSegments.length > 0 ? labelSegments[labelSegments.length - 1] : suggestion.label);
    let fullDestination = suggestion.label.replace(/\s+/g, "");

    if (!fullDestination) {
      fullDestination = metaName ?? suggestion.label;
    }

    if (!displayName) {
      displayName = metaName ?? suggestion.label;
    }

    fullDestination = appendProvinceIfMissing(fullDestination.replace(/\s+/g, ""), suggestion.meta?.adcode);

    return {
      displayName: displayName.trim(),
      fullDestination: fullDestination.trim() || displayName.trim()
    };
  };

  const handleSelectSuggestion = (suggestion: DestinationSuggestion) => {
    const { displayName, fullDestination } = deriveDisplayDestination(suggestion);
    setForm(prev => ({
      ...prev,
      destination: displayName,
      resolvedDestination: fullDestination
    }));
    setSuggestions([]);
    setShowSuggestions(false);
    setSuggestionError(null);
    setTimeout(() => {
      onDestinationBlur?.(fullDestination);
    }, 0);
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
    setShowSuggestions(false);
    setSuggestionError(null);
    if (!onDestinationBlur) {
      return;
    }
    const value = event.target.value.trim();
    const normalized = form.resolvedDestination.trim() || value;
    onDestinationBlur(normalized);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const preferences: TravelPreferences = {
      destination: form.destination,
      destinationFull: form.resolvedDestination || form.destination,
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
      <div className="grid gap-2" ref={destinationFieldRef}>
        <label className="text-sm font-medium text-slate-600">旅行目的地</label>
        <div className="relative">
          <input
            className="w-full rounded-md border border-slate-200 px-3 py-2 focus:border-brand focus:outline-none"
            value={form.destination}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setShowSuggestions(false);
              updateField("destination", event.target.value);
            }}
            onBlur={handleDestinationBlur}
            onFocus={() => {
              if (form.destination.trim().length >= MIN_DESTINATION_QUERY_LENGTH) {
                setShowSuggestions(true);
              }
            }}
            autoComplete="off"
            placeholder="如：上海外滩"
            required
          />
          {showSuggestions &&
            (fetchingSuggestions || suggestions.length > 0 || suggestionError) && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white shadow">
                {fetchingSuggestions && suggestions.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-500">正在获取地点建议...</p>
                ) : null}
                {suggestionError && !fetchingSuggestions ? (
                  <p className="px-3 py-2 text-xs text-amber-600">{suggestionError}</p>
                ) : null}
                {suggestions.map(suggestion => (
                  <button
                    key={suggestion.id}
                    type="button"
                    className="flex w-full flex-col gap-1 border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onMouseDown={event => {
                      event.preventDefault();
                      handleSelectSuggestion(suggestion);
                    }}
                  >
                    <span className="font-medium text-slate-700">{suggestion.label}</span>
                    {suggestion.description && (
                      <span className="text-xs text-slate-500">{suggestion.description}</span>
                    )}
                  </button>
                ))}
                {!fetchingSuggestions &&
                  !suggestionError &&
                  suggestions.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-500">未找到匹配地点，请尝试输入更具体的地址。</p>
                ) : null}
              </div>
            )}
        </div>
        <p className="text-xs text-amber-600">
          目前地图搜索仅支持中国境内地点
        </p>
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
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${selected
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
