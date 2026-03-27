"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : null;

      if (!res.ok) {
        throw new Error(data?.error || "Failed to submit request");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/login-bg.png')" }}
      />
      <div className="absolute inset-0 bg-slate-950/60" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-emerald-400/30 bg-slate-950/60 p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-6 text-center">
            <div className="mb-6 flex justify-center">
              <img
                src="/bintwin-logo.png"
                alt="BinTwin logo"
                className="h-16 w-auto drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]"
              />
            </div>

            <h1 className="text-3xl font-bold text-white">Forgot Password</h1>
            <p className="mt-3 text-sm text-gray-300">
              Enter your email and we will notify your administrator.
            </p>
          </div>

          {submitted ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-200">
                Your administrator has been notified and will be in touch soon.
              </div>

              <button
                onClick={() => router.push("/login")}
                className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-200">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-lg border border-emerald-400/20 bg-slate-900/70 px-4 py-3 text-white placeholder:text-gray-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Submitting..." : "Submit Request"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/login")}
                className="w-full rounded-lg border border-gray-600 px-4 py-3 text-sm font-semibold text-gray-200 hover:bg-white/5"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}