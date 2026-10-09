"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fulfillRewardClaim,
  getRewardClaims,
} from "./actions";

type Claim = {
  id: string;
  member_id: string;
  reward_id: string;
  season_id: string;
  status: "claimed" | "fulfilled" | "cancelled";
  claimed_at: string;
  fulfilled_by: string | null;
  fulfilled_at: string | null;

  members:
    | {
        id: string;
        member_number: string;
        full_name: string;
      }
    | {
        id: string;
        member_number: string;
        full_name: string;
      }[]
    | null;

  rewards:
    | {
        id: string;
        level: number;
        required_points: number;
        name: string;
        description: string;
      }
    | {
        id: string;
        level: number;
        required_points: number;
        name: string;
        description: string;
      }[]
    | null;

  seasons:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
};

export default function RewardClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [fulfillingId, setFulfillingId] =
    useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadClaims() {
    try {
      setLoading(true);
      setError("");

      const result = await getRewardClaims();

      setClaims(result as Claim[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load reward claims."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClaims();
  }, []);

  async function handleFulfill(claimId: string) {
    const confirmed = window.confirm(
      "Mark this reward as fulfilled? This means the member has received the reward."
    );

    if (!confirmed) {
      return;
    }

    try {
      setFulfillingId(claimId);
      setError("");

      await fulfillRewardClaim(claimId);

      await loadClaims();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to fulfill reward."
      );
    } finally {
      setFulfillingId(null);
    }
  }

  function getMember(claim: Claim) {
    return Array.isArray(claim.members)
      ? claim.members[0]
      : claim.members;
  }

  function getReward(claim: Claim) {
    return Array.isArray(claim.rewards)
      ? claim.rewards[0]
      : claim.rewards;
  }

  function getSeason(claim: Claim) {
    return Array.isArray(claim.seasons)
      ? claim.seasons[0]
      : claim.seasons;
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  const pendingClaims = claims.filter(
    (claim) => claim.status === "claimed"
  );

  const fulfilledClaims = claims.filter(
    (claim) => claim.status === "fulfilled"
  );

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">

        {/* Header */}
        <header className="mb-8">

          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
          >
            ← Back to Dashboard
          </Link>

          <p className="mt-6 text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            ORGANIZATION PORTAL
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Reward Claims
          </h1>

          <p className="mt-2 text-zinc-400">
            Manage member reward claims and fulfillment.
          </p>

        </header>

        {/* Stats */}
        <section className="mb-8 grid gap-4 sm:grid-cols-3">

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Total Claims
            </p>

            <p className="mt-3 text-4xl font-black">
              {claims.length}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Awaiting Fulfillment
            </p>

            <p className="mt-3 text-4xl font-black">
              {pendingClaims.length}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Fulfilled
            </p>

            <p className="mt-3 text-4xl font-black">
              {fulfilledClaims.length}
            </p>
          </div>

        </section>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-900 bg-red-950/30 p-4">
            <p className="text-sm text-red-300">
              {error}
            </p>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center">
            <p className="text-zinc-500">
              Loading reward claims...
            </p>
          </div>
        ) : claims.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center">
            <p className="text-zinc-500">
              No reward claims yet.
            </p>
          </div>
        ) : (
          <section className="space-y-4">

            {claims.map((claim) => {
              const member = getMember(claim);
              const reward = getReward(claim);
              const season = getSeason(claim);

              const fulfilling =
                fulfillingId === claim.id;

              return (
                <article
                  key={claim.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
                >

                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

                    {/* Member */}
                    <div className="min-w-0 flex-1">

                      <div className="flex flex-wrap items-center gap-3">

                        <h2 className="text-xl font-bold">
                          {member?.full_name ?? "Unknown Member"}
                        </h2>

                        <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                          {claim.status}
                        </span>

                      </div>

                      <p className="mt-1 text-sm text-zinc-500">
                        {member?.member_number ?? "Unknown member number"}
                      </p>

                    </div>

                    {/* Reward */}
                    <div className="flex-1">

                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                        Reward
                      </p>

                      <p className="mt-1 font-semibold">
                        {reward?.name ?? "Unknown Reward"}
                      </p>

                      {reward && (
                        <p className="mt-1 text-sm text-zinc-500">
                          Level {reward.level} ·{" "}
                          {reward.required_points.toLocaleString()} points
                        </p>
                      )}

                    </div>

                    {/* Season */}
                    <div className="flex-1">

                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                        Season
                      </p>

                      <p className="mt-1 font-semibold">
                        {season?.name ?? "Unknown Season"}
                      </p>

                      <p className="mt-1 text-xs text-zinc-600">
                        Claimed {formatDate(claim.claimed_at)}
                      </p>

                    </div>

                    {/* Action */}
                    <div className="shrink-0">

                      {claim.status === "claimed" && (
                        <button
                          type="button"
                          onClick={() =>
                            handleFulfill(claim.id)
                          }
                          disabled={fulfilling}
                          className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {fulfilling
                            ? "Updating..."
                            : "Mark Fulfilled"}
                        </button>
                      )}

                      {claim.status === "fulfilled" && (
                        <div className="text-right">

                          <p className="text-sm font-semibold text-white">
                            ✓ Fulfilled
                          </p>

                          {claim.fulfilled_at && (
                            <p className="mt-1 text-xs text-zinc-600">
                              {formatDate(
                                claim.fulfilled_at
                              )}
                            </p>
                          )}

                        </div>
                      )}

                    </div>

                  </div>

                </article>
              );
            })}

          </section>
        )}

      </div>
    </main>
  );
}