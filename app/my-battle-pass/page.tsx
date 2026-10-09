"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import MemberNav from "@/components/member-nav";

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

type BattlePassData = {
  member: {
    id: string;
    member_number: string;
    full_name: string;
    membership_type: "standard" | "core";
  };
  season: {
    id: string;
    name: string;
    description: string | null;
    start_date: string;
    end_date: string;
  };
  progress: {
    points: number;
    level: number;
    total_levels: number;
    current_reward: Reward | null;
    next_reward: Reward | null;
  };
  rewards: Reward[];
};

export default function MyBattlePassPage() {
  const [data, setData] = useState<BattlePassData | null>(null);
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingRewardId, setClaimingRewardId] = useState<string | null>(
    null
  );
  const [error, setError] = useState("");
  const [claimError, setClaimError] = useState("");

  async function loadBattlePass() {
    try {
      setLoading(true);
      setError("");

      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to view your Battle Pass.");
      }

      const [
        { data: battlePassResult, error: battlePassError },
        { data: claimsResult, error: claimsError },
      ] = await Promise.all([
        supabase.rpc("get_my_battle_pass"),
        supabase.rpc("get_my_reward_claims"),
      ]);

      if (battlePassError) {
        throw new Error(battlePassError.message);
      }

      if (claimsError) {
        throw new Error(claimsError.message);
      }

      if (!battlePassResult) {
        throw new Error("Unable to load your Battle Pass.");
      }

      setData(battlePassResult as BattlePassData);
      setClaims((claimsResult ?? []) as RewardClaim[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your Battle Pass."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBattlePass();
  }, []);

  async function claimReward(reward: Reward) {
    if (!data) {
      return;
    }

    setClaimError("");
    setClaimingRewardId(reward.id);

    try {
      const supabase = createClient();

      const { data: result, error: rpcError } = await supabase.rpc(
        "claim_reward",
        {
          p_reward_id: reward.id,
        }
      );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (!result) {
        throw new Error("The reward could not be claimed.");
      }

      await loadBattlePass();
    } catch (err) {
      setClaimError(
        err instanceof Error
          ? err.message
          : "The reward could not be claimed."
      );
    } finally {
      setClaimingRewardId(null);
    }
  }

  function getClaim(rewardId: string) {
    return claims.find(
      (claim) => claim.reward_id === rewardId
    );
  }

  function getProgressPercentage() {
    if (!data) {
      return 0;
    }

    const currentReward = data.progress.current_reward;
    const nextReward = data.progress.next_reward;

    if (!nextReward) {
      return 100;
    }

    if (!currentReward) {
      if (nextReward.required_points <= 0) {
        return 100;
      }

      return Math.min(
        100,
        (data.progress.points / nextReward.required_points) * 100
      );
    }

    const range =
      nextReward.required_points -
      currentReward.required_points;

    const progress =
      data.progress.points -
      currentReward.required_points;

    if (range <= 0) {
      return 100;
    }

    return Math.min(
      100,
      Math.max(0, (progress / range) * 100)
    );
  }

  function getPointsRemaining() {
    if (!data?.progress.next_reward) {
      return 0;
    }

    return Math.max(
      0,
      data.progress.next_reward.required_points -
        data.progress.points
    );
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center">
            <p className="text-zinc-500">
              Loading your Battle Pass...
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
              Battle Pass
            </p>

            <h1 className="mt-2 text-2xl font-bold">
              Unable to load Battle Pass
            </h1>

            <p className="mt-3 text-sm text-red-300">
              {error}
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* Member Navigation */}
      <MemberNav memberId={data.member.id} />

      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto max-w-5xl px-6 py-10">

          {/* Header */}
          <header className="mb-8">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
              {data.season.name}
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight">
              My Battle Pass
            </h1>

            <p className="mt-2 text-zinc-400">
              Welcome, {data.member.full_name}.
            </p>
          </header>

          {/* Member info */}
          <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <p className="text-sm text-zinc-500">
                  Membership Number
                </p>

                <p className="mt-1 font-semibold">
                  {data.member.member_number}
                </p>
              </div>

              <div>
                <p className="text-sm text-zinc-500">
                  Membership Type
                </p>

                <span className="mt-1 inline-block rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                  {data.member.membership_type}
                </span>
              </div>

              <div>
                <p className="text-sm text-zinc-500">
                  Season
                </p>

                <p className="mt-1 font-semibold">
                  {data.season.name}
                </p>
              </div>

            </div>
          </section>

          {/* Level */}
          <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">

            <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">

              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
                  Current Level
                </p>

                <div className="mt-2 flex items-baseline gap-3">
                  <span className="text-7xl font-black">
                    {data.progress.level}
                  </span>

                  <span className="text-lg text-zinc-600">
                    / {data.progress.total_levels}
                  </span>
                </div>
              </div>

              <div className="sm:text-right">
                <p className="text-sm text-zinc-500">
                  Season Points
                </p>

                <p className="mt-1 text-4xl font-black">
                  {data.progress.points.toLocaleString()}
                </p>
              </div>

            </div>

            {/* Progress bar */}
            <div className="mt-8">

              <div className="h-5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-white transition-all duration-700"
                  style={{
                    width: `${getProgressPercentage()}%`,
                  }}
                />
              </div>

              <div className="mt-3 flex flex-col gap-1 text-sm text-zinc-500 sm:flex-row sm:justify-between">

                <span>
                  Level {data.progress.level}
                </span>

                {data.progress.next_reward ? (
                  <span>
                    {getPointsRemaining().toLocaleString()} points
                    until Level {data.progress.next_reward.level}
                  </span>
                ) : (
                  <span>
                    Maximum Battle Pass level reached
                  </span>
                )}

              </div>

            </div>
          </section>

          {/* Current / Next Reward */}
          <section className="mb-6 grid gap-6 sm:grid-cols-2">

            {/* Current */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">

              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Current Reward
              </p>

              {data.progress.current_reward ? (
                <>
                  <p className="mt-5 text-xs text-zinc-600">
                    Level {data.progress.current_reward.level}
                  </p>

                  <h2 className="mt-1 text-2xl font-bold">
                    {data.progress.current_reward.name}
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    {data.progress.current_reward.description}
                  </p>

                  <p className="mt-5 text-xs text-zinc-600">
                    Unlocked at{" "}
                    {data.progress.current_reward.required_points.toLocaleString()}{" "}
                    points
                  </p>
                </>
              ) : (
                <p className="mt-5 text-sm text-zinc-500">
                  No reward unlocked yet.
                </p>
              )}

            </div>

            {/* Next */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">

              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Next Reward
              </p>

              {data.progress.next_reward ? (
                <>
                  <p className="mt-5 text-xs text-zinc-600">
                    Level {data.progress.next_reward.level}
                  </p>

                  <h2 className="mt-1 text-2xl font-bold">
                    {data.progress.next_reward.name}
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    {data.progress.next_reward.description}
                  </p>

                  <p className="mt-5 text-sm font-semibold text-zinc-300">
                    {getPointsRemaining().toLocaleString()} points
                    remaining
                  </p>
                </>
              ) : (
                <>
                  <h2 className="mt-5 text-2xl font-bold">
                    Maximum Level
                  </h2>

                  <p className="mt-3 text-sm text-zinc-400">
                    You have reached every Battle Pass level this
                    season.
                  </p>
                </>
              )}

            </div>

          </section>

          {/* Claim Error */}
          {claimError && (
            <div className="mb-6 rounded-2xl border border-red-900 bg-red-950/30 p-4">
              <p className="text-sm text-red-300">
                {claimError}
              </p>
            </div>
          )}

          {/* Reward Track */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">

            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Season Progression
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                Reward Track
              </h2>
            </div>

            <div className="space-y-3">

              {data.rewards.map((reward) => {

                const unlocked =
                  data.progress.points >=
                  reward.required_points;

                const current =
                  reward.level === data.progress.level;

                const claim = getClaim(reward.id);

                const claiming =
                  claimingRewardId === reward.id;

                return (
                  <div
                    key={reward.id}
                    className={`rounded-xl border p-5 ${
                      current
                        ? "border-white bg-zinc-800"
                        : unlocked
                        ? "border-zinc-700 bg-zinc-900"
                        : "border-zinc-800 bg-zinc-950"
                    }`}
                  >

                    <div className="flex items-start gap-4">

                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold ${
                          unlocked
                            ? "bg-white text-black"
                            : "bg-zinc-800 text-zinc-600"
                        }`}
                      >
                        {unlocked ? "✓" : reward.level}
                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-center gap-2">

                          <h3
                            className={`font-semibold ${
                              unlocked
                                ? "text-white"
                                : "text-zinc-500"
                            }`}
                          >
                            {reward.name}
                          </h3>

                          {current && (
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                              Current
                            </span>
                          )}

                          {claim && claim.status === "claimed" && (
                            <span className="rounded-full border border-zinc-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                              Claimed
                            </span>
                          )}

                          {claim && claim.status === "fulfilled" && (
                            <span className="rounded-full border border-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                              Fulfilled
                            </span>
                          )}

                          {!claim && unlocked && !current && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                              Unlocked
                            </span>
                          )}

                        </div>

                        <p className="mt-1 text-sm text-zinc-500">
                          {reward.description}
                        </p>

                        <div className="mt-4">

                          {!unlocked && (
                            <p className="text-xs text-zinc-600">
                              Unlocks at{" "}
                              {reward.required_points.toLocaleString()}{" "}
                              points
                            </p>
                          )}

                          {unlocked && !claim && (
                            <button
                              type="button"
                              onClick={() =>
                                claimReward(reward)
                              }
                              disabled={claiming}
                              className="rounded-lg bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {claiming
                                ? "Claiming..."
                                : "Claim Reward"}
                            </button>
                          )}

                          {claim && claim.status === "claimed" && (
                            <p className="text-xs text-zinc-500">
                              Claimed on{" "}
                              {formatDate(claim.claimed_at)}.
                              Awaiting fulfillment.
                            </p>
                          )}

                          {claim && claim.status === "fulfilled" && (
                            <p className="text-xs text-zinc-400">
                              Fulfilled on{" "}
                              {claim.fulfilled_at
                                ? formatDate(claim.fulfilled_at)
                                : "an unknown date"}
                              .
                            </p>
                          )}

                          {claim && claim.status === "cancelled" && (
                            <p className="text-xs text-zinc-500">
                              This claim was cancelled.
                            </p>
                          )}

                        </div>

                      </div>

                      <div className="hidden text-right sm:block">

                        <p
                          className={`text-sm font-semibold ${
                            unlocked
                              ? "text-white"
                              : "text-zinc-600"
                          }`}
                        >
                          {reward.required_points.toLocaleString()}
                        </p>

                        <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                          Points
                        </p>

                      </div>

                    </div>

                  </div>
                );
              })}

            </div>
          </section>

          {/* Season dates */}
          <footer className="mt-6 text-center text-xs text-zinc-600">
            {formatDate(data.season.start_date)} →{" "}
            {formatDate(data.season.end_date)}
          </footer>

        </div>
      </main>
    </div>
  );
}