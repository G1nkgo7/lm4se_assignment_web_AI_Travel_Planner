import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import axios from "axios";
import { z } from "zod";
import { config } from "../config";

type SuggestionCategory = "city" | "district" | "station" | "attraction" | "other";

interface SuggestionMeta {
  adcode?: string;
  name?: string;
  level?: string;
  typecode?: string;
}

interface AMapSuggestion {
  id: string;
  label: string;
  description?: string;
  category?: SuggestionCategory;
  meta?: SuggestionMeta;
}

const suggestionSchema = z.object({
  query: z.string().trim().min(1).max(80)
});

const amapClient = axios.create({
  baseURL: "https://restapi.amap.com/v3",
  timeout: 5000
});

function assertAmapSuccess(data: any, context: string) {
  if (typeof data?.status === "string" && data.status !== "1") {
    const info = typeof data?.info === "string" ? data.info : "未知错误";
    const code = typeof data?.infocode === "string" ? data.infocode : "unknown";
    const error = new Error(`AMap ${context}失败: ${info} (${code})`);
    (error as any).statusCode = 502;
    (error as any).amapCode = code;
    (error as any).amapInfo = info;
    throw error;
  }
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function classifyByTypecode(typecode: string): SuggestionCategory {
  if (!typecode) {
    return "other";
  }

  if (typecode.startsWith("1901")) {
    return "city";
  }

  if (typecode.startsWith("190")) {
    return "district";
  }

  if (typecode.startsWith("150")) {
    return "station";
  }

  if (typecode.startsWith("110")) {
    return "attraction";
  }

  return "other";
}

function buildSuggestionFromTip(tip: any, index: number): AMapSuggestion {
  const name = safeString(tip?.name).trim();
  const baseId = safeString(tip?.id) || `${name}-${index}`;
  const district = safeString(tip?.district);
  const city = safeString(tip?.city);
  const province = safeString(tip?.province);
  const hierarchy = [province, city, district].filter(Boolean);
  const labelPrefix = hierarchy.length > 0 ? `${hierarchy.join(" ")} ` : "";
  const address = safeString(tip?.address);
  const typeLabel = safeString(tip?.type);
  const typecode = safeString(tip?.typecode);
  const detailParts = [typeLabel, address].filter(Boolean);
  const category = classifyByTypecode(typecode);

  return {
    id: baseId,
    label: `${labelPrefix}${name}`.trim(),
    description: detailParts.length > 0 ? detailParts.join(" · ") : undefined,
    category,
    meta: {
      name,
      typecode,
      level: undefined
    }
  };
}

function normalizeTips(tips: any[]): AMapSuggestion[] {
  const seen = new Set<string>();

  return tips
    .map((tip: any, index: number) => {
      const name = safeString(tip?.name).trim();
      if (!name) {
        return undefined;
      }

      const suggestion = buildSuggestionFromTip(tip, index);
      const dedupeKey = `${suggestion.id}|${suggestion.label}`;
      if (seen.has(dedupeKey)) {
        return undefined;
      }
      seen.add(dedupeKey);
      return suggestion;
    })
    .filter((item): item is AMapSuggestion => Boolean(item))
    .slice(0, 10);
}

interface FlattenedDistrict {
  node: any;
  path: string[];
}

interface DistrictResult {
  suggestions: AMapSuggestion[];
  primaryCity?: {
    name: string;
    adcode: string;
  };
}

function mergeSuggestions(...groups: AMapSuggestion[][]): AMapSuggestion[] {
  const result: AMapSuggestion[] = [];
  const seen = new Set<string>();

  const pushUnique = (item: AMapSuggestion) => {
    const key = `${item.id}|${item.label}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    result.push(item);
  };

  groups.forEach((group) => {
    group.forEach(pushUnique);
  });

  return result.slice(0, 10);
}

const DISTRICT_LEVEL_LABELS: Record<string, string> = {
  country: "国家",
  province: "省/直辖市",
  city: "地级市",
  district: "区/县",
  street: "街道"
};
const PROVINCE_KEYWORDS = [
  "北京",
  "北京市",
  "天津",
  "天津市",
  "上海",
  "上海市",
  "重庆",
  "重庆市",
  "河北",
  "河北省",
  "山西",
  "山西省",
  "辽宁",
  "辽宁省",
  "吉林",
  "吉林省",
  "黑龙江",
  "黑龙江省",
  "江苏",
  "江苏省",
  "浙江",
  "浙江省",
  "安徽",
  "安徽省",
  "福建",
  "福建省",
  "江西",
  "江西省",
  "山东",
  "山东省",
  "河南",
  "河南省",
  "湖北",
  "湖北省",
  "湖南",
  "湖南省",
  "广东",
  "广东省",
  "海南",
  "海南省",
  "四川",
  "四川省",
  "贵州",
  "贵州省",
  "云南",
  "云南省",
  "陕西",
  "陕西省",
  "甘肃",
  "甘肃省",
  "青海",
  "青海省",
  "台湾",
  "台湾省",
  "内蒙古",
  "内蒙古自治区",
  "广西",
  "广西壮族自治区",
  "西藏",
  "西藏自治区",
  "宁夏",
  "宁夏回族自治区",
  "新疆",
  "新疆维吾尔自治区",
  "香港",
  "香港特别行政区",
  "澳门",
  "澳门特别行政区"
];
const DISTRICT_PART_DELIMITERS = /[\s,，\/|·\-]+/;

function flattenDistricts(items: any[]): FlattenedDistrict[] {
  const queue: FlattenedDistrict[] = items.map((item: any) => ({ node: item, path: [] }));
  const result: FlattenedDistrict[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || !current.node) {
      continue;
    }

    const name = safeString(current.node.name).trim();
    if (!name) {
      continue;
    }

    result.push({ node: current.node, path: current.path });

    if (Array.isArray(current.node.districts) && current.node.districts.length > 0) {
      const nextPath = [...current.path, name];
      current.node.districts.forEach((child: any) => {
        queue.push({ node: child, path: nextPath });
      });
    }
  }

  return result;
}

function mapDistrictLevelToCategory(levelRaw: string): SuggestionCategory {
  if (levelRaw === "city" || levelRaw === "province" || levelRaw === "country") {
    return "city";
  }
  if (levelRaw === "district" || levelRaw === "county") {
    return "district";
  }
  return "other";
}

function normalizeDistricts(districts: any[]): AMapSuggestion[] {
  const citySuggestions: AMapSuggestion[] = [];
  const otherSuggestions: AMapSuggestion[] = [];

  flattenDistricts(districts)
    .slice(0, 20)
    .forEach(({ node, path }: FlattenedDistrict, index: number) => {
      const name = safeString(node?.name).trim();
      if (!name) {
        return;
      }
      const id = safeString(node?.adcode) || `${name}-${index}`;
      const levelRaw = safeString(node?.level);
      const level = DISTRICT_LEVEL_LABELS[levelRaw] ?? levelRaw;
      const center = safeString(node?.center);
      const hierarchy = [...path, name].filter(Boolean);
      const category = mapDistrictLevelToCategory(levelRaw);

      const descriptionParts: string[] = [];
      if (level) {
        descriptionParts.push(`行政级别：${level}`);
      }
      if (center) {
        descriptionParts.push(`坐标：${center}`);
      }

      const suggestion: AMapSuggestion = {
        id,
        label: hierarchy.join(" "),
        description: descriptionParts.length > 0 ? descriptionParts.join(" · ") : undefined,
        category,
        meta: {
          adcode: safeString(node?.adcode),
          name,
          level: levelRaw
        }
      };

      if (category === "city") {
        citySuggestions.push(suggestion);
      } else {
        otherSuggestions.push(suggestion);
      }
    });

  return [...citySuggestions, ...otherSuggestions].slice(0, 10);
}

async function fetchInputTips(apiKey: string, query: string) {
  const { data } = await amapClient.get("/assistant/inputtips", {
    params: {
      key: apiKey,
      keywords: query,
      datatype: "all"
    }
  });

  assertAmapSuccess(data, "InputTips 查询");
  const tips = Array.isArray(data?.tips) ? data.tips : [];
  return normalizeTips(tips);
}

function buildDistrictKeywords(rawQuery: string): string[] {
  const candidates: string[] = [];

  const addCandidate = (value: string | undefined) => {
    const candidate = safeString(value).trim();
    if (!candidate) {
      return;
    }
    if (!candidates.includes(candidate)) {
      candidates.push(candidate);
    }
  };

  const trimmed = rawQuery.trim();
  addCandidate(trimmed);

  if (trimmed.length === 0) {
    return candidates;
  }

  const normalized = trimmed.replace(DISTRICT_PART_DELIMITERS, " ").replace(/\s+/g, " ").trim();
  if (normalized && normalized !== trimmed) {
    normalized.split(" ").forEach(addCandidate);
  }

  PROVINCE_KEYWORDS.forEach((province) => {
    if (trimmed.startsWith(province) && trimmed.length > province.length) {
      addCandidate(trimmed.slice(province.length));
    }
    if (trimmed.endsWith(province) && trimmed.length > province.length) {
      addCandidate(trimmed.slice(0, trimmed.length - province.length));
    }
  });

  const boundaryMarkers = ["省", "市", "区", "县", "州", "镇", "乡"];
  boundaryMarkers.forEach((marker) => {
    const idx = trimmed.lastIndexOf(marker);
    if (idx >= 0 && idx + 1 < trimmed.length) {
      addCandidate(trimmed.slice(idx + 1));
    }
  });

  if (/^[\u4e00-\u9fa5]{4,}$/.test(trimmed)) {
    addCandidate(trimmed.slice(-2));
    addCandidate(trimmed.slice(-3));
  }

  return candidates;
}

async function fetchDistrictSuggestions(apiKey: string, rawQuery: string): Promise<DistrictResult> {
  const candidates = buildDistrictKeywords(rawQuery);
  const collected: AMapSuggestion[] = [];
  const seen = new Set<string>();
  let primaryCity: DistrictResult["primaryCity"];

  for (const keyword of candidates) {
    const suggestions = await fetchDistrictFallback(apiKey, keyword);
    for (const suggestion of suggestions) {
      const key = `${suggestion.id}|${suggestion.label}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      collected.push(suggestion);

       if (!primaryCity) {
         const category = suggestion.category;
         const adcode = suggestion.meta?.adcode;
         const name = suggestion.meta?.name;
         if ((category === "city" || category === "district") && adcode && name) {
           primaryCity = { adcode, name };
         }
       }

      if (collected.length >= 10) {
        return { suggestions: collected, primaryCity };
      }
    }
  }

  return { suggestions: collected, primaryCity };
}

