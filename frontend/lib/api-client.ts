const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

function joinUrl(base: string, path: string): string {
  const sanitizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!base) {
    return sanitizedPath;
  }

  if (/^https?:/i.test(base)) {
    return `${base.replace(/\/$/, "")}${sanitizedPath}`;
  }

  if (base.startsWith("/")) {
    const normalizedBase = base.replace(/\/$/, "");
    if (sanitizedPath.startsWith(normalizedBase + "/")) {
      return sanitizedPath;
    }
    return `${normalizedBase}${sanitizedPath}`;
  }

  return sanitizedPath;
}

function toAbsoluteUrl(path: string): string {
  if (/^https?:/i.test(path)) {
    return path;
  }

  return joinUrl(API_BASE_URL, path);
}

export async function postJSON<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(toAbsoluteUrl(url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`请求失败: ${response.status} ${detail}`);
  }

  return (await response.json()) as T;
}
