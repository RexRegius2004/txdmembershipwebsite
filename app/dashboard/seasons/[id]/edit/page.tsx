

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

type PointRule = {
  id: string;
  season_id: string;
  name: string;
  description: string | null;
  points: number;
  active: boolean;
  created_at: string;
};

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return supabase;
}

async function requireEditableSeason(
  supabase: Awaited<ReturnType<typeof createClient>>,
  seasonId: string
) {
  const { data: season, error } = await supabase
    .from("seasons")
    .select("id, status")
    .eq("id", seasonId)
    .single();

  if (error || !season) notFound();

  if (season.status === "ended") {
    throw new Error("Ended seasons cannot be edited.");
  }

  return season;
}

export default async function EditSeasonPage({ params }: Props) {
  const { id } = await params;
  const supabase = await requireAdmin();

  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select(
      "id, name, description, start_date, end_date, status, core_selection_points, core_maintenance_points"
    )
    .eq("id", id)
    .single();

  if (seasonError || !season) notFound();

  const { data: rules, error: rulesError } = await supabase
    .from("point_rules")
    .select(
      "id, season_id, name, description, points, active, created_at"
    )
    .eq("season_id", id)
    .order("created_at", { ascending: true });

  const pointRules: PointRule[] = (rules ?? []) as PointRule[];

  async function updateSeason(formData: FormData) {
    "use server";

    const supabase = await requireAdmin();
    await requireEditableSeason(supabase, id);

    const name = String(formData.get("name") ?? "").trim();
    const description = String(
      formData.get("description") ?? ""
    ).trim();
    const startDate = String(formData.get("start_date") ?? "");
    const endDate = String(formData.get("end_date") ?? "");
    const selectionPoints = Number(
      formData.get("core_selection_points")
    );
    const maintenancePoints = Number(
      formData.get("core_maintenance_points")
    );

    if (
      !name ||
      !startDate ||
      !endDate ||
      endDate < startDate ||
      !Number.isInteger(selectionPoints) ||
      !Number.isInteger(maintenancePoints) ||
      selectionPoints < 0 ||
      maintenancePoints < 0
    ) {
      throw new Error(
        "Please check the season details and point requirements."
      );
    }

    const { error } = await supabase
      .from("seasons")
      .update({
        name,
        description: description || null,
        start_date: startDate,
        end_date: endDate,
        core_selection_points: selectionPoints,
        core_maintenance_points: maintenancePoints,
      })
      .eq("id", id);

    if (error) {
      throw new Error(`Could not update season: ${error.message}`);
    }

    redirect("/dashboard/seasons");
  }

  async function addPointRule(formData: FormData) {
    "use server";

    const supabase = await requireAdmin();
    await requireEditableSeason(supabase, id);

    const name = String(formData.get("name") ?? "").trim();
    const description = String(
      formData.get("description") ?? ""
    ).trim();
    const points = Number(formData.get("points"));

    if (
      !name ||
      name.length > 150 ||
      !Number.isInteger(points) ||
      points < 0
    ) {
      throw new Error(
        "Enter an event name and a valid non-negative whole number of points."
      );
    }

    const { error } = await supabase.from("point_rules").insert({
      season_id: id,
      name,
      description: description || null,
      points,
      active: true,
    });

    if (error) {
      throw new Error(`Could not add event: ${error.message}`);
    }

    redirect(`/dashboard/seasons/${id}/edit`);
  }

  async function updatePointRule(formData: FormData) {
    "use server";

    const supabase = await requireAdmin();
    await requireEditableSeason(supabase, id);

    const ruleId = String(formData.get("rule_id") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const description = String(
      formData.get("description") ?? ""
    ).trim();
    const points = Number(formData.get("points"));

    if (
      !ruleId ||
      !name ||
      name.length > 150 ||
      !Number.isInteger(points) ||
      points < 0
    ) {
      throw new Error(
        "Enter an event name and a valid non-negative whole number of points."
      );
    }

    const { data: existing, error: loadError } = await supabase
      .from("point_rules")
      .select("id")
      .eq("id", ruleId)
      .eq("season_id", id)
      .maybeSingle();

    if (loadError || !existing) {
      throw new Error("The event could not be found in this season.");
    }

    const { error } = await supabase
      .from("point_rules")
      .update({
        name,
        description: description || null,
        points,
      })
      .eq("id", ruleId)
      .eq("season_id", id);

    if (error) {
      throw new Error(`Could not update event: ${error.message}`);
    }

    redirect(`/dashboard/seasons/${id}/edit`);
  }

  async function togglePointRule(formData: FormData) {
    "use server";

    const supabase = await requireAdmin();
    await requireEditableSeason(supabase, id);

    const ruleId = String(formData.get("rule_id") ?? "");
    const nextActive = String(formData.get("next_active")) === "true";

    if (!ruleId) {
      throw new Error("Missing event ID.");
    }

    const { data: existing, error: loadError } = await supabase
      .from("point_rules")
      .select("id, active")
      .eq("id", ruleId)
      .eq("season_id", id)
      .maybeSingle();

    if (loadError || !existing) {
      throw new Error("The event could not be found in this season.");
    }

    const { error } = await supabase
      .from("point_rules")
      .update({ active: nextActive })
      .eq("id", ruleId)
      .eq("season_id", id);

    if (error) {
      throw new Error(`Could not change event status: ${error.message}`);
    }

    redirect(`/dashboard/seasons/${id}/edit`);
  }

  const inputClass =
    "w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-white";

  if (season.status === "ended") {
    return (
      <main className="min-h-screen bg-[#09090b] px-6 py-10 text-white">
        <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-800 p-6">
          <h1 className="text-2xl font-bold">Season is locked</h1>
          <p className="mt-3 text-sm text-zinc-400">
            Ended seasons are preserved as historical records and cannot be edited.
          </p>
          <Link
            href="/dashboard/seasons"
            className="mt-6 inline-block text-sm text-zinc-300 hover:text-white"
          >
            ← Back to Season Manager
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#09090b] px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/dashboard/seasons"
          className="text-sm text-zinc-500 hover:text-white"
        >
          ← Back to Season Manager
        </Link>

        <p className="mt-8 text-sm font-medium text-zinc-500">
          ADMINISTRATION / SEASONS
        </p>

        <h1 className="mt-2 text-3xl font-bold">Edit Season</h1>

        <p className="mt-2 text-sm text-zinc-500">
          Manage season settings, membership requirements, and event points.
        </p>

        <form action={updateSeason} className="mt-8 space-y-6">
          <section className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="text-lg font-semibold">Season Details</h2>

            <div>
              <label htmlFor="name" className="mb-2 block text-sm text-zinc-300">
                Season Name
              </label>
              <input
                id="name"
                name="name"
                required
                maxLength={100}
                defaultValue={season.name}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm text-zinc-300"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={season.description ?? ""}
                className={inputClass}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="start_date"
                  className="mb-2 block text-sm text-zinc-300"
                >
                  Start Date
                </label>
                <input
                  id="start_date"
                  name="start_date"
                  type="date"
                  required
                  defaultValue={season.start_date}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="end_date"
                  className="mb-2 block text-sm text-zinc-300"
                >
                  End Date
                </label>
                <input
                  id="end_date"
                  name="end_date"
                  type="date"
                  required
                  defaultValue={season.end_date}
                  className={inputClass}
                />
              </div>
            </div>

            <p className="text-xs text-zinc-500">
              Current status: {season.status}
            </p>
          </section>

          <section className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="text-lg font-semibold">
              Core Membership Requirements
            </h2>

            <div>
              <label
                htmlFor="core_selection_points"
                className="mb-2 block text-sm text-zinc-300"
              >
                Core Selection Points
              </label>
              <input
                id="core_selection_points"
                name="core_selection_points"
                type="number"
                min="0"
                step="1"
                required
                defaultValue={season.core_selection_points}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="core_maintenance_points"
                className="mb-2 block text-sm text-zinc-300"
              >
                Core Maintenance Points
              </label>
              <input
                id="core_maintenance_points"
                name="core_maintenance_points"
                type="number"
                min="0"
                step="1"
                required
                defaultValue={season.core_maintenance_points}
                className={inputClass}
              />
            </div>

            <p className="text-xs leading-5 text-zinc-500">
              These values configure point targets only. Review decisions
              still depend on your membership review workflow.
            </p>
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/dashboard/seasons"
              className="rounded-xl border border-zinc-700 px-5 py-3 text-center text-sm hover:bg-zinc-900"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-zinc-200"
            >
              Save Season Changes
            </button>
          </div>
        </form>

        <section className="mt-10 space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div>
            <h2 className="text-xl font-semibold">Season Event Rules</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Configure which events award points and how many points each
              event grants. Deactivating an event keeps its existing history.
            </p>
          </div>

          {rulesError ? (
            <div className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">
              Could not load event rules: {rulesError.message}
            </div>
          ) : pointRules.length === 0 ? (
            <p className="rounded-xl border border-zinc-800 p-4 text-sm text-zinc-400">
              No event rules exist for this season yet. Add your first event below.
            </p>
          ) : (
            <div className="space-y-4">
              {pointRules.map((rule) => (
                <article
                  key={rule.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-5"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold">{rule.name}</h3>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${
                        rule.active
                          ? "border-emerald-800 bg-emerald-950/40 text-emerald-300"
                          : "border-zinc-700 bg-zinc-900 text-zinc-400"
                      }`}
                    >
                      {rule.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <form action={updatePointRule} className="space-y-4">
                    <input
                      type="hidden"
                      name="rule_id"
                      value={rule.id}
                    />

                    <div>
                      <label
                        htmlFor={`event-name-${rule.id}`}
                        className="mb-2 block text-sm text-zinc-300"
                      >
                        Event Name
                      </label>
                      <input
                        id={`event-name-${rule.id}`}
                        name="name"
                        required
                        maxLength={150}
                        defaultValue={rule.name}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`event-description-${rule.id}`}
                        className="mb-2 block text-sm text-zinc-300"
                      >
                        Description
                      </label>
                      <textarea
                        id={`event-description-${rule.id}`}
                        name="description"
                        rows={2}
                        defaultValue={rule.description ?? ""}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`event-points-${rule.id}`}
                        className="mb-2 block text-sm text-zinc-300"
                      >
                        Points Awarded
                      </label>
                      <input
                        id={`event-points-${rule.id}`}
                        name="points"
                        type="number"
                        min="0"
                        step="1"
                        required
                        defaultValue={rule.points}
                        className={inputClass}
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-zinc-200"
                      >
                        Save Event
                      </button>
                    </div>
                  </form>

                  <form action={togglePointRule} className="mt-3">
                    <input
                      type="hidden"
                      name="rule_id"
                      value={rule.id}
                    />
                    <input
                      type="hidden"
                      name="next_active"
                      value={String(!rule.active)}
                    />
                    <button
                      type="submit"
                      className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white"
                    >
                      {rule.active ? "Deactivate Event" : "Reactivate Event"}
                    </button>
                  </form>

                  <p className="mt-3 text-xs leading-5 text-zinc-500">
                    Existing transactions are not changed when you edit or
                    deactivate this event.
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div>
            <h2 className="text-lg font-semibold">Add New Event</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Create another point-awarding event for this season.
            </p>
          </div>

          <form action={addPointRule} className="space-y-4">
            <div>
              <label
                htmlFor="new-event-name"
                className="mb-2 block text-sm text-zinc-300"
              >
                Event Name
              </label>
              <input
                id="new-event-name"
                name="name"
                required
                maxLength={150}
                placeholder="e.g. Attend Organization Meeting"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="new-event-description"
                className="mb-2 block text-sm text-zinc-300"
              >
                Description
              </label>
              <textarea
                id="new-event-description"
                name="description"
                rows={2}
                placeholder="Describe what qualifies for these points"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="new-event-points"
                className="mb-2 block text-sm text-zinc-300"
              >
                Points Awarded
              </label>
              <input
                id="new-event-points"
                name="points"
                type="number"
                min="0"
                step="1"
                required
                defaultValue={10}
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-zinc-200 sm:w-auto"
            >
              Add Event
            </button>
          </form>
        </section>

        <p className="mt-6 text-xs leading-5 text-zinc-500">
          Important: changing an event's point value affects future awards
          made through that rule. Points already recorded in member
          transactions are preserved. Verify that your scanner and point-award
          code uses the rule's current points value when awarding points.
        </p>
      </div>
    </main>
  );
}