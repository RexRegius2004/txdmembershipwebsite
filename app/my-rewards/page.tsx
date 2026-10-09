"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Reward = {
  id: string;
  level: number;
  required_points: number;
  name: string;
  description: string;
};

type RewardClaim = {
  id: string;
  reward_id: string;
  status: "claimed" | "fulfilled" | "cancelled";
  claimed_at: string;
  fulfilled_by: string | null;
  fulfilled_at: string | null;
  reward: Reward;
};

export default function MyRewardsPage() {
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRewards() {
      try {
        setLoading(true);
        setError("");

        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error(
            "You must be logged in to view your rewards."
          );
        }

        const { data, error: rpcError } = await supabase.rpc(
          "get_my_reward_claims"
        );

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        setClaims((data ?? []) as RewardClaim[]);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your rewards."
        );
      } finally {
        setLoading(false);
      }
    }

    loadRewards();
  }, []);

  function formatDate(value: string | null) {
    if (!value) {
      return "Not available";
    }

    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function statusLabel(status: RewardClaim["status"]) {
    if (status === "claimed") {
      return "Awaiting Fulfillment";
    }

    if (status === "fulfilled") {
      return "Fulfilled";
    }

    return "Cancelled";
  }

  function statusClass(status: RewardClaim["status"]) {
    if (status === "fulfilled") {
      return "border-white text-white";
    }

    if (status === "claimed") {
      return "border-zinc-600 text-zinc-300";
    }

    return "border-red-900 text-red-400";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center">
            <p className="text-zinc-500">
              Loading your rewards...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="rounded-2xl border border-red-900 bg-red-950/30 p-8">

            <p className="text-sm uppercase tracking-wider text-red-500">
              Rewards
            </p>

            <h1 className="mt-2 text-2xl font-bold">
              Unable to load rewards
            </h1>

            <p className="mt-3 text-sm text-red-300">
              {error}
            </p>

          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">

        {/* Header */}
        <header className="mb-8">

          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            Member Portal
          </p>

          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

            <div>
              <h1 className="text-4xl font-black tracking-tight">
                My Rewards
              </h1>

              <p className="mt-2 text-zinc-400">
                View your claimed and fulfilled Battle Pass rewards.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">

              <Link
                href="/profile"
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900 hover:text-white"
              >
                Profile
              </Link>

              <Link
                href="/my-battle-pass"
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
              >
                Battle Pass
              </Link>

            </div>

          </div>

        </header>


        {/* Summary */}
        <section className="mb-6 grid gap-4 sm:grid-cols-3">

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">

            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Total Claims
            </p>

            <p className="mt-2 text-3xl font-black">
              {claims.length}
            </p>

          </div>


          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">

            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Awaiting Fulfillment
            </p>

            <p className="mt-2 text-3xl font-black">
              {
                claims.filter(
                  (claim) => claim.status === "claimed"
                ).length
              }
            </p>

          </div>


          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">

            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Fulfilled
            </p>

            <p className="mt-2 text-3xl font-black">
              {
                claims.filter(
                  (claim) => claim.status === "fulfilled"
                ).length
              }
            </p>

          </div>

        </section>


        {/* Empty state */}
        {claims.length === 0 && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center">

            <p className="text-sm uppercase tracking-wider text-zinc-600">
              No Claims Yet
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Your reward shelf is empty.
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-500">
              Unlock rewards through the Battle Pass and claim them
              when they become available.
            </p>

            <Link
              href="/my-battle-pass"
              className="mt-6 inline-block rounded-xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-zinc-200"
            >
              View Battle Pass
            </Link>

          </section>
        )}


        {/* Claims */}
        {claims.length > 0 && (
          <section className="space-y-4">

            {claims.map((claim) => (
              <article
                key={claim.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
              >

                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

                  <div>

                    <div className="flex flex-wrap items-center gap-2">

                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                        Level {claim.reward.level}
                      </span>

                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusClass(
                          claim.status
                        )}`}
                      >
                        {statusLabel(claim.status)}
                      </span>

                    </div>

                    <h2 className="mt-2 text-2xl font-bold">
                      {claim.reward.name}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      {claim.reward.description}
                    </p>

                  </div>


                  <div className="text-left sm:text-right">

                    <p className="text-xs uppercase tracking-wider text-zinc-600">
                      Required Points
                    </p>

                    <p className="mt-1 text-lg font-bold">
                      {claim.reward.required_points.toLocaleString()}
                    </p>

                  </div>

                </div>


                <div className="mt-6 grid gap-4 border-t border-zinc-800 pt-5 sm:grid-cols-2">

                  <div>
                    <p className="text-xs uppercase tracking-wider text-zinc-600">
                      Claimed
                    </p>

                    <p className="mt-1 text-sm text-zinc-300">
                      {formatDate(claim.claimed_at)}
                    </p>
                  </div>


                  <div>
                    <p className="text-xs uppercase tracking-wider text-zinc-600">
                      Fulfilled
                    </p>

                    <p className="mt-1 text-sm text-zinc-300">
                      {claim.fulfilled_at
                        ? formatDate(claim.fulfilled_at)
                        : "Awaiting fulfillment"}
                    </p>
                  </div>

                </div>

              </article>
            ))}

          </section>
        )}

      </div>
    </main>
  );
}