"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type MemberNavProps = {
  memberId?: string;
};

export default function MemberNav({ memberId }: MemberNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    const supabase = createClient();

    await supabase.auth.signOut();

    router.push("/login");
    router.refresh();
  }

 const links = [
  { href: "/profile", label: "Profile" },
  { href: "/my-battle-pass", label: "Battle Pass" },
  { href: "/my-rewards", label: "My Rewards" },
  { href: "/change-password", label: "Change Password" },
  ...(memberId
    ? [{ href: `/members/${memberId}/card`, label: "Membership Card" }]
    : []),
];

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">

        {/* Brand */}
        <Link
          href="/profile"
          className="text-lg font-black tracking-tight text-white"
        >
          Member Portal
        </Link>

        {/* Navigation */}
        <div className="flex flex-wrap items-center gap-2">

          {links.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/profile" &&
                pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-white text-black"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-lg border border-zinc-800 px-3 py-2 text-sm font-medium text-zinc-400 transition hover:border-red-900 hover:bg-red-950/30 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>

        </div>

      </div>
    </nav>
  );
}