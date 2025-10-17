"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

interface MapPlaceholderProps {
  destination?: string;
}

const DEFAULT_CENTER: [number, number] = [116.397389, 39.908722];
const DEFAULT_PROVINCE: [number, number] = [117.020359, 36.66853];

type MapStatus = "idle" | "loading" | "ready" | "error";

function normalizeLngLat(location: any): [number, number] {
  if (!location) {
    return DEFAULT_CENTER;
  }

  if (Array.isArray(location) && location.length >= 2) {
    return [Number(location[0]), Number(location[1])];
  }

  if (typeof location.getLng === "function" && typeof location.getLat === "function") {
    return [Number(location.getLng()), Number(location.getLat())];
  }

  if (typeof location.lng !== "undefined" && typeof location.lat !== "undefined") {
    return [Number(location.lng), Number(location.lat)];
  }

  return DEFAULT_CENTER;
}

function waitForAmap(retry = 20): Promise<any> {
  return new Promise((resolve, reject) => {
    const check = (attempt = 0) => {
      if (window.AMap) {
        resolve(window.AMap);
        return;
      }

      if (attempt >= retry) {
        reject(new Error("AMap load timeout"));
        return;
      }

      setTimeout(() => check(attempt + 1), 100);
    };

    check();
  });
}

export function MapPlaceholder({ destination }: MapPlaceholderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [status, setStatus] = useState<MapStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const amapKey = process.env.NEXT_PUBLIC_AMAP_JS_KEY;
  const amapSecurity = process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE;

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current) {
      return;
    }

    let disposed = false;

    const initMap = async () => {
      setStatus("loading");
      setMessage("正在准备地图数据...");

      try {
        const amap = await waitForAmap();
        if (!amap) {
          throw new Error("AMap unavailable");
        }
        if (disposed) {
          return;
        }

        const map = new amap.Map(containerRef.current!, {
          zoom: 11,
          center: DEFAULT_CENTER,
          viewMode: "3D"
        });

        const marker = new amap.Marker({ position: DEFAULT_CENTER });
        map.add(marker);

        mapRef.current = map;
        markerRef.current = marker;

        if (!destination) {
          setStatus("ready");
          setMessage("选择目的地后可查看精准位置和路线建议。");
        }
      } catch (error) {
        if (!disposed) {
          setStatus("error");
          setMessage("加载高德地图失败，请检查网络或密钥设置。");
        }
      }
    };

    initMap();

    return () => {
      disposed = true;
      mapRef.current?.destroy();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [scriptLoaded]);

  useEffect(() => {
    if (!scriptLoaded) {
      return;
    }

    const amap = window.AMap;
    const map = mapRef.current;
    const marker = markerRef.current;

    if (!amap || !map || !marker) {
      return;
    }

    const target = destination?.trim();

    if (!target) {
      map.setCenter(DEFAULT_CENTER);
      marker.setPosition(DEFAULT_CENTER);
      setStatus("ready");
      setMessage("选择目的地后可查看精准位置和路线建议。");
      return;
    }

    setStatus("loading");
    setMessage(`正在根据目的地加载地图：${target}`);

    amap.plugin("AMap.Geocoder", () => {
      const geocoder = new amap.Geocoder();
      const timeoutId = window.setTimeout(() => {
        map.setCenter(DEFAULT_CENTER);
        marker.setPosition(DEFAULT_CENTER);
        setStatus("error");
        setMessage("解析目的地超时，请检查地址或稍后重试。");
      }, 8000);

      geocoder.getLocation(target, (statusCode: string, result: any) => {
        window.clearTimeout(timeoutId);

        if (statusCode === "complete" && result?.geocodes?.length) {
          const { location, formattedAddress } = result.geocodes[0];
          const position = normalizeLngLat(location);

          map.setZoom(12);
          map.setCenter(position);
          marker.setPosition(position);
          marker.setTitle(formattedAddress ?? target);

          setStatus("ready");
          setMessage(null);
          return;
        }

        amap.plugin("AMap.DistrictSearch", () => {
          const district = new amap.DistrictSearch({
            extensions: "base",
            subdistrict: 0
          });

          district.search(target, (dsStatus: string, dsResult: any) => {
            if (dsStatus === "complete" && dsResult?.districtList?.length) {
              const { center, level, name } = dsResult.districtList[0];
              const position = normalizeLngLat(center);
              const zoomLevel = level === "province" ? 8 : level === "city" ? 10 : 12;

              map.setZoom(zoomLevel);
              map.setCenter(position);
              marker.setPosition(position);
              marker.setTitle(name ?? target);

              setStatus("ready");
              setMessage("已定位至行政区域中心，可进一步选择具体景点。");
              return;
            }

            map.setCenter(DEFAULT_PROVINCE);
            marker.setPosition(DEFAULT_PROVINCE);
            setStatus("ready");
            setMessage("未能解析目的地坐标，已显示默认地图。");
          });
        });
      });
    });
  }, [destination, scriptLoaded]);

  return (
    <div className="relative h-72 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
      {!amapKey ? (
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          请在 .env 中配置 `NEXT_PUBLIC_AMAP_JS_KEY` 以启用地图。
        </div>
      ) : (
        <>
          {amapSecurity ? (
            <Script id="amap-security" strategy="beforeInteractive">
              {`window._AMapSecurityConfig = { securityJsCode: "${amapSecurity}" };`}
            </Script>
          ) : null}
          <Script
            src={`https://webapi.amap.com/maps?v=2.0&key=${amapKey}&plugin=AMap.Geocoder,AMap.DistrictSearch`}
            strategy="afterInteractive"
            onLoad={() => setScriptLoaded(true)}
            onError={() => {
              setStatus("error");
              setMessage("地图脚本加载失败，请检查网络或密钥。");
            }}
          />
          <div ref={containerRef} className="h-full w-full" />
          {status !== "ready" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-slate-600">
              {message ?? "正在准备地图数据..."}
            </div>
          )}
        </>
      )}
      {status === "ready" && message && (
        <div className="absolute bottom-3 left-3 right-3 rounded-md bg-white/90 p-3 text-xs text-slate-600 shadow">
          {message}
        </div>
      )}
    </div>
  );
}
