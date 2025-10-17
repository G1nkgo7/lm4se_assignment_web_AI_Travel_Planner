import type { NextFunction, Request, Response } from "express";
import { getUserFromAccessToken } from "../services/supabase-client";

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
    email?: string;
    token: string;
  };
}

function extractBearerToken(header?: string): string | null {
  if (!header) {
    return null;
  }

  const matches = header.match(/^Bearer\s+(.+)$/i);
  return matches?.[1]?.trim() ?? null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      res.status(401).json({ message: "未提供身份令牌" });
      return;
    }

    const user = await getUserFromAccessToken(token);

    (req as AuthenticatedRequest).auth = {
      userId: user.id,
      email: user.email ?? undefined,
      token
    };

    next();
  } catch (error) {
    if (error instanceof Error && error.message.includes("Supabase 未配置")) {
      res.status(503).json({ message: error.message });
      return;
    }

    const message = error instanceof Error ? error.message : "身份验证失败";
    res.status(401).json({ message });
  }
}
