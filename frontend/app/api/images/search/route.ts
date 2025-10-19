import { NextResponse } from "next/server";

const SOURCE_ENDPOINT = "https://image.baidu.com/search/acjson";
const SOURCE_NAME = "Baidu Image";
const REQUEST_TIMEOUT_MS = 6000;
const RESULT_LIMIT = 12;

interface ImageResult {
  id: string;
  src: string;
  alt: string;
  credit?: {
    sourceName?: string;
    sourceUrl?: string;
  };
  thumbnail?: string;
}

interface BaiduItem {
  middleURL?: string;
  thumbURL?: string;
  objURL?: string;
  fromURL?: string;
  fromPageTitle?: string;
  site?: string;
  source?: string;
  hoverURL?: string;
  replaceUrl?: Array<{
    ObjUrl?: string;
    FromUrl?: string;
  }>;
}

interface BaiduResponse {
  data?: BaiduItem[];
  queryExt?: string;
  displayNum?: number;
  returnNumber?: number;
  word?: string;
}

interface SearchDebug {
  destination: string;
  extras: string[];
  query: string;
  source: string;
  sampleResults: Array<{
    title?: string;
    src?: string;
    from?: string;
  }>;
  selected?: {
    title?: string;
    src: string;
    from?: string;
  };
}

function sanitizeTerm(value: string | undefined | null): string {
  if (!value) {
    return "";
  }

  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function buildQuery(destination: string, extras: string[]): string {
  const base = sanitizeTerm(destination);
  const tokens = new Set<string>();

  if (base) {
    tokens.add(base);
    tokens.add(`${base} 风景`);
    tokens.add(`${base} 景点`);
  }

  extras
    .map(sanitizeTerm)
    .filter(Boolean)
    .forEach(extra => tokens.add(extra));

  // tokens.add("旅游");
  tokens.add("风光");

  return Array.from(tokens)
    .filter(Boolean)
    .slice(0, 5)
    .join(" ");
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers = new Headers(init?.headers ?? {});
    headers.set("Accept", "application/json, text/javascript, */*; q=0.01");
    headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) travel-planner/1.0");

    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers
    });
  } finally {
    clearTimeout(timeout);
  }
}

function pickBestUrl(item: BaiduItem): string | undefined {
  const normalize = (value?: string) => normalizeUrl(value);

  if (item.middleURL) {
    return normalize(item.middleURL);
  }
  if (item.objURL) {
    return normalize(item.objURL);
  }
  if (item.hoverURL) {
    return normalize(item.hoverURL);
  }
  if (item.replaceUrl && item.replaceUrl.length) {
    const candidate = item.replaceUrl.find(url => url.ObjUrl?.startsWith("http"));
    if (candidate?.ObjUrl) {
      return normalize(candidate.ObjUrl);
    }
  }
  return undefined;
}

function pickThumbnail(item: BaiduItem, primary: string | undefined): string | undefined {
  const thumbnail = normalizeUrl(item.thumbURL ?? item.middleURL ?? item.hoverURL);
  if (!thumbnail || thumbnail === primary) {
    return undefined;
  }
  return thumbnail;
}

function normalizeUrl(url?: string | null): string | undefined {
  if (!url) {
    return undefined;
  }

  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  if (url.startsWith("http://")) {
    return url.replace(/^http:\/\//, "https://");
  }

  return url;
}

function parseBaiduResponse(raw: string): BaiduResponse | null {
  try {
    return JSON.parse(raw) as BaiduResponse;
  } catch (error) {
    return null;
  }
}

async function fetchBaiduImage(
  destination: string,
  query: string,
  extras: string[]
): Promise<{ image: ImageResult | null; debug: SearchDebug }> {
  const params = new URLSearchParams({
    tn: "resultjson_com",
    ipn: "rj",
    ct: "201326592",
    is: "0",
    fp: "result",
    queryWord: query,
    word: query,
    pn: "0",
    rn: RESULT_LIMIT.toString(),
    gsm: "1",
    ajax: "1"
  });

  const endpoint = `${SOURCE_ENDPOINT}?${params.toString()}`;
  const response = await fetchWithTimeout(endpoint, { cache: "no-store" });

  if (!response.ok) {
    return {
      image: null,
      debug: {
        destination,
        extras,
        query,
        source: SOURCE_NAME,
        sampleResults: [],
        selected: undefined
      }
    };
  }

  const raw = await response.text();
  const payload = parseBaiduResponse(raw);

  const items = payload?.data?.filter(Boolean) ?? [];
  const samples = items.slice(0, 5).map(item => ({
    title: sanitizeTerm(item.fromPageTitle),
    src: normalizeUrl(item.middleURL ?? item.thumbURL ?? item.objURL),
    from: item.fromURL ?? item.site ?? item.source
  }));

  for (const item of items) {
    const primary = pickBestUrl(item);
    if (!primary) {
      continue;
    }

    const thumbnail = pickThumbnail(item, primary);
    const title = sanitizeTerm(item.fromPageTitle) || query;
    const from = item.fromURL ?? item.site ?? item.source;

    return {
      image: {
        id: primary,
        src: primary,
        alt: `${title} 风光`,
        credit: {
          sourceName: SOURCE_NAME,
          sourceUrl: from
        },
        thumbnail
      },
      debug: {
  destination,
        extras,
        query,
        source: SOURCE_NAME,
        sampleResults: samples,
        selected: {
          title,
          src: primary,
          from
        }
      }
    };
  }

  return {
    image: null,
    debug: {
  destination,
      extras,
      query,
      source: SOURCE_NAME,
      sampleResults: samples,
      selected: undefined
    }
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const destination = sanitizeTerm(searchParams.get("query"));
  const extras = searchParams.getAll("extras").map(entry => sanitizeTerm(entry)).filter(Boolean);

  if (!destination) {
    return NextResponse.json({ error: "Missing destination query" }, { status: 400 });
  }

  const query = buildQuery(destination, extras);
  const { image, debug } = await fetchBaiduImage(destination, query, extras);

  const responseDebug: SearchDebug = {
    destination,
    extras,
    query,
    source: SOURCE_NAME,
    sampleResults: debug.sampleResults,
    selected: debug.selected
  };

  return NextResponse.json({ image, debug: responseDebug });
}
