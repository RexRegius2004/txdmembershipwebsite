import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ScannerClient from "./ScannerClient";

async function ScannerContent() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !["admin", "officer"].includes(profile.role)
  ) {
    return (
      <main className="min-h-screen bg-[#09090b] p-8 text-white">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold">
            Access Denied
          </h1>

          <p className="mt-2 text-zinc-500">
            Only officers and administrators can scan
            membership cards.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium tracking-widest text-zinc-500">
              ORGANIZATION PORTAL
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              Scan Member
            </h1>

            <p className="mt-2 text-zinc-500">
              Scan a membership card to identify a member.
            </p>
          </div>

          <a
            href="/dashboard"
            className="rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
          >
            ← Dashboard
          </a>
        </header>

        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
          <ScannerClient />
        </section>
      </div>
    </main>
  );
}

export default function ScannerPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#09090b] text-white">
          <p className="text-zinc-500">
            Loading scanner...
          </p>
        </main>
      }
    >
      <ScannerContent />
    </Suspense>
  );
}