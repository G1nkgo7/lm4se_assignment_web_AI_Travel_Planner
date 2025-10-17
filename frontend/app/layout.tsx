import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "AI Travel Planner",
  description: "智能行程规划师，语音与地图协同的旅行助手"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
