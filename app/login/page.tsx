"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();

    const {
      data: { user },
      error: signInError,
    } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    if (!user) {
      setError("Login failed. Please try again.");
      setLoading(false);
      return;
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("role, must_change_password")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();

      setError(
        "Your account profile could not be found. Please contact an administrator."
      );

      setLoading(false);
      return;
    }

    if (profile.must_change_password) {
      router.replace("/change-password");
      router.refresh();
      return;
    }

    if (profile.role === "member") {
      router.replace("/my-battle-pass");
      router.refresh();
      return;
    }

    if (
      profile.role === "admin" ||
      profile.role === "officer"
    ) {
      router.replace("/dashboard");
      router.refresh();
      return;
    }

    await supabase.auth.signOut();

    setError(
      "Your account has an invalid role. Please contact an administrator."
    );

    setLoading(false);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#09090b] px-6 py-12 text-white">

      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-280px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-zinc-800/20 blur-[120px]" />

        <div className="absolute bottom-[-250px] left-[-150px] h-[400px] w-[400px] rounded-full bg-zinc-800/10 blur-[120px]" />

        <div className="absolute right-[-150px] top-[30%] h-[350px] w-[350px] rounded-full bg-zinc-800/10 blur-[120px]" />
      </div>

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 w-full max-w-[420px]">

        {/* Brand */}
        <div className="mb-8 text-center">

          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-700/80 bg-zinc-900 shadow-2xl shadow-black/40">
            <div className="h-6 w-6 rounded-lg border border-zinc-500 bg-zinc-800" />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-white">
            TxD Member Portal
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Your membership, rewards, and community.
          </p>

        </div>

        {/* Login card */}
        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/80 p-7 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">

          <div className="mb-7">
            <h2 className="text-lg font-semibold text-white">
              Welcome back
            </h2>

            <p className="mt-1.5 text-sm text-zinc-500">
              Sign in to continue to your account.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {error && (
              <div className="rounded-2xl border border-red-900/60 bg-red-950/30 px-4 py-3.5">
                <p className="text-sm leading-5 text-red-400">
                  {error}
                </p>
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                autoComplete="email"
                required
                placeholder="you@example.com"
                disabled={loading}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-700 hover:border-zinc-700 focus:border-zinc-500 focus:ring-4 focus:ring-white/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium uppercase tracking-wider text-zinc-500"
                >
                  Password
                </label>

                <span className="text-xs text-zinc-700">
                  Secure login
                </span>
              </div>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                autoComplete="current-password"
                required
                placeholder="••••••••"
                disabled={loading}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-700 hover:border-zinc-700 focus:border-zinc-500 focus:ring-4 focus:ring-white/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={
                loading ||
                !email ||
                !password
              }
              className="group relative w-full overflow-hidden rounded-2xl bg-white px-4 py-3.5 text-sm font-semibold text-black shadow-lg shadow-black/20 transition hover:bg-zinc-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="relative z-10">
                {loading
                  ? "Signing in..."
                  : "Sign in"}
              </span>

              {!loading && (
                <span className="absolute inset-y-0 right-5 flex items-center text-zinc-400 transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              )}
            </button>

          </form>

        </div>

        {/* Footer */}
        <div className="mt-7 text-center">
          <p className="text-xs text-zinc-700">
            TablesxDelusions
          </p>
        </div>

      </div>
    </main>
  );
}