async function fetchDistrictFallback(apiKey: string, query: string) {
  const { data } = await amapClient.get("/config/district", {
    params: {
      key: apiKey,
      keywords: query,
      subdistrict: 2,
      extensions: "base"
    }
  });

  assertAmapSuccess(data, "行政区划查询");
  const districts = Array.isArray(data?.districts) ? data.districts : [];
  return normalizeDistricts(districts);
}

interface PlaceSearchOptions {
  types: string;
  categoryHint?: SuggestionCategory;
  limit?: number;
  cityAdcode?: string;
  keywordOverride?: string;
}

function buildSuggestionFromPoi(
  poi: any,
  index: number,
  categoryHint?: SuggestionCategory
): AMapSuggestion {
  const name = safeString(poi?.name).trim();
  const id = safeString(poi?.id) || `${name}-${index}`;
  const province = safeString(poi?.pname) || safeString(poi?.province);
  const city = safeString(poi?.cityname) || safeString(poi?.city);
  const district = safeString(poi?.adname) || safeString(poi?.district);
  const typeLabel = safeString(poi?.type);
  const address = safeString(poi?.address);
  const typecode = safeString(poi?.typecode);
  const locationParts = [province, city, district].filter(Boolean);
  const uniqueLocation = Array.from(new Set(locationParts));
  const labelPrefix = uniqueLocation.length > 0 ? `${uniqueLocation.join(" ")} ` : "";
  const descriptionParts = [typeLabel, address].filter(Boolean);
  const category = categoryHint ?? classifyByTypecode(typecode);

  return {
    id,
    label: `${labelPrefix}${name}`.trim(),
    description: descriptionParts.length > 0 ? descriptionParts.join(" · ") : undefined,
    category,
    meta: {
      adcode: safeString(poi?.adcode),
      name,
      typecode
    }
  };
}

async function fetchPlacePois(
  apiKey: string,
  keyword: string,
  options: PlaceSearchOptions
): Promise<AMapSuggestion[]> {
  const { types, categoryHint, limit = 5, cityAdcode, keywordOverride } = options;

  if (!keyword.trim()) {
    return [];
  }

  const params: Record<string, any> = {
    key: apiKey,
    keywords: keywordOverride ?? keyword,
    types,
    offset: Math.min(limit, 20),
    page: 1,
    extensions: "base"
  };

  if (cityAdcode) {
    params.city = cityAdcode;
    params.citylimit = true;
  }

  const { data } = await amapClient.get("/place/text", { params });

  assertAmapSuccess(data, "POI 搜索");
  const pois = Array.isArray(data?.pois) ? data.pois : [];

  return pois
    .filter((poi: any) => typeof poi?.name === "string" && poi.name.trim().length > 0)
    .slice(0, limit)
    .map((poi: any, index: number) => buildSuggestionFromPoi(poi, index, categoryHint));
}

export const mapsRouter = Router();

mapsRouter.get(
  "/suggestions",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const apiKey = config.mapApiKey;
      if (!apiKey) {
        res.status(503).json({ message: "地图服务未配置" });
        return;
      }

      const { query } = suggestionSchema.parse(req.query);
      const trimmed = query.trim();

      if (!trimmed) {
        res.json([]);
        return;
      }

      const districtResult = await fetchDistrictSuggestions(apiKey, trimmed);
      const districtSuggestions = districtResult.suggestions;
      const primaryCityName = districtResult.primaryCity?.name ?? trimmed;
      const primaryCityAdcode = districtResult.primaryCity?.adcode;

      const [stationSuggestions, attractionSuggestions, otherPoiSuggestions, poiSuggestions] =
        await Promise.all([
        fetchPlacePois(apiKey, trimmed, {
          types: "150100|150200|150300",
          categoryHint: "station",
          cityAdcode: primaryCityAdcode,
          keywordOverride: primaryCityName,
          limit: 5
        }),
        fetchPlacePois(apiKey, trimmed, {
          types: "110000",
          categoryHint: "attraction",
          cityAdcode: primaryCityAdcode,
          keywordOverride: primaryCityName,
          limit: 8
          }),
          fetchPlacePois(apiKey, trimmed, {
            types: "060000|050000|070000|080000",
            categoryHint: "other",
            cityAdcode: primaryCityAdcode,
            keywordOverride: primaryCityName,
            limit: 5
          }),
          fetchInputTips(apiKey, trimmed)
        ]);

      const suggestions = mergeSuggestions(
        districtSuggestions,
        stationSuggestions,
        attractionSuggestions,
        otherPoiSuggestions,
        poiSuggestions
      );
      res.json(suggestions);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status ?? 502;
        const detail = error.response?.data;
        res.status(status).json({
          message: "地图服务请求失败",
          detail
        });
        return;
      }

      if (error instanceof Error && (error as any).statusCode) {
        const status = Number((error as any).statusCode) || 502;
        res.status(status).json({
          message: error.message,
          code: (error as any).amapCode,
          info: (error as any).amapInfo
        });
        return;
      }

      next(error);
    }
  }
);