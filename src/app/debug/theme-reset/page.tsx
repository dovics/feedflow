"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ThemeDebugPage() {
  const router = useRouter();

  useEffect(() => {
    localStorage.clear();
    window.location.href = '/';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>清除主题设置中...</p>
    </div>
  );
}
