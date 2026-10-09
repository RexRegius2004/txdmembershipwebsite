import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import MemberNav from "@/components/member-nav";

//export const instant = false;
type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type MemberCard = {
  id: string;
  member_number: string;
  full_name: string;
  email: string | null;
  status: string;
  membership_type: "standard" | "core";
  qr_token: string;
  created_at: string;
  user_id: string | null;
};

export default async function MemberCardPage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: member, error } = await supabase.rpc(
    "get_member_card",
    {
      p_member_id: id,
    }
  );

  if (error) {
    if (
      error.message.includes("Member not found")
    ) {
      notFound();
    }

    if (
      error.message.includes("permission")
    ) {
      redirect("/profile");
    }

    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-red-900 bg-red-950/30 p-6">
            <p className="text-sm uppercase tracking-wider text-red-500">
              Membership Card
            </p>

            <h1 className="mt-2 text-2xl font-bold">
              Unable to load membership card
            </h1>

            <p className="mt-3 text-sm text-red-300">
              {error.message}
            </p>

            <Link
              href="/profile"
              className="mt-6 inline-block rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900 hover:text-white"
            >
              Back to Profile
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!member) {
    notFound();
  }

  const memberData = member as MemberCard;

  const qrDataUrl = await QRCode.toDataURL(
    memberData.qr_token,
    {
      width: 600,
      margin: 2,
    }
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <MemberNav memberId={memberData.id} />

      <main className="px-6 py-10">
        <div className="mx-auto max-w-3xl">

          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-zinc-500">
                Membership
              </p>

              <h1 className="mt-1 text-3xl font-bold">
                Membership Card
              </h1>

              <p className="mt-2 text-zinc-400">
                Present this QR code when your membership needs to
                be scanned.
              </p>
            </div>

            <Link
              href="/profile"
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900 hover:text-white"
            >
              Back to Profile
            </Link>
          </div>

          <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-white text-black shadow-2xl">

            <div className="border-b border-zinc-200 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Organization Membership
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                {memberData.full_name}
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                {memberData.member_number}
              </p>
            </div>

            <div className="flex flex-col items-center px-6 py-10">

              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <img
                  src={qrDataUrl}
                  alt={`QR code for ${memberData.full_name}`}
                  className="h-72 w-72"
                />
              </div>

              <p className="mt-6 text-center text-sm font-medium text-zinc-700">
                Scan this QR code to identify this member.
              </p>

              <div className="mt-8 grid w-full max-w-md grid-cols-2 gap-4">

                <div className="rounded-xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Membership
                  </p>

                  <p className="mt-1 font-semibold">
                    {memberData.membership_type === "core"
                      ? "Core Member"
                      : "Standard Member"}
                  </p>
                </div>

                <div className="rounded-xl bg-zinc-100 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Status
                  </p>

                  <p className="mt-1 font-semibold capitalize">
                    {memberData.status}
                  </p>
                </div>

              </div>

            </div>

            <div className="border-t border-zinc-200 px-6 py-4 text-center text-xs text-zinc-500">
              This card contains a unique membership identifier.
            </div>

          </section>

        </div>
      </main>
    </div>
  );
}