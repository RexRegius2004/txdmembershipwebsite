
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Season = {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: "upcoming" | "active" | "ended";
  core_selection_points: number;
  core_maintenance_points: number;
  created_at: string;
};

async function SeasonManagerContent() {
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

  if (profileError || !profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: seasons, error: seasonsError } = await supabase
    .from("seasons")
    .select(`
      id,
      name,
      description,
      start_date,
      end_date,
      status,
      core_selection_points,
      core_maintenance_points,
      created_at
    `)
    .order("start_date", { ascending: false });

  if (seasonsError) {
    throw new Error(`Failed to load seasons: ${seasonsError.message}`);
  }

  const seasonList = (seasons ?? []) as Season[];

  const activeSeason = seasonList.find(
    (season) => season.status === "active"
  );

  const upcomingSeasons = seasonList.filter(
    (season) => season.status === "upcoming"
  );

  const endedSeasons = seasonList.filter(
    (season) => season.status === "ended"
  );

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-zinc-500 transition hover:text-zinc-300"
            >
              ← Back to Dashboard
            </Link>

            <p className="mt-6 text-sm font-medium text-zinc-500">
              ADMINISTRATION
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Season Manager
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Create, edit, start, and close membership seasons without
              deleting historical records.
            </p>
          </div>

          <Link
            href="/dashboard/seasons/new"
            className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
          >
            + Create Season
          </Link>
        </header>

        {/* Active Season */}
        <section className="mt-10">
          <div className="mb-4">
            <p className="text-sm font-medium text-zinc-500">
              CURRENT SEASON
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              Active Season
            </h2>
          </div>

          {activeSeason ? (
            <div className="rounded-2xl border border-green-900/50 bg-green-950/10 p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-2xl font-semibold">
                      {activeSeason.name}
                    </h3>

                    <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
                      ACTIVE
                    </span>
                  </div>

                  {activeSeason.description && (
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                      {activeSeason.description}
                    </p>
                  )}

                  <div className="mt-5 flex flex-wrap gap-5 text-sm text-zinc-500">
                    <div>
                      <span className="text-zinc-600">Start</span>{" "}
                      {new Date(
                        `${activeSeason.start_date}T00:00:00`
                      ).toLocaleDateString()}
                    </div>

                    <div>
                      <span className="text-zinc-600">End</span>{" "}
                      {new Date(
                        `${activeSeason.end_date}T00:00:00`
                      ).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {/* NEW: Edit Active Season */}
                  <Link
                    href={`/dashboard/seasons/${activeSeason.id}/edit`}
                    className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:border-zinc-500 hover:bg-zinc-800"
                  >
                    ✏️ Edit Season
                  </Link>

                  {/* Close Season */}
                  <form
                    action={async () => {
                      "use server";

                      const supabase = await createClient();

                      const {
                        data: { user },
                      } = await supabase.auth.getUser();

                      if (!user) {
                        redirect("/login");
                      }

                      const { data: profile } = await supabase
                        .from("profiles")
                        .select("role")
                        .eq("id", user.id)
                        .single();

                      if (profile?.role !== "admin") {
                        redirect("/dashboard");
                      }

                      const { error } = await supabase.rpc(
                        "close_season",
                        {
                          p_season_id: activeSeason.id,
                        }
                      );

                      if (error) {
                        throw new Error(error.message);
                      }

                      redirect("/dashboard/seasons");
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-xl border border-red-900/60 bg-red-500/10 px-5 py-3 text-sm font-medium text-red-400 transition hover:border-red-700 hover:bg-red-500/20"
                    >
                      Close Season
                    </button>
                  </form>
                </div>
              </div>

              <div className="mt-6 grid gap-4 border-t border-green-900/30 pt-6 md:grid-cols-2">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                  <p className="text-xs font-medium text-zinc-600">
                    CORE SELECTION
                  </p>

                  <p className="mt-2 text-lg font-semibold">
                    {activeSeason.core_selection_points} points
                  </p>

                  <p className="mt-1 text-xs text-zinc-600">
                    Required for Core selection
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                  <p className="text-xs font-medium text-zinc-600">
                    CORE MAINTENANCE
                  </p>

                  <p className="mt-2 text-lg font-semibold">
                    {activeSeason.core_maintenance_points} points
                  </p>

                  <p className="mt-1 text-xs text-zinc-600">
                    Required for Core maintenance
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-900/40 bg-amber-950/10 p-6">
              <p className="text-lg font-semibold text-amber-300">
                No active season
              </p>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Create an upcoming season and start it when you are ready.
              </p>
            </div>
          )}
        </section>

        {/* Upcoming Seasons */}
        <section className="mt-12">
          <div className="mb-4">
            <p className="text-sm font-medium text-zinc-500">PLANNING</p>

            <h2 className="mt-1 text-xl font-semibold">
              Upcoming Seasons
            </h2>
          </div>

          {upcomingSeasons.length > 0 ? (
            <div className="space-y-4">
              {upcomingSeasons.map((season) => (
                <div
                  key={season.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold">
                          {season.name}
                        </h3>

                        <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
                          UPCOMING
                        </span>
                      </div>

                      {season.description && (
                        <p className="mt-2 text-sm leading-6 text-zinc-500">
                          {season.description}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-5 text-sm text-zinc-500">
                        <div>
                          <span className="text-zinc-600">Start</span>{" "}
                          {new Date(
                            `${season.start_date}T00:00:00`
                          ).toLocaleDateString()}
                        </div>

                        <div>
                          <span className="text-zinc-600">End</span>{" "}
                          {new Date(
                            `${season.end_date}T00:00:00`
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={`/dashboard/seasons/${season.id}/edit`}
                        className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium transition hover:bg-zinc-800"
                      >
                        Edit
                      </Link>

                      <form
                        action={async () => {
                          "use server";

                          const supabase = await createClient();

                          const {
                            data: { user },
                          } = await supabase.auth.getUser();

                          if (!user) {
                            redirect("/login");
                          }

                          const { data: profile } = await supabase
                            .from("profiles")
                            .select("role")
                            .eq("id", user.id)
                            .single();

                          if (profile?.role !== "admin") {
                            redirect("/dashboard");
                          }

                          const { error } = await supabase.rpc(
                            "start_season",
                            {
                              p_season_id: season.id,
                            }
                          );

                          if (error) {
                            throw new Error(error.message);
                          }

                          redirect("/dashboard/seasons");
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-zinc-200"
                        >
                          Start Season
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-10 text-center">
              <p className="font-medium text-zinc-400">
                No upcoming seasons
              </p>

              <p className="mt-2 text-sm text-zinc-600">
                Create your next season when you are ready.
              </p>
            </div>
          )}
        </section>

        {/* Historical Seasons */}
        <section className="mt-12">
          <div className="mb-4">
            <p className="text-sm font-medium text-zinc-500">HISTORY</p>

            <h2 className="mt-1 text-xl font-semibold">
              Ended Seasons
            </h2>
          </div>

          {endedSeasons.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-zinc-800">
              <div className="divide-y divide-zinc-800">
                {endedSeasons.map((season) => (
                  <div
                    key={season.id}
                    className="bg-zinc-900/50 px-6 py-5"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="font-semibold">
                            {season.name}
                          </h3>

                          <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-500">
                            ENDED
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-zinc-600">
                          {new Date(
                            `${season.start_date}T00:00:00`
                          ).toLocaleDateString()}{" "}
                          →{" "}
                          {new Date(
                            `${season.end_date}T00:00:00`
                          ).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="text-sm text-zinc-600">
                        Historical data preserved
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-10 text-center">
              <p className="font-medium text-zinc-400">
                No ended seasons yet
              </p>

              <p className="mt-2 text-sm text-zinc-600">
                Completed seasons will appear here.
              </p>
            </div>
          )}
        </section>

        {/* Safety Notice */}
        <section className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-lg">
              🔒
            </div>

            <div>
              <h2 className="font-semibold">Data Protection</h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
                Ending a season does not delete members, points, rewards,
                reward claims, or other historical records. Each transaction
                remains associated with the season in which it occurred.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default async function SeasonManagerPage() {
  return <SeasonManagerContent />;
}