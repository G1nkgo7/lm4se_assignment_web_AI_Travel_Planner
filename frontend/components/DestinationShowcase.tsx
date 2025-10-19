"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { MapPlaceholder } from "./MapPlaceholder";
import type { ItineraryPlan } from "@/lib/types";
import {
  fetchDestinationImageOnline,
  pickDestinationImage,
  type ScenicImage
} from "@/lib/image-utils";

interface DestinationShowcaseProps {
  destination?: string;
  plan?: ItineraryPlan;
  focus?: {
    name: string;
    address?: string;
    time?: string;
  } | null;
  onActivitySelect?: (payload: {
    date: string;
    time?: string;
    title: string;
    location?: string;
  }) => void;
}

export function DestinationShowcase({
  destination,
  plan,
  focus,
  onActivitySelect
}: DestinationShowcaseProps) {
  const normalizedDestination = useMemo(
    () => destination?.trim().toLowerCase() ?? "",
    [destination]
  );

  const planMatchesDestination = useMemo(() => {
    if (!plan) {
      return false;
    }

    if (!normalizedDestination) {
      return true;
    }

    const haystack: string[] = [];

    if (plan.title) {
      haystack.push(plan.title);
    }

    if (plan.overview) {
      haystack.push(plan.overview);
    }

    for (const day of plan.days) {
      if (day.summary) {
        haystack.push(day.summary);
      }
      for (const activity of day.activities) {
        if (activity.title) {
          haystack.push(activity.title);
        }
        if (activity.description) {
          haystack.push(activity.description);
        }
        if (activity.location) {
          haystack.push(activity.location);
        }
      }
    }

    return haystack
      .filter(Boolean)
      .map(text => text!.toLowerCase())
      .some(text => text.includes(normalizedDestination));
  }, [plan, normalizedDestination]);

  const planMismatch = Boolean(plan) && Boolean(normalizedDestination) && !planMatchesDestination;

  const scenicHints = useMemo(() => {
    if (!planMatchesDestination) {
      return [] as string[];
    }
    return [plan?.overview ?? "", plan?.title ?? ""];
  }, [planMatchesDestination, plan?.overview, plan?.title]);

  const fallbackImage = useMemo(
    () => pickDestinationImage(destination, scenicHints),
    [destination, scenicHints]
  );

  const [heroImage, setHeroImage] = useState<ScenicImage | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState<boolean>(false);
  const heroCredit = heroImage?.credit;

  useEffect(() => {
    let cancelled = false;

    async function loadRemoteImage() {
      setIsLoadingImage(true);

      if (!destination) {
        setHeroImage(fallbackImage);
        setIsLoadingImage(false);
        return;
      }

      try {
        const remoteImage = await fetchDestinationImageOnline(destination, scenicHints);
        if (!cancelled) {
          setHeroImage(remoteImage ?? fallbackImage);
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.warn("Failed to fetch remote scenic image", error);
        }
        if (!cancelled) {
          setHeroImage(fallbackImage);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingImage(false);
        }
      }
    }

    void loadRemoteImage();

    return () => {
      cancelled = true;
    };
  }, [destination, scenicHints, fallbackImage]);

  const displayPlan = planMatchesDestination ? plan : null;

  const highlightActivities = useMemo(() => {
    if (!displayPlan) {
      return [];
    }

    return displayPlan.days
      .map((day, index) => {
        if (!day.activities.length) {
          return null;
        }
        const primary = day.activities[0];
        return {
          order: index + 1,
          date: day.date,
          summary: day.summary,
          activity: primary
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, 3);
  }, [displayPlan]);

  const overviewText = (() => {
    if (displayPlan?.overview) {
      return displayPlan.overview;
    }

    if (planMismatch && destination) {
      return `当前行程内容与「${destination}」不匹配，请重新生成以获取准确的推荐。`;
    }

    if (!plan) {
      return "生成行程后，将展示旅行亮点与推荐安排。";
    }

    return "行程内容正在更新，请稍后重新生成以匹配最新目的地。";
  })();

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.8fr)]">
        <div className="relative">
          <MapPlaceholder
            destination={destination}
            focus={focus}
            className="h-[320px] min-h-[320px] sm:h-[420px] lg:h-full lg:min-h-[480px] xl:min-h-[560px]"
          />
          {focus ? (
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/90 p-4 text-sm text-slate-700 shadow-lg lg:hidden">
              <p className="font-semibold text-slate-900">{focus.name}</p>
              {focus.time && <p className="text-xs text-slate-500">{focus.time}</p>}
              {focus.address && <p className="mt-1 text-xs text-slate-500">{focus.address}</p>}
            </div>
          ) : null}
          {!plan && !destination ? (
            <div className="absolute inset-x-6 bottom-6 hidden rounded-2xl bg-white/90 p-5 text-sm text-slate-600 shadow-lg lg:block">
              <p className="font-semibold text-slate-900">地图导航预览</p>
              <p className="mt-2 text-xs text-slate-500">
                选择旅行目的地后，将在地图中展示定位结果，并配合行程卡片高亮您关注的景点。
              </p>
            </div>
          ) : null}
        </div>
        <div className="relative">
          <div className="absolute inset-0">
            {heroImage ? (
              <Image
                src={heroImage.thumbnail ?? heroImage.src}
                alt={heroImage.alt}
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className={`object-cover transition-opacity duration-300 ${
                  isLoadingImage ? "opacity-75" : "opacity-100"
                }`}
                priority
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/45 to-slate-900/20" />
          </div>
          <div className="relative flex h-full flex-col justify-between p-8 text-white">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/70">DESTINATION</p>
              <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
                {destination || "等待目的地"}
              </h2>
              <p className="mt-4 text-sm text-white/75">
                {overviewText}
              </p>
            </div>
            <div className="mt-6">
              <p className="text-xs font-semibold tracking-[0.2em] text-white/70">HIGHLIGHTS</p>
              {highlightActivities.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {highlightActivities.map(item => {
                    const clickable = Boolean(onActivitySelect);
                    return (
                      <li key={`${item.date}-${item.activity.title}`}>
                        <button
                          type="button"
                          className={`group flex w-full items-start gap-3 rounded-2xl bg-white/10 p-4 text-left transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                            clickable ? "cursor-pointer" : "cursor-default"
                          }`}
                          onClick={() =>
                            onActivitySelect?.({
                              date: item.date,
                              time: item.activity.time,
                              title: item.activity.title,
                              location: item.activity.location
                            })
                          }
                          disabled={!clickable}
                        >
                          <span className="mt-1 inline-flex min-w-[60px] justify-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-white/80">
                            Day {item.order}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-white">{item.activity.title}</p>
                            <p className="mt-1 text-xs text-white/80">{item.summary}</p>
                            {item.activity.location ? (
                              <p className="mt-2 text-xs text-white/70">{item.activity.location}</p>
                            ) : null}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="mt-4 rounded-2xl bg-white/10 p-5 text-sm text-white/75">
                  {planMismatch && destination
                    ? `「${destination}」的旅行亮点尚未生成，请重新生成行程以获取最新安排。`
                    : "生成行程后，可在此快速预览每日亮点，并点击卡片定位到地图。"}
                </div>
              )}
              <p className="mt-6 text-[11px] text-white/60">
                地图定位仅覆盖中国境内地点，填写海外目的地时将显示默认视图。
              </p>
              {heroCredit?.author ? (
                <p className="mt-2 text-[11px] text-white/60">
                  摄影：
                  {heroCredit.authorUrl ? (
                    <a
                      href={heroCredit.authorUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-white/40 underline-offset-4 hover:decoration-white"
                    >
                      {heroCredit.author}
                    </a>
                  ) : (
                    heroCredit.author
                  )}
                  {heroCredit.sourceName ? (
                    <>
                      {" "}于
                      {heroCredit.sourceUrl ? (
                        <a
                          href={heroCredit.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-1 underline decoration-white/40 underline-offset-4 hover:decoration-white"
                        >
                          {heroCredit.sourceName}
                        </a>
                      ) : (
                        heroCredit.sourceName
                      )}
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
