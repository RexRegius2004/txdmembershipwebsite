import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

type EditMemberPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function EditMemberLoading() {
  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="animate-pulse">
          <div className="h-4 w-40 rounded bg-zinc-800" />

          <div className="mt-8 h-10 w-64 rounded bg-zinc-800" />

          <div className="mt-3 h-5 w-96 max-w-full rounded bg-zinc-900" />

          <div className="mt-8 h-40 rounded-2xl border border-zinc-800 bg-zinc-900/70" />

          <div className="mt-6 h-96 rounded-2xl border border-zinc-800 bg-zinc-900/70" />

          <div className="mt-6 h-64 rounded-2xl border border-zinc-800 bg-zinc-900/70" />
        </div>
      </div>
    </main>
  );
}

async function EditMemberContent({
  params,
}: EditMemberPageProps) {
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
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: member, error: memberError } = await supabase
    .from("members")
    .select(`
      id,
      member_number,
      full_name,
      email,
      status,
      membership_type,
      user_id,
      created_at
    `)
    .eq("id", id)
    .single();

  if (memberError || !member) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto max-w-3xl px-6 py-8">

        {/* Header */}
        <header>
          <Link
            href={`/members/${member.id}`}
            className="text-sm text-zinc-500 transition hover:text-zinc-300"
          >
            ← Back to Member Profile
          </Link>

          <p className="mt-6 text-sm font-medium text-zinc-500">
            MEMBER MANAGEMENT
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Edit Member
          </h1>

          <p className="mt-2 text-zinc-500">
            Update the member&apos;s information and account connection.
          </p>
        </header>

        {/* Member Identity */}
        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">

          <div className="grid gap-6 sm:grid-cols-2">

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
                Membership Type
              </p>

              <p className="mt-1 font-medium capitalize">
                {member.membership_type}
              </p>
            </div>

          </div>

          <div className="mt-6 border-t border-zinc-800 pt-6">

            <p className="text-sm text-zinc-500">
              Member Since
            </p>

            <p className="mt-1 font-medium">
              {new Date(member.created_at).toLocaleDateString()}
            </p>

          </div>

        </section>

        {/* Edit Form */}
        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">

          <h2 className="text-xl font-semibold">
            Member Information
          </h2>

          <form
            action={async (formData) => {
              "use server";

              const supabase = await createClient();

              const {
                data: { user },
              } = await supabase.auth.getUser();

              if (!user) {
                redirect("/login");
              }

              const { data: profile, error: profileError } =
                await supabase
                  .from("profiles")
                  .select("role")
                  .eq("id", user.id)
                  .single();

              if (
                profileError ||
                !profile ||
                profile.role !== "admin"
              ) {
                redirect("/dashboard");
              }

              const fullName =
                formData.get("full_name")?.toString() ?? "";

              const email =
                formData.get("email")?.toString() ?? "";

              const status =
                formData.get("status")?.toString() ?? "active";

              const { error } = await supabase.rpc(
                "update_member",
                {
                  p_member_id: member.id,
                  p_full_name: fullName,
                  p_email: email,
                  p_status: status,
                }
              );

              if (error) {
                throw new Error(error.message);
              }

              redirect(`/members/${member.id}`);
            }}
            className="mt-6 space-y-6"
          >

            {/* Full Name */}
            <div>
              <label
                htmlFor="full_name"
                className="block text-sm font-medium text-zinc-300"
              >
                Full Name
              </label>

              <input
                id="full_name"
                name="full_name"
                type="text"
                defaultValue={member.full_name}
                required
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-zinc-400"
                placeholder="Enter member name"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-300"
              >
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                defaultValue={member.email ?? ""}
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-zinc-400"
                placeholder="member@example.com"
              />

              <p className="mt-2 text-xs text-zinc-600">
                This is the member record&apos;s email address.
                It does not change the Supabase Auth account.
              </p>
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-zinc-300"
              >
                Member Status
              </label>

              <select
                id="status"
                name="status"
                defaultValue={member.status}
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-zinc-400"
              >
                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>

                <option value="suspended">
                  Suspended
                </option>
              </select>

              <p className="mt-2 text-xs text-zinc-600">
                Suspended and inactive members cannot receive
                points through the scanner.
              </p>
            </div>

            {/* Save Actions */}
            <div className="flex flex-wrap gap-3 border-t border-zinc-800 pt-6">

              <button
                type="submit"
                className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
              >
                Save Changes
              </button>

              <Link
                href={`/members/${member.id}`}
                className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
              >
                Cancel
              </Link>

            </div>

          </form>

        </section>

        {/* Account Linking */}
        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">

          <div>
            <p className="text-sm font-medium text-zinc-500">
              ACCOUNT
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              Supabase Auth Account
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Connect this member record to an existing login
              account. This does not create or delete Auth accounts.
            </p>
          </div>

          {member.user_id ? (
            <div className="mt-6">

              <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5">

                <div className="flex items-center gap-3">

                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/10 text-green-400">
                    ✓
                  </span>

                  <div>
                    <p className="font-medium text-green-400">
                      Account Linked
                    </p>

                    <p className="mt-1 text-sm text-zinc-500">
                      This member has a connected login account.
                    </p>
                  </div>

                </div>

                <p className="mt-4 break-all text-sm text-zinc-300">
                  Auth account connected
                </p>

              </div>

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

                  const { data: profile, error: profileError } =
                    await supabase
                      .from("profiles")
                      .select("role")
                      .eq("id", user.id)
                      .single();

                  if (
                    profileError ||
                    !profile ||
                    profile.role !== "admin"
                  ) {
                    redirect("/dashboard");
                  }

                  const { error } = await supabase.rpc(
                    "unlink_member_account",
                    {
                      p_member_id: member.id,
                    }
                  );

                  if (error) {
                    throw new Error(error.message);
                  }

                  redirect(`/members/${member.id}/edit`);
                }}
                className="mt-5"
              >

                <button
                  type="submit"
                  className="rounded-xl border border-red-900/50 px-4 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-950/30"
                >
                  Unlink Account
                </button>

              </form>

            </div>
          ) : (
            <form
              action={async (formData) => {
                "use server";

                const supabase = await createClient();

                const {
                  data: { user },
                } = await supabase.auth.getUser();

                if (!user) {
                  redirect("/login");
                }

                const { data: profile, error: profileError } =
                  await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", user.id)
                    .single();

                if (
                  profileError ||
                  !profile ||
                  profile.role !== "admin"
                ) {
                  redirect("/dashboard");
                }

                const accountEmail =
                  formData.get("account_email")?.toString() ?? "";

                const { error } = await supabase.rpc(
                  "link_member_account",
                  {
                    p_member_id: member.id,
                    p_email: accountEmail,
                  }
                );

                if (error) {
                  throw new Error(error.message);
                }

                redirect(`/members/${member.id}/edit`);
              }}
              className="mt-6 space-y-5"
            >

              <div>
                <label
                  htmlFor="account_email"
                  className="block text-sm font-medium text-zinc-300"
                >
                  Login Account Email
                </label>

                <input
                  id="account_email"
                  name="account_email"
                  type="email"
                  required
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-zinc-400"
                  placeholder="member@example.com"
                />

                <p className="mt-2 text-xs leading-5 text-zinc-600">
                  Enter the email of an existing Supabase Auth
                  account. The account must already exist.
                </p>
              </div>

              <button
                type="submit"
                className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
              >
                Link Account
              </button>

            </form>
          )}

        </section>

        {/* Footer */}
        <section className="mt-6 flex flex-wrap gap-3 border-t border-zinc-900 pt-6">

          <Link
            href={`/members/${member.id}`}
            className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            Back to Profile
          </Link>

          <Link
            href="/members"
            className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            Members
          </Link>

        </section>

      </div>
    </main>
  );
}

export default function EditMemberPage({
  params,
}: EditMemberPageProps) {
  return (
    <Suspense fallback={<EditMemberLoading />}>
      <EditMemberContent params={params} />
    </Suspense>
  );
}