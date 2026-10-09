import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { resetMemberPassword } from "@/app/members/actions";

type MemberPageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function MemberProfileContent({
  params,
}: MemberPageProps) {
  const { id } = await params;

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

  if (
    profileError ||
    !profile ||
    (profile.role !== "admin" && profile.role !== "officer")
  ) {
    redirect("/dashboard");
  }

  const { data: member, error: memberError } = await supabase
    .from("members")
    .select(`
      id,
      member_number,
      full_name,
      email,
      qr_token,
      status,
      membership_type,
      core_started_at,
      core_review_due_at,
      user_id,
      created_at
    `)
    .eq("id", id)
    .single();

  if (memberError || !member) {
    notFound();
  }

  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("*")
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  let points = 0;
  let battlePassLevel = 0;
  let totalLevels = 0;

  if (activeSeason) {
    const { data: progress } = await supabase.rpc(
      "get_battle_pass_progress",
      {
        p_member_id: member.id,
        p_season_id: activeSeason.id,
      }
    );

    if (progress) {
      points = progress.points ?? 0;
      battlePassLevel = progress.level ?? 0;
      totalLevels = progress.total_levels ?? 0;
    }
  }

  const { data: pointTransactions } = await supabase
    .from("point_transactions")
    .select(`
      id,
      amount,
      reason,
      created_at,
      point_rule_id
    `)
    .eq("member_id", member.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: rewardClaims } = await supabase
    .from("reward_claims")
    .select(`
      id,
      status,
      claimed_at,
      fulfilled_at,
      rewards (
        id,
        level,
        name,
        required_points
      )
    `)
    .eq("member_id", member.id)
    .order("claimed_at", { ascending: false })
    .limit(20);

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* Header */}
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/members"
              className="text-sm text-zinc-500 transition hover:text-zinc-300"
            >
              ← Back to Members
            </Link>

            <p className="mt-6 text-sm font-medium text-zinc-500">
              MEMBER PROFILE
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              {member.full_name}
            </h1>

            <p className="mt-2 text-zinc-500">
              {member.member_number}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/members/${member.id}/edit`}
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
            >
              Edit Member
            </Link>

            <Link
              href={`/members/${member.id}/card`}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium transition hover:bg-zinc-800"
            >
              View QR Card
            </Link>

            <Link
              href="/members"
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium transition hover:bg-zinc-800"
            >
              Manage Members
            </Link>
          </div>
        </header>

        {/* Member Overview */}
        <section className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
            <p className="text-sm text-zinc-500">
              STATUS
            </p>

            <div className="mt-3 flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  member.status === "active"
                    ? "bg-green-500"
                    : member.status === "suspended"
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
              />

              <p className="text-xl font-semibold capitalize">
                {member.status}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
            <p className="text-sm text-zinc-500">
              MEMBERSHIP
            </p>

            <p className="mt-3 text-xl font-semibold capitalize">
              {member.membership_type}
            </p>

            {member.membership_type === "core" &&
              member.core_started_at && (
                <p className="mt-2 text-sm text-zinc-500">
                  Core since{" "}
                  {new Date(
                    member.core_started_at
                  ).toLocaleDateString()}
                </p>
              )}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
            <p className="text-sm text-zinc-500">
              SEASON POINTS
            </p>

            <p className="mt-3 text-3xl font-bold">
              {points}
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              {activeSeason?.name ?? "No active season"}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
            <p className="text-sm text-zinc-500">
              BATTLE PASS
            </p>

            <p className="mt-3 text-3xl font-bold">
              Level {battlePassLevel}
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              {totalLevels > 0
                ? `${totalLevels} total levels`
                : "No rewards configured"}
            </p>
          </div>

        </section>

        {/* Member Information */}
        <section className="mt-10 grid gap-6 lg:grid-cols-2">

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">

            <h2 className="text-xl font-semibold">
              Member Information
            </h2>

            <div className="mt-6 space-y-5">

              <div>
                <p className="text-sm text-zinc-500">
                  Full Name
                </p>

                <p className="mt-1 font-medium">
                  {member.full_name}
                </p>
              </div>

              <div>
                <p className="text-sm text-zinc-500">
                  Member Number
                </p>

                <p className="mt-1 font-medium">
                  {member.member_number}
                </p>
              </div>

              <div>
                <p className="text-sm text-zinc-500">
                  Email
                </p>

                <p className="mt-1 font-medium">
                  {member.email || "No email registered"}
                </p>
              </div>

              <div>
                <p className="text-sm text-zinc-500">
                  Account
                </p>

                <p className="mt-1 font-medium">
                  {member.user_id
                    ? "Linked"
                    : "Not linked"}
                </p>
              </div>

              <div>
                <p className="text-sm text-zinc-500">
                  Member Since
                </p>

                <p className="mt-1 font-medium">
                  {new Date(
                    member.created_at
                  ).toLocaleDateString()}
                </p>
              </div>

            </div>
          </div>

          {/* Account Security */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">

            <h2 className="text-xl font-semibold">
              Account Security
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Manage this member&apos;s login account and temporary
              password.
            </p>

            <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/70 p-5">

              <div className="flex items-start justify-between gap-4">

                <div>
                  <p className="text-sm text-zinc-500">
                    Login Account
                  </p>

                  <p className="mt-1 font-medium">
                    {member.user_id
                      ? "Linked"
                      : "Not linked"}
                  </p>

                  {member.email && (
                    <p className="mt-1 text-sm text-zinc-500">
                      {member.email}
                    </p>
                  )}
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    member.user_id
                      ? "bg-green-500/10 text-green-400"
                      : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {member.user_id ? "Active" : "Not Linked"}
                </span>

              </div>

              {profile.role === "admin" && member.user_id ? (
                <div className="mt-5 border-t border-zinc-800 pt-5">

                  <p className="text-sm font-medium text-zinc-300">
                    Forgot the temporary password?
                  </p>

                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    Generate a new temporary password. The current
                    password will be replaced, and the member will
                    be required to create a new password when they
                    log in.
                  </p>

                  <form
                    action={resetMemberPassword.bind(
                      null,
                      member.id
                    )}
                    className="mt-4"
                  >
                    <button
                      type="submit"
                      className="rounded-xl border border-amber-700/60 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-300 transition hover:border-amber-600 hover:bg-amber-500/20"
                    >
                      Generate New Temporary Password
                    </button>
                  </form>

                  <p className="mt-3 text-xs leading-5 text-zinc-600">
                    This does not reveal the old password. It
                    generates a completely new one.
                  </p>

                </div>
              ) : profile.role === "admin" ? (
                <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <p className="text-sm text-zinc-500">
                    This member does not currently have a linked
                    login account.
                  </p>
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <p className="text-sm text-zinc-500">
                    Password management is restricted to
                    administrators.
                  </p>
                </div>
              )}

            </div>
          </div>

        </section>

        {/* Core Membership */}
        <section className="mt-10 grid gap-6 lg:grid-cols-2">

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">

            <h2 className="text-xl font-semibold">
              Core Membership
            </h2>

            {member.membership_type === "core" ? (
              <div className="mt-6 space-y-5">

                <div>
                  <p className="text-sm text-zinc-500">
                    Membership Type
                  </p>

                  <p className="mt-1 font-medium">
                    Core Member
                  </p>
                </div>

                <div>
                  <p className="text-sm text-zinc-500">
                    Core Started
                  </p>

                  <p className="mt-1 font-medium">
                    {member.core_started_at
                      ? new Date(
                          member.core_started_at
                        ).toLocaleDateString()
                      : "Not recorded"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-zinc-500">
                    Next Review
                  </p>

                  <p className="mt-1 font-medium">
                    {member.core_review_due_at
                      ? new Date(
                          member.core_review_due_at
                        ).toLocaleDateString()
                      : "Not scheduled"}
                  </p>
                </div>

              </div>
            ) : (
              <div className="mt-6">

                <p className="text-zinc-400">
                  This member is currently a Standard Member.
                </p>

                <Link
                  href="/reviews"
                  className="mt-5 inline-block rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium transition hover:bg-zinc-800"
                >
                  Open Core Reviews
                </Link>

              </div>
            )}

          </div>

        </section>

        {/* Point History */}
        <section className="mt-10">

          <div className="flex items-end justify-between">

            <div>
              <p className="text-sm font-medium text-zinc-500">
                ACTIVITY
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                Point History
              </h2>
            </div>

            <span className="text-sm text-zinc-600">
              Latest 20 transactions
            </span>

          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-800">

            {pointTransactions &&
            pointTransactions.length > 0 ? (
              <div className="divide-y divide-zinc-800">

                {pointTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between bg-zinc-900/70 px-6 py-4"
                  >
                    <div>
                      <p className="font-medium">
                        {transaction.reason}
                      </p>

                      <p className="mt-1 text-sm text-zinc-500">
                        {new Date(
                          transaction.created_at
                        ).toLocaleString()}
                      </p>
                    </div>

                    <p className="text-lg font-semibold text-green-400">
                      +{transaction.amount}
                    </p>
                  </div>
                ))}

              </div>
            ) : (
              <div className="bg-zinc-900/70 px-6 py-10 text-center text-zinc-500">
                No point transactions yet.
              </div>
            )}

          </div>

        </section>

        {/* Reward Claims */}
        <section className="mt-10">

          <div className="flex items-end justify-between">

            <div>
              <p className="text-sm font-medium text-zinc-500">
                REWARDS
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                Reward Claims
              </h2>
            </div>

            <Link
              href="/reward-claims"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Manage all claims →
            </Link>

          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-800">

            {rewardClaims &&
            rewardClaims.length > 0 ? (
              <div className="divide-y divide-zinc-800">

                {rewardClaims.map((claim) => {
                  const reward = Array.isArray(claim.rewards)
                    ? claim.rewards[0]
                    : claim.rewards;

                  return (
                    <div
                      key={claim.id}
                      className="flex items-center justify-between bg-zinc-900/70 px-6 py-4"
                    >

                      <div>

                        <p className="font-medium">
                          {reward?.name ?? "Unknown Reward"}
                        </p>

                        <p className="mt-1 text-sm text-zinc-500">
                          Level {reward?.level ?? "?"}
                          {" • "}
                          Claimed{" "}
                          {new Date(
                            claim.claimed_at
                          ).toLocaleDateString()}
                        </p>

                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          claim.status === "fulfilled"
                            ? "bg-green-500/10 text-green-400"
                            : claim.status === "claimed"
                            ? "bg-yellow-500/10 text-yellow-400"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {claim.status}
                      </span>

                    </div>
                  );
                })}

              </div>
            ) : (
              <div className="bg-zinc-900/70 px-6 py-10 text-center text-zinc-500">
                This member has no reward claims yet.
              </div>
            )}

          </div>

        </section>

        {/* Footer Actions */}
        <section className="mt-10 flex flex-wrap gap-3 border-t border-zinc-900 pt-6">

          <Link
            href={`/members/${member.id}/card`}
            className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
          >
            View Member Card
          </Link>

          <Link
            href="/battle-pass"
            className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-medium transition hover:bg-zinc-800"
          >
            Open Battle Pass
          </Link>

          <Link
            href="/members"
            className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-medium transition hover:bg-zinc-800"
          >
            Back to Members
          </Link>

        </section>

      </div>
    </main>
  );
}

function MemberProfileLoading() {
  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="animate-pulse">

          <div className="h-4 w-40 rounded bg-zinc-800" />

          <div className="mt-6 h-10 w-72 rounded bg-zinc-800" />

          <div className="mt-3 h-5 w-40 rounded bg-zinc-900" />

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="h-32 rounded-2xl bg-zinc-900" />
            <div className="h-32 rounded-2xl bg-zinc-900" />
            <div className="h-32 rounded-2xl bg-zinc-900" />
            <div className="h-32 rounded-2xl bg-zinc-900" />
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="h-80 rounded-2xl bg-zinc-900" />
            <div className="h-80 rounded-2xl bg-zinc-900" />
          </div>

          <div className="mt-10 h-72 rounded-2xl bg-zinc-900" />
        </div>
      </div>
    </main>
  );
}

export default function MemberProfilePage({
  params,
}: MemberPageProps) {
  return (
    <Suspense fallback={<MemberProfileLoading />}>
      <MemberProfileContent params={params} />
    </Suspense>
  );
}