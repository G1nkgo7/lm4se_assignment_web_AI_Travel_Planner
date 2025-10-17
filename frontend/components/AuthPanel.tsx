"use client";

import { useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";

interface AuthPanelProps {
  supabase: SupabaseClient | null;
  session: Session | null;
}

export function AuthPanel({ supabase, session }: AuthPanelProps) {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!supabase) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
        <p>未检测到 Supabase 配置，请在环境变量中设置 NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_ANON_KEY。</p>
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">已登录：{session.user.email ?? session.user.id}</p>
        <button
          className="mt-3 inline-flex items-center rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:bg-slate-400"
          onClick={async () => {
            setLoading(true);
            setStatus(null);
            try {
              await supabase.auth.signOut();
            } catch (error) {
              const message = error instanceof Error ? error.message : "退出失败";
              setStatus(message);
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
        >
          退出登录
        </button>
        {status && <p className="mt-2 text-xs text-amber-600">{status}</p>}
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!email || !password) {
      setStatus("请输入邮箱和密码");
      return;
    }

    if (mode === "signUp" && password !== confirmPassword) {
      setStatus("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      if (mode === "signIn") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw error;
        }
        setStatus("登录成功");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          throw error;
        }
        setStatus("注册成功，请查收验证邮件。");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "操作失败";
      setStatus(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          className={`text-sm font-medium ${mode === "signIn" ? "text-slate-900" : "text-slate-400"}`}
          onClick={() => setMode("signIn")}
        >
          登录
        </button>
        <span className="text-slate-300">/</span>
        <button
          type="button"
          className={`text-sm font-medium ${mode === "signUp" ? "text-slate-900" : "text-slate-400"}`}
          onClick={() => setMode("signUp")}
        >
          注册
        </button>
      </div>
      <div className="space-y-3">
        <div className="grid gap-2">
          <label className="text-xs font-medium text-slate-500">邮箱</label>
          <input
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            placeholder="you@example.com"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-xs font-medium text-slate-500">密码</label>
          <input
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            placeholder="至少 6 位"
          />
        </div>
        {mode === "signUp" && (
          <div className="grid gap-2">
            <label className="text-xs font-medium text-slate-500">确认密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              placeholder="再次输入密码"
            />
          </div>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand/90 disabled:bg-slate-300"
        >
          {loading ? "请稍候..." : mode === "signIn" ? "登录" : "注册"}
        </button>
        {status && <p className="text-xs text-amber-600">{status}</p>}
      </div>
    </div>
  );
}
