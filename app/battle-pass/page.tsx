"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getActiveMembers,
  getBattlePassData,
} from "./actions";

type Member = {
  id: string;
  member_number: string;
  full_name: string;
  membership_type: "standard" | "core";
  status: string;
};

type Reward = {
  id: string;
  level: number;
  required_points: number;
  name: string;
  description: string;
};

type BattlePassData = {
  member: {
    id: string;
    member_number: string;
    full_name: string;
    email: string | null;
    membership_type: "standard" | "core";
    status: string;
    core_started_at: string | null;
    core_review_due_at: string | null;
  };
  season: {
    id: string;
    name: string;
    description: string | null;
    start_date: string;
    end_date: string;
    status: string;
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

export default function BattlePassPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [data, setData] = useState<BattlePassData | null>(null);

  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingPass, setLoadingPass] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMembers() {
      try {
        setLoadingMembers(true);
        setError("");

        const result = await getActiveMembers();
        setMembers(result);

        if (result.length > 0) {
          setSelectedMemberId(result[0].id);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load members."
        );
      } finally {
        setLoadingMembers(false);
      }
    }

    loadMembers();
  }, []);

  useEffect(() => {
    if (!selectedMemberId) {
      return;
    }

    async function loadBattlePass() {
      try {
        setLoadingPass(true);
        setError("");

        const result = await getBattlePassData(selectedMemberId);
        setData(result);
      } catch (err) {
        setData(null);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load Battle Pass."
        );
      } finally {
        setLoadingPass(false);
      }
    }

    loadBattlePass();
  }, [selectedMemberId]);

  function calculateProgress() {
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

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">

        {/* Header */}
        <div className="mb-8">

          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
          >
            ← Back to Dashboard
          </Link>

          <p className="mt-6 text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            Organization
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Battle Pass
          </h1>

          <p className="mt-2 text-zinc-400">
            View a member&apos;s seasonal progression and rewards.
          </p>
        </div>

        {/* Member selector */}
        <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">

          <label
            htmlFor="member"
            className="mb-2 block text-sm font-medium text-zinc-300"
          >
            Select Member
          </label>

          {loadingMembers ? (
            <div className="text-sm text-zinc-500">
              Loading members...
            </div>
          ) : (
            <select
              id="member"
              value={selectedMemberId}
              onChange={(event) =>
                setSelectedMemberId(event.target.value)
              }
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-white"
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name} • {member.member_number}
                </option>
              ))}
            </select>
          )}

        </section>

        {/* Error */}
        {error && (
          <div className="mb-8 rounded-xl border border-red-900 bg-red-950/40 px-5 py-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Loading */}
        {loadingPass && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center text-zinc-500">
            Loading Battle Pass...
          </div>
        )}

        {/* Battle Pass */}
        {!loadingPass && data && (
          <>
            {/* Season + Member overview */}
            <section className="mb-6 grid gap-6 md:grid-cols-2">

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">

                <p className="text-sm uppercase tracking-wider text-zinc-500">
                  Season
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  {data.season.name}
                </h2>

                <p className="mt-2 text-sm text-zinc-400">
                  {data.season.description ||
                    "Seasonal Battle Pass"}
                </p>

                <p className="mt-4 text-xs text-zinc-500">
                  {formatDate(data.season.start_date)} →{" "}
                  {formatDate(data.season.end_date)}
                </p>

              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">

                <div className="flex items-start justify-between gap-4">

                  <div>
                    <p className="text-sm uppercase tracking-wider text-zinc-500">
                      Member
                    </p>

                    <h2 className="mt-2 text-2xl font-bold">
                      {data.member.full_name}
                    </h2>

                    <p className="mt-1 text-sm text-zinc-400">
                      {data.member.member_number}
                    </p>
                  </div>

                  <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-medium uppercase tracking-wider text-zinc-300">
                    {data.member.membership_type}
                  </span>

                </div>

              </div>

            </section>

            {/* Main progress */}
            <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">

              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">

                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                    Current Level
                  </p>

                  <div className="mt-2 flex items-baseline gap-3">

                    <span className="text-6xl font-black">
                      {data.progress.level}
                    </span>

                    <span className="text-zinc-500">
                      / {data.progress.total_levels}
                    </span>

                  </div>
                </div>

                <div className="text-left md:text-right">

                  <p className="text-sm text-zinc-500">
                    Season Points
                  </p>

                  <p className="mt-1 text-3xl font-bold">
                    {data.progress.points.toLocaleString()}
                  </p>

                </div>

              </div>

              <div className="mt-8">

                <div className="h-4 overflow-hidden rounded-full bg-zinc-800">

                  <div
                    className="h-full rounded-full bg-white transition-all duration-500"
                    style={{
                      width: `${calculateProgress()}%`,
                    }}
                  />

                </div>

                <div className="mt-3 flex justify-between text-sm text-zinc-500">

                  <span>
                    Level{" "}
                    {data.progress.current_reward?.level ?? 0}
                  </span>

                  {data.progress.next_reward ? (
                    <span>
                      {getPointsRemaining().toLocaleString()} points
                      until Level{" "}
                      {data.progress.next_reward.level}
                    </span>
                  ) : (
                    <span>Maximum level reached</span>
                  )}

                </div>

              </div>

            </section>

            {/* Current + next reward */}
            <section className="mb-8 grid gap-6 md:grid-cols-2">

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">

                <p className="text-sm uppercase tracking-wider text-zinc-500">
                  Current Reward
                </p>

                {data.progress.current_reward ? (
                  <>
                    <p className="mt-4 text-xs font-medium uppercase tracking-wider text-zinc-600">
                      Level{" "}
                      {data.progress.current_reward.level}
                    </p>

                    <h3 className="mt-2 text-2xl font-bold">
                      {data.progress.current_reward.name}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      {data.progress.current_reward.description}
                    </p>

                    <p className="mt-4 text-sm text-zinc-500">
                      Unlocked at{" "}
                      {data.progress.current_reward.required_points.toLocaleString()}{" "}
                      points
                    </p>
                  </>
                ) : (
                  <p className="mt-4 text-zinc-500">
                    No reward unlocked yet.
                  </p>
                )}

              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">

                <p className="text-sm uppercase tracking-wider text-zinc-500">
                  Next Reward
                </p>

                {data.progress.next_reward ? (
                  <>
                    <p className="mt-4 text-xs font-medium uppercase tracking-wider text-zinc-600">
                      Level {data.progress.next_reward.level}
                    </p>

                    <h3 className="mt-2 text-2xl font-bold">
                      {data.progress.next_reward.name}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      {data.progress.next_reward.description}
                    </p>

                    <p className="mt-4 text-sm text-zinc-500">
                      Requires{" "}
                      {data.progress.next_reward.required_points.toLocaleString()}{" "}
                      points
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="mt-4 text-2xl font-bold">
                      Maximum Level
                    </h3>

                    <p className="mt-2 text-sm text-zinc-400">
                      This member has reached every Battle Pass
                      level for the season.
                    </p>
                  </>
                )}

              </div>

            </section>

            {/* Reward track */}
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">

              <div className="mb-6">

                <p className="text-sm uppercase tracking-wider text-zinc-500">
                  Progression
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

                  return (
                    <div
                      key={reward.id}
                      className={`flex flex-col gap-4 rounded-xl border p-5 transition md:flex-row md:items-center md:justify-between ${
                        current
                          ? "border-white bg-zinc-800"
                          : unlocked
                          ? "border-zinc-700 bg-zinc-850"
                          : "border-zinc-800 bg-zinc-950"
                      }`}
                    >

                      <div className="flex items-center gap-4">

                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            unlocked
                              ? "bg-white text-black"
                              : "bg-zinc-800 text-zinc-500"
                          }`}
                        >
                          {unlocked ? "✓" : reward.level}
                        </div>

                        <div>

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

                          </div>

                          <p className="mt-1 text-sm text-zinc-500">
                            {reward.description}
                          </p>

                        </div>

                      </div>

                      <div className="shrink-0 text-left md:text-right">

                        <p
                          className={`text-sm font-semibold ${
                            unlocked
                              ? "text-white"
                              : "text-zinc-600"
                          }`}
                        >
                          {reward.required_points.toLocaleString()}{" "}
                          points
                        </p>

                        <p className="mt-1 text-xs uppercase tracking-wider text-zinc-600">
                          Level {reward.level}
                        </p>

                      </div>

                    </div>
                  );
                })}

              </div>

            </section>
          </>
        )}

        {/* No members */}
        {!loadingMembers && members.length === 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center">

            <h2 className="text-xl font-semibold">
              No active members
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Create an active member before viewing Battle Pass
              progression.
            </p>

          </div>
        )}

      </div>
    </main>
  );
}