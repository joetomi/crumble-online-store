"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
import { defaultContent, readLocalContent } from "@/lib/store-content";
import type { StoreContent } from "@/lib/types";
import { StoriesCarousel } from "@/components/store/stories-carousel";

const AUTH_STORAGE_KEY = "crumble-stories-auth-v1";
const DEFAULT_PASSWORD = "admin";

export default function StoriesPage() {
  const [content, setContent] = useState<StoreContent>(defaultContent);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setContent(readLocalContent());
    const savedAuth = typeof window !== "undefined" ? sessionStorage.getItem(AUTH_STORAGE_KEY) : null;
    if (savedAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    if (passwordInput.trim() === DEFAULT_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem(AUTH_STORAGE_KEY, "true");
      setError("");
    } else {
      setError("كلمة المرور غير صحيحة");
    }
  }

  const stories = content.stories?.filter((story) => story.enabled !== false) ?? [];

  if (!isAuthenticated) {
    return (
      <main className="stories-auth-container">
        <div className="stories-auth-card">
          <div className="stories-auth-header">
            <span className="stories-lock-icon">🔒</span>
            <h1>ستوريات Crumble</h1>
            <p>أدخل كلمة المرور لعرض الصفحة (الافتراضي: admin)</p>
          </div>

          <form onSubmit={handleLogin} className="stories-auth-form">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="كلمة المرور..."
              autoFocus
            />
            {error && <span className="stories-auth-error">{error}</span>}

            <button type="submit">دخول</button>
          </form>

          <Link href="/" className="stories-back-home">
            ← العودة للمتجر
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="stories-page-layout">
      <header className="stories-page-head">
        <Link href="/" className="stories-head-back">
          ← المتجر الرئيسي
        </Link>
        <div className="stories-head-title">
          <b>CRUMBLE STORIES</b>
        </div>
        <button
          type="button"
          className="stories-head-lock"
          onClick={() => {
            setIsAuthenticated(false);
            sessionStorage.removeItem(AUTH_STORAGE_KEY);
          }}
        >
          قفل 🔒
        </button>
      </header>

      <div className="stories-page-carousel-wrapper">
        <StoriesCarousel stories={stories} />
      </div>
    </main>
  );
}
