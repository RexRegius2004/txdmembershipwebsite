import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MemberNav from "@/components/member-nav";

//export const instant = false;
type ProfileData = {
  profile: {
    id: string;
    full_name: string | null;
    role: string;
    created_at: string;
  };
  member: {
    id: string;
    member_number: string;
    full_name: string;
    email: string | null;
    status: string;
    membership_type: "standard" | "core";
    core_started_at: string | null;
    core_review_due_at: string | null;
    created_at: string;
  };
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
    current_reward: {
      id: string;
      level: number;
      required_points: number;
      name: string;
      description: string | null;
    } | null;
    next_reward: {
      id: string;
      level: number;
      required_points: number;
      name: string;
      description: string | null;
    } | null;
  };
  rewards: Array<{
    id: string;
    level: number;
    required_points: number;
    name: string;
    description: string | null;
  }>;
};

function formatDate(value: string | null) {
  if (!value) return "Not available";

  return new Date(value).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatMembershipType(type: string) {
  return type === "core" ? "Core Member" : "Standard Member";
}

function statusLabel(status: string) {
  if (status === "active") return "Active";
  if (status === "inactive") return "Inactive";
  if (status === "suspended") return "Suspended";

  return status;
}

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: profileData, error: profileError },
    { data: battlePassData, error: battlePassError },
  ] = await Promise.all([
    supabase.rpc("get_my_profile"),
    supabase.rpc("get_my_battle_pass"),
  ]);

  if (profileError) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold">My Profile</h1>

          <div className="mt-6 rounded-2xl border border-red-900 bg-red-950/30 p-6">
            <p className="font-medium text-red-300">
              Unable to load your profile.
            </p>

            <p className="mt-2 text-sm text-red-400">
              {profileError.message}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const profile = profileData as ProfileData;
  const battlePass = battlePassError
    ? null
    : (battlePassData as BattlePassData);

  const points = battlePass?.progress.points ?? 0;
  const level = battlePass?.progress.level ?? 0;
  const totalLevels = battlePass?.progress.total_levels ?? 0;
  const nextReward = battlePass?.progress.next_reward;

  let progressPercent = 0;

  if (nextReward) {
    const previousRequirement =
      battlePass?.progress.current_reward?.required_points ?? 0;

    const range =
      nextReward.required_points - previousRequirement;

    if (range > 0) {
      progressPercent = Math.min(
        100,
        Math.max(
          0,
          ((points - previousRequirement) / range) * 100
        )
      );
    }
  } else if (totalLevels > 0) {
    progressPercent = 100;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Member Navigation */}
      <MemberNav memberId={profile.member.id} />

      <main className="px-6 py-10">
        <div className="mx-auto max-w-5xl">

          {/* Header */}
          <div>
            <p className="text-sm text-zinc-500">
              Member Portal
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              Welcome, {profile.member.full_name}
            </h1>

            <p className="mt-2 text-zinc-400">
              Your membership at a glance.
            </p>
          </div>

          {/* Member Summary */}
          <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-zinc-500">
                  Member
                </p>

                <h2 className="mt-1 text-2xl font-semibold">
                  {profile.member.full_name}
                </h2>

                <p className="mt-1 text-sm text-zinc-400">
                  {profile.member.member_number}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">
                  {formatMembershipType(
                    profile.member.membership_type
                  )}
                </span>

                <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">
                  {statusLabel(profile.member.status)}
                </span>
              </div>
            </div>
          </section>

          {/* Battle Pass */}
          {battlePass && (
            <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm text-zinc-500">
                    Current Season
                  </p>

                  <h2 className="mt-1 text-2xl font-semibold">
                    {battlePass.season.name}
                  </h2>

                  <p className="mt-1 text-sm text-zinc-400">
                    {battlePass.season.description}
                  </p>
                </div>

                <Link
                  href="/my-battle-pass"
                  className="text-sm font-medium text-zinc-300 transition hover:text-white"
                >
                  View Battle Pass →
                </Link>
              </div>

              {/* Stats */}
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-zinc-800 bg-black p-5">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Points
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {points}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-black p-5">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Battle Pass Level
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {level}
                    <span className="text-lg text-zinc-500">
                      {" "}
                      / {totalLevels}
                    </span>
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-black p-5">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Next Reward
                  </p>

                  <p className="mt-2 font-semibold">
                    {nextReward?.name ?? "All rewards unlocked"}
                  </p>

                  {nextReward && (
                    <p className="mt-1 text-sm text-zinc-500">
                      {nextReward.required_points} points
                    </p>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">
                    Progress to next reward
                  </span>

                  <span className="font-medium text-zinc-200">
                    {nextReward
                      ? `${points} / ${nextReward.required_points}`
                      : "Complete"}
                  </span>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-white transition-all"
                    style={{
                      width: `${progressPercent}%`,
                    }}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Account + Core */}
          <section className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <p className="text-sm text-zinc-500">
                Account Information
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-600">
                    Full Name
                  </p>

                  <p className="mt-1 text-sm text-zinc-200">
                    {profile.member.full_name}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-600">
                    Email
                  </p>

                  <p className="mt-1 break-all text-sm text-zinc-200">
                    {user.email ??
                      profile.member.email ??
                      "No email"}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-600">
                    Member Since
                  </p>

                  <p className="mt-1 text-sm text-zinc-200">
                    {formatDate(profile.member.created_at)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <p className="text-sm text-zinc-500">
                Core Membership
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-600">
                    Membership Type
                  </p>

                  <p className="mt-1 text-sm text-zinc-200">
                    {formatMembershipType(
                      profile.member.membership_type
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-600">
                    Core Started
                  </p>

                  <p className="mt-1 text-sm text-zinc-200">
                    {formatDate(
                      profile.member.core_started_at
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-600">
                    Next Core Review
                  </p>

                  <p className="mt-1 text-sm text-zinc-200">
                    {formatDate(
                      profile.member.core_review_due_at
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Membership Card */}
          <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-zinc-500">
                  Membership Card
                </p>

                <h2 className="mt-1 text-lg font-semibold">
                  Your QR membership card
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                  Show your membership card when an officer needs
                  to scan your account and record organization
                  activity.
                </p>
              </div>

              <Link
                href={`/members/${profile.member.id}/card`}
                className="shrink-0 rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
              >
                Open Card
              </Link>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}