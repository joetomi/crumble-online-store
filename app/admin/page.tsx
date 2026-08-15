"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [passwordInput, setPasswordInput] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const passwordRef = useRef<HTMLInputElement>(null);

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
      setAttempts(0);
    } catch (loginError) {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setError(loginError instanceof Error ? loginError.message : "كلمة المرور غير صحيحة");
      window.requestAnimationFrame(() => {
        passwordRef.current?.focus();
        passwordRef.current?.select();
      });
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
            <div className="admin-password-field" dir="ltr">
              <input
                ref={passwordRef}
                type={showPassword ? "text" : "password"}
                value={passwordInput}
                onChange={(event) => {
                  setPasswordInput(event.target.value);
                  if (error) setError("");
                }}
                placeholder="كلمة المرور"
                autoComplete="current-password"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "admin-password-error" : undefined}
              />
              <button
                type="button"
                className={`admin-password-toggle ${showPassword ? "is-visible" : ""}`}
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {error && (
              <div className="admin-auth-error" id="admin-password-error" role="alert">
                <strong>الرمز غير صحيح</strong>
                <span>تأكد من الرمز وحاول مجدداً — المحاولة {attempts}</span>
              </div>
            )}
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
