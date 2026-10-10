
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default function NewSeasonPage() {
  async function createSeason(formData: FormData) {
    "use server";

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

    const name = String(formData.get("name") ?? "").trim();
    const description =
      String(formData.get("description") ?? "").trim();
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
      throw new Error("Please check your season details and point requirements.");
    }

    const { error } = await supabase.from("seasons").insert({
      name,
      description: description || null,
      start_date: startDate,
      end_date: endDate,
      status: "upcoming",
      core_selection_points: selectionPoints,
      core_maintenance_points: maintenancePoints,
    });

    if (error) {
      throw new Error(`Could not create season: ${error.message}`);
    }

    redirect("/dashboard/seasons");
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/dashboard/seasons"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Back to Season Manager
        </Link>

        <p className="mt-8 text-sm font-medium text-zinc-500">
          ADMINISTRATION
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Create Season
        </h1>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Set up a new membership season and its Core membership
          requirements. You can start the season when you're ready.
        </p>

        <form action={createSeason} className="mt-8 space-y-6">
          <section className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="text-lg font-semibold">Season Details</h2>

            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Season Name
              </label>
              <input
                id="name"
                name="name"
                required
                maxLength={100}
                placeholder="e.g. Season 2: New Horizons"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-white"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="What's new this season?"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-white"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="start_date"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Start Date
                </label>
                <input
                  id="start_date"
                  name="start_date"
                  type="date"
                  required
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-white"
                />
              </div>

              <div>
                <label
                  htmlFor="end_date"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  End Date
                </label>
                <input
                  id="end_date"
                  name="end_date"
                  type="date"
                  required
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-white"
                />
              </div>
            </div>
          </section>

          <section className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="text-lg font-semibold">
              Core Membership Requirements
            </h2>

            <p className="text-sm leading-6 text-zinc-500">
              These point targets are saved to this season. They do not
              automatically approve a member: officers still need to
              assess reliability, community conduct, and operational
              interest during reviews.
            </p>

            <div>
              <label
                htmlFor="core_selection_points"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Core Selection Points
              </label>
              <input
                id="core_selection_points"
                name="core_selection_points"
                type="number"
                min="0"
                step="1"
                defaultValue={500}
                required
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-white"
              />
              <p className="mt-2 text-xs text-zinc-600">
                Minimum points targeted for consideration for Core membership.
              </p>
            </div>

            <div>
              <label
                htmlFor="core_maintenance_points"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Core Maintenance Points
              </label>
              <input
                id="core_maintenance_points"
                name="core_maintenance_points"
                type="number"
                min="0"
                step="1"
                defaultValue={300}
                required
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-white"
              />
              <p className="mt-2 text-xs text-zinc-600">
                Minimum points targeted for existing Core members to maintain membership.
              </p>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/dashboard/seasons"
              className="rounded-xl border border-zinc-700 px-5 py-3 text-center text-sm font-medium text-zinc-300 transition hover:bg-zinc-900"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              Create Season
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}