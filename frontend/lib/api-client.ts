const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

interface RequestOptions {
  token?: string;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

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
    if (sanitizedPath.startsWith(`${normalizedBase}/`)) {
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

async function requestJSON<T>(
  method: string,
  url: string,
  payload?: unknown,
  options: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers ?? {})
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(toAbsoluteUrl(url), {
    method,
    headers,
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
    signal: options.signal
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`请求失败: ${response.status} ${detail}`.trim());
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getJSON<T>(url: string, options?: RequestOptions): Promise<T> {
  return requestJSON<T>("GET", url, undefined, options);
}

export function postJSON<T>(url: string, payload: unknown, options?: RequestOptions): Promise<T> {
  return requestJSON<T>("POST", url, payload, options);
}

export function putJSON<T>(url: string, payload: unknown, options?: RequestOptions): Promise<T> {
  return requestJSON<T>("PUT", url, payload, options);
}

export function deleteJSON(url: string, options?: RequestOptions): Promise<void> {
  return requestJSON<void>("DELETE", url, undefined, options);
}
