import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createMember } from "./actions";

async function MembersContent() {
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

  if (!profile || profile.role !== "admin") {
    return (
      <main className="min-h-screen bg-[#09090b] p-8 text-white">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-bold">
            Access Denied
          </h1>

          <p className="mt-2 text-zinc-500">
            Only administrators can manage members.
          </p>
        </div>
      </main>
    );
  }

  const { data: members, error } = await supabase
    .from("members")
    .select(
      "id, member_number, full_name, email, status, qr_token, created_at"
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    return (
      <main className="min-h-screen bg-[#09090b] p-8 text-white">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-bold">
            Failed to load members
          </h1>

          <pre className="mt-4 rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-400">
            {error.message}
          </pre>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">

        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium tracking-widest text-zinc-500">
              ORGANIZATION PORTAL
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              Members
            </h1>

            <p className="mt-2 text-zinc-500">
              Manage your organization's membership records.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
          >
            ← Dashboard
          </Link>
        </header>

        {/* Add Member */}
        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">

          <div>
            <h2 className="font-semibold">
              Add Member
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Register a new organization member.
            </p>
          </div>

          <form
            action={createMember}
            className="mt-6 grid gap-4 md:grid-cols-3"
          >
            <div>
              <label
                htmlFor="full_name"
                className="mb-2 block text-sm font-medium text-zinc-400"
              >
                Full Name
              </label>

              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                placeholder="Juan Dela Cruz"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-700 focus:border-zinc-600"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-zinc-400"
              >
                Email
              </label>

              <input
  id="email"
  name="email"
  type="email"
  required
  placeholder="juan@example.com"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-700 focus:border-zinc-600"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-xl bg-white px-4 py-3 font-medium text-black transition hover:bg-zinc-200"
              >
                Add Member
              </button>
            </div>
          </form>

        </section>

        {/* Registered Members */}
        <section className="mt-10 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">

          <div className="border-b border-zinc-800 px-6 py-5">
            <h2 className="font-semibold">
              Registered Members
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              {members?.length ?? 0} member(s)
            </p>
          </div>

          {members && members.length > 0 ? (
            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>
                  <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-600">

                    <th className="px-6 py-4">
                      Member
                    </th>

                    <th className="px-6 py-4">
                      Email
                    </th>

                    <th className="px-6 py-4">
                      Status
                    </th>

                    <th className="px-6 py-4">
                      Actions
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {members.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-zinc-800/50 transition hover:bg-zinc-800/30"
                    >

                      <td className="px-6 py-5">

                        <p className="font-medium">
                          {member.full_name}
                        </p>

                        <p className="mt-1 text-sm text-zinc-600">
                          {member.member_number}
                        </p>

                      </td>

                      <td className="px-6 py-5 text-sm text-zinc-400">
                        {member.email || "—"}
                      </td>

                      <td className="px-6 py-5">

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            member.status === "active"
                              ? "bg-green-950 text-green-400"
                              : member.status === "suspended"
                              ? "bg-yellow-950 text-yellow-400"
                              : "bg-zinc-800 text-zinc-500"
                          }`}
                        >
                          {member.status}
                        </span>

                      </td>

                      <td className="px-6 py-5">

                        <div className="flex flex-wrap gap-2">

                          <Link
                            href={`/members/${member.id}`}
                            className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
                          >
                            View Profile
                          </Link>

                          <Link
                            href={`/members/${member.id}/card`}
                            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                          >
                            View Card
                          </Link>

                        </div>

                      </td>

                    </tr>
                  ))}

                </tbody>

              </table>

            </div>
          ) : (
            <div className="px-6 py-16 text-center">

              <p className="text-zinc-500">
                No members registered yet.
              </p>

            </div>
          )}

        </section>

      </div>
    </main>
  );
}

export default function MembersPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#09090b] text-white">
          <p className="text-zinc-500">
            Loading members...
          </p>
        </main>
      }
    >
      <MembersContent />
    </Suspense>
  );
}