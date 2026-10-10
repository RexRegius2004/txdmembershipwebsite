

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function logout() {
  "use server";

  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/login");
}

async function DashboardContent() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return (
      <main className="min-h-screen bg-[#09090b] p-8 text-white">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-bold">
            Profile Error
          </h1>

          <p className="mt-2 text-zinc-400">
            Your account exists, but no organization profile
            was found.
          </p>
        </div>
      </main>
    );
  }

  /*
   * Members should not access the administrative dashboard.
   * Send them directly to their own Battle Pass.
   */
  if (profile.role === "member") {
    redirect("/my-battle-pass");
  }

  /*
   * Only admin and officer accounts should reach this point.
   */
  if (
    profile.role !== "admin" &&
    profile.role !== "officer"
  ) {
    return (
      <main className="min-h-screen bg-[#09090b] p-8 text-white">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-bold">
            Access Restricted
          </h1>

          <p className="mt-2 text-zinc-400">
            Your account does not have a recognized organization
            role.
          </p>
        </div>
      </main>
    );
  }

  const { count: memberCount } = await supabase
    .from("members")
    .select("*", {
      count: "exact",
      head: true,
    });

  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("*")
    .eq("status", "active")
    .maybeSingle();

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500">
              ORGANIZATION PORTAL
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Dashboard
            </h1>

            <p className="mt-2 text-zinc-400">
              Welcome back, {profile.full_name}.
            </p>
          </div>

          <div className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2">
            <span className="text-sm text-zinc-400">
              {profile.role}
            </span>
          </div>
        </header>

        {/* Overview */}
        <section className="mt-10 grid gap-4 md:grid-cols-2">

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
            <p className="text-sm text-zinc-500">
              TOTAL MEMBERS
            </p>

            <p className="mt-3 text-4xl font-bold">
              {memberCount ?? 0}
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              Registered organization members
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
            <p className="text-sm text-zinc-500">
              CURRENT SEASON
            </p>

            <p className="mt-3 text-2xl font-bold">
              {activeSeason?.name ?? "No active season"}
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              {activeSeason
                ? `${activeSeason.start_date} → ${activeSeason.end_date}`
                : "Create a season to begin"}
            </p>
          </div>

        </section>

        {/* Quick Actions */}
        <section className="mt-10">

          <p className="text-sm font-medium text-zinc-500">
            QUICK ACTIONS
          </p>

          <h2 className="mt-1 text-xl font-semibold">
            Manage the organization
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">

            {/* Scanner */}
            <Link
              href="/scanner"
              className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition hover:border-zinc-600 hover:bg-zinc-800"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl text-black">
                📱
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                Scan Member
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Scan a member&apos;s QR card and award points for
                organization activities.
              </p>

              <p className="mt-4 text-sm font-medium text-zinc-300">
                Open scanner →
              </p>
            </Link>

            {/* Members */}
            <Link
              href="/members"
              className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition hover:border-zinc-600 hover:bg-zinc-800"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl text-black">
                👥
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                Manage Members
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Create members, manage their status, and
                generate membership QR codes.
              </p>

              <p className="mt-4 text-sm font-medium text-zinc-300">
                View members →
              </p>
            </Link>

            {/* Battle Pass */}
            <Link
              href="/battle-pass"
              className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition hover:border-zinc-600 hover:bg-zinc-800"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl text-black">
                🏆
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                Battle Pass
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                View seasonal member progression and Battle Pass
                rewards.
              </p>

              <p className="mt-4 text-sm font-medium text-zinc-300">
                Open Battle Pass →
              </p>
            </Link>

            {/* Core Reviews */}
            <Link
              href="/reviews"
              className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition hover:border-zinc-600 hover:bg-zinc-800"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl text-black">
                🌟
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                Core Reviews
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Review Core Member candidates and maintenance
                evaluations.
              </p>

              <p className="mt-4 text-sm font-medium text-zinc-300">
                Open reviews →
              </p>
            </Link>

            {/* Reward Claims */}
            <Link
              href="/reward-claims"
              className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition hover:border-zinc-600 hover:bg-zinc-800"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl text-black">
                🎁
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                Reward Claims
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Review member reward claims and mark physical or
                organization rewards as fulfilled.
              </p>

              <p className="mt-4 text-sm font-medium text-zinc-300">
                Manage reward claims →
              </p>
            </Link>

            {/* Season Manager */}
            <Link
              href="/dashboard/seasons"
              className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition hover:border-zinc-600 hover:bg-zinc-800"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl text-black">
                📅
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                Season Manager
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Create, start, and close membership seasons while
                preserving historical records.
              </p>

              <p className="mt-4 text-sm font-medium text-zinc-300">
                Manage seasons →
              </p>
            </Link>

          </div>
        </section>

        {/* Account */}
        <section className="mt-10 border-t border-zinc-900 pt-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
                Signed in as
              </p>

              <p className="mt-1 text-sm text-zinc-400">
                {user.email}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">

              {/* Change Password */}
              <Link
                href="/change-password"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
              >
                Change Password
              </Link>

              {/* Logout */}
              <form action={logout}>
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-2.5 text-sm font-medium text-red-400 transition hover:border-red-800 hover:bg-red-950/60 hover:text-red-300 sm:w-auto"
                >
                  Log Out
                </button>
              </form>

            </div>

          </div>
        </section>

      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#09090b] text-white">
          <p className="text-zinc-500">
            Loading dashboard...
          </p>
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}