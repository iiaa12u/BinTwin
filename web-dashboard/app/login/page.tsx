"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : null;

      if (!res.ok) {
        throw new Error(data?.error || "Invalid email or password");
      }

      const role = data?.user?.role;

      if (role === "ADMINISTRATOR") {
        router.replace("/admin");
      } else if (role === "OPERATIONS_PLANNER") {
        router.replace("/dashboard");
      } else if (role === "TRUCK_DRIVER") {
        router.replace("/driver");
      } else {
        router.replace("/");
      }
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

      <div className="absolute inset-0 bg-slate-950/55" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-emerald-400/30 bg-slate-950/60 p-8 shadow-2xl backdrop-blur-md">
            <div className="mb-6 text-center">
              <div className="mb-6 flex justify-center">
                <img
                  src="/bintwin-logo.png"
                  alt="BinTwin logo"
                  className="h-20 w-auto drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]"
                />
              </div>

              <p className="text-sm text-gray-300">
                Digital Twin Intelligence for Smart Waste Operations.
              </p>

              <h1 className="mt-5 text-3xl font-bold text-white">
                Sign In to BinTwin
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-200">
                  User ID
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your User ID"
                  className="w-full rounded-lg border border-emerald-400/20 bg-slate-900/70 px-4 py-3 text-white placeholder:text-gray-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-200">
                  Password
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-lg border border-emerald-400/20 bg-slate-900/70 px-4 py-3 pr-12 text-white placeholder:text-gray-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-300 hover:text-white"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="flex w-full items-center justify-center rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Signing In...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => router.push("/forgot-password")}
                  className="text-sm text-gray-300 hover:text-white"
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          </div>
        </div>

        <footer className="relative z-10 border-t border-white/10 bg-slate-950/70 px-6 py-4 text-sm text-gray-300">
          © 2025 BinTwin Digital Twin Platform — Smart Waste Innovation
        </footer>
      </div>
    </div>
  );
}