"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

const ADMIN_AUTH_KEY = "crumble-admin-auth-v1";
const DEFAULT_ADMIN_PASSWORD = "admin";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? sessionStorage.getItem(ADMIN_AUTH_KEY) : null;
    if (saved === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    if (passwordInput.trim() === DEFAULT_ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem(ADMIN_AUTH_KEY, "true");
      setError("");
    } else {
      setError("كلمة المرور غير صحيحة");
    }
  }

  if (!isAuthenticated) {
    return (
      <main className="admin-auth-shell" dir="rtl">
        <div className="admin-auth-card">
          <div className="admin-auth-header">
            <div className="admin-logo-circle">
              <img src="/brand/crumble-logo.png" alt="شعار Crumble" />
            </div>
            <h1>لوحة إدارة متجر Crumble</h1>
            <p>أدخل كلمة المرور لدخول لوحة التحكم الشاملة (الافتراضي: admin)</p>
          </div>

          <form onSubmit={handleLogin} className="admin-auth-form">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="كلمة المرور..."
              autoFocus
            />
            {error && <span className="admin-auth-error">{error}</span>}
            <button type="submit">تسجيل الدخول</button>
          </form>

          <Link href="/" className="admin-back-link">
            ← العودة للمتجر
          </Link>
        </div>
      </main>
    );
  }

  return <AdminDashboard />;
}
