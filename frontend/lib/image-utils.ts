export interface ScenicImageCredit {
  author?: string;
  authorUrl?: string;
  sourceName?: string;
  sourceUrl?: string;
}

export interface ScenicImage {
  id: string;
  src: string;
  alt: string;
  keywords: RegExp[];
  priority?: number;
  fallback?: boolean;
  credit?: ScenicImageCredit;
  thumbnail?: string;
}

const SCENIC_LIBRARY: ScenicImage[] = [
  {
    id: "suzhou-canal",
    src: "https://images.unsplash.com/photo-1463592177119-bab2a00f3ccb?auto=format&fit=crop&w=1600&q=80",
    alt: "苏州古运河夜景",
    keywords: [/苏州/, /suzhou/i, /园林/, /水乡/],
    priority: 5
  },
  {
    id: "jinan-spring",
    src: "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1600&q=80",
    alt: "济南趵突泉景观",
    keywords: [/济南/, /泉城/, /趵突泉/, /spring water/, /baotu/i],
    priority: 5
  },
  {
    id: "city-night",
    src: "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1600&q=80",
    alt: "现代城市夜景",
    keywords: [/夜景/, /夜生活/, /上海/, /北京/, /广州/, /深圳/, /city/, /skyline/],
    priority: 4
  },
  {
    id: "coastline",
    src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80",
    alt: "海岸线日落",
    keywords: [/海/, /沙滩/, /岛/, /海岛/, /sanya/i, /coast/, /island/],
    priority: 3
  },
  {
    id: "mountain",
    src: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=1600&q=80",
    alt: "高山云海",
    keywords: [/山/, /峰/, /雪/, /川/, /西藏/, /香格里拉/, /huangshan/i, /mountain/],
    priority: 3
  },
  {
    id: "forest-valley",
    src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80",
    alt: "森林峡谷",
    keywords: [/林/, /峡谷/, /自然/, /张家界/, /九寨沟/, /forest/, /valley/],
    priority: 2
  },
  {
    id: "grassland",
    src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
    alt: "星空下的草原",
    keywords: [/草原/, /牧场/, /内蒙古/, /新疆/, /草地/, /prairie/],
    priority: 2
  },
  {
    id: "heritage",
    src: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1600&q=80",
    alt: "历史文化街区",
    keywords: [/历史/, /文化/, /博物馆/, /古镇/, /城墙/, /西安/, /南京/],
    priority: 4
  },
  {
    id: "temple",
    src: "https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?auto=format&fit=crop&w=1600&q=80",
    alt: "传统寺庙",
    keywords: [/寺/, /庙/, /佛/, /香火/, /祈福/, /temple/],
    priority: 2
  },
  {
    id: "night-market",
    src: "https://images.unsplash.com/photo-1527903789995-dc8ad2ad6de0?auto=format&fit=crop&w=1600&q=80",
    alt: "夜市美食",
    keywords: [/美食/, /餐饮/, /小吃/, /夜市/, /food/, /cuisine/, /market/],
    priority: 4
  },
  {
    id: "default",
    src: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1600&q=80",
    alt: "旅行风光",
    keywords: [],
    fallback: true,
    priority: 1
  }
];

const DEFAULT_IMAGE = SCENIC_LIBRARY.find(item => item.fallback) ?? SCENIC_LIBRARY[0];

const SCENIC_LOOKUP = new Map(SCENIC_LIBRARY.map(image => [image.id, image] as const));

const DESTINATION_IMAGE_RULES: Array<{ imageId: string; matchers: RegExp[] }> = [
  {
    imageId: "suzhou-canal",
    matchers: [/^(苏州|suzhou)/i, /园林/, /平江/, /拙政园/]
  },
  {
    imageId: "jinan-spring",
    matchers: [/^(济南|jinan)/i, /趵突泉/, /大明湖/, /泉城/]
  },
  {
    imageId: "heritage",
    matchers: [/西安/, /兵马俑/, /古城墙/, /xian/i]
  },
  {
    imageId: "mountain",
    matchers: [/黄山/, /huangshan/i, /张家界/, /香格里拉/]
  },
  {
    imageId: "coastline",
    matchers: [/三亚/, /厦门/, /厦大白城/, /sanya/i, /xiamen/i]
  }
];

const IMAGE_SEARCH_ENDPOINT = "/api/images/search";

function combineTexts(parts: string[]): string {
  return parts
    .filter(Boolean)
    .map(part => part.toLowerCase())
    .join(" ");
}

function pickScenicImage(texts: string[], offset = 0): ScenicImage {
  const combined = combineTexts(texts);
  if (!combined) {
    return DEFAULT_IMAGE;
  }

  const matches = SCENIC_LIBRARY
    .map(image => {
      const score = image.keywords.reduce((acc, pattern) => {
        return pattern.test(combined) ? acc + 1 : acc;
      }, 0);
      return { image, score };
    })
    .filter(entry => entry.score > 0);

  if (matches.length === 0) {
    return DEFAULT_IMAGE;
  }

  matches.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const priorityA = a.image.priority ?? 0;
    const priorityB = b.image.priority ?? 0;
    return priorityB - priorityA;
  });

  const index = offset % matches.length;
  return matches[index].image;
}

export function pickDestinationImage(destination?: string, extras: string[] = []): ScenicImage {
  if (destination) {
    const normalized = destination.trim();
    if (normalized) {
      const combinedHints = [normalized, ...extras].join(" ").toLowerCase();
      for (const rule of DESTINATION_IMAGE_RULES) {
        if (rule.matchers.some(pattern => pattern.test(normalized) || pattern.test(combinedHints))) {
          const scenic = SCENIC_LOOKUP.get(rule.imageId);
          if (scenic) {
            return scenic;
          }
        }
      }
    }
  }
  return pickScenicImage([destination ?? "", ...extras]);
}

interface RemoteImagePayload {
  id?: string;
  src?: string;
  alt?: string;
  credit?: ScenicImageCredit;
  thumbnail?: string;
}

interface RemoteImageResponse {
  image?: RemoteImagePayload | null;
  error?: string;
}

function sanitizeExtras(extras: string[]): string[] {
  return extras
    .map(extra => extra?.trim())
    .filter((extra): extra is string => Boolean(extra))
    .map(extra => extra.replace(/\s+/g, " "))
    .slice(0, 6);
}

export async function fetchDestinationImageOnline(
  destination?: string,
  extras: string[] = []
): Promise<ScenicImage | null> {
  const query = destination?.trim();

  if (!query) {
    return null;
  }

  const params = new URLSearchParams({ query });
  const sanitizedExtras = sanitizeExtras(extras);

  for (const extra of sanitizedExtras) {
    params.append("extras", extra);
  }

  const response = await fetch(`${IMAGE_SEARCH_ENDPOINT}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Image search failed: ${response.status}`);
  }

  const payload = (await response.json()) as RemoteImageResponse;

  if (!payload.image?.src) {
    return null;
  }

  return {
    id: payload.image.id ?? `remote-${payload.image.src}`,
    src: payload.image.src,
    alt: payload.image.alt ?? buildAltText(destination),
    keywords: [],
    credit: payload.image.credit,
    thumbnail: payload.image.thumbnail
  };
}

export function pickGalleryImage(
  offset: number,
  destination?: string,
  extras: string[] = []
): ScenicImage {
  return pickScenicImage([destination ?? "", ...extras], offset);
}

export function buildAltText(destination?: string, fallback = "旅行风景"): string {
  if (destination) {
    return `${destination} 风光`;
  }
  return fallback;
}
