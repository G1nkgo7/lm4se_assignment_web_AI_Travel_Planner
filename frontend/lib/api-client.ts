const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

function toAbsoluteUrl(path: string): string {
  if (/^https?:/i.test(path)) {
    return path;
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
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
