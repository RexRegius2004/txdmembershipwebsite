"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ChangePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const forced = searchParams.get("required") === "1";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { error: passwordError } =
      await supabase.auth.updateUser({
        password: newPassword,
      });

    if (passwordError) {
      setError(passwordError.message);
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.rpc(
      "complete_password_change"
    );

    if (profileError) {
      setError(
        `Your password was changed, but we could not complete your account setup: ${profileError.message}`
      );
      setLoading(false);
      return;
    }

    setSuccess("Your password has been changed successfully.");

    setTimeout(() => {
      router.push("/dashboard");
    }, 800);
  }

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
        <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-7 shadow-2xl">
          <div className="mb-7">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {forced
                ? "Change Your Temporary Password"
                : "Change Password"}
            </h1>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {forced
                ? "You must create a new password before continuing."
                : "Choose a new password for your account."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="new-password"
                className="mb-2 block text-sm font-medium text-zinc-200"
              >
                New Password
              </label>

              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(event.target.value)
                }
                autoComplete="new-password"
                required
                minLength={8}
                className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none transition focus:border-zinc-500 focus:ring-1 focus:ring-zinc-600"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block text-sm font-medium text-zinc-200"
              >
                Confirm Password
              </label>

              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                autoComplete="new-password"
                required
                minLength={8}
                className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none transition focus:border-zinc-500 focus:ring-1 focus:ring-zinc-600"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-900/70 bg-red-950/30 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-emerald-900/70 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Changing Password..."
                : "Change Password"}
            </button>
          </form>

          {!forced && (
            <div className="mt-6 text-center">
              <Link
                href="/dashboard"
                className="text-sm text-zinc-500 transition hover:text-white"
              >
                ← Back to Dashboard
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}