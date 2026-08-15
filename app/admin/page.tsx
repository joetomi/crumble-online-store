"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [passwordInput, setPasswordInput] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/login", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { authenticated?: boolean }) => setIsAuthenticated(Boolean(data.authenticated)))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setChecking(false));
  }, []);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !data.success) throw new Error(data.error || "تعذر تسجيل الدخول");
      setIsAuthenticated(true);
      setPasswordInput("");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "كلمة المرور غير صحيحة");
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) return <main className="admin-auth-shell" aria-label="جارٍ التحقق" />;

  if (!isAuthenticated) {
    return (
      <main className="admin-auth-shell" dir="rtl">
        <div className="admin-auth-card">
          <div className="admin-auth-header">
            <div className="admin-logo-circle">
              <img src="/brand/crumble-logo.png" alt="شعار Crumble" />
            </div>
            <h1>لوحة إدارة متجر Crumble</h1>
            <p>أدخل كلمة المرور للوصول إلى لوحة التحكم والنشر المباشر.</p>
          </div>

          <form onSubmit={handleLogin} className="admin-auth-form">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="كلمة المرور..."
            />
            {error && <span className="admin-auth-error">{error}</span>}
            <button type="submit" disabled={submitting}>{submitting ? "جارٍ الدخول..." : "تسجيل الدخول"}</button>
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
