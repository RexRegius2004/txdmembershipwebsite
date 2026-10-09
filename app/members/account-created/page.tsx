import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  COOKIE_NAME,
  decryptTemporaryCredentials,
} from "@/lib/temporary-credentials";

//export const instant = false;

async function finishAccountCreation() {
  "use server";

  const cookieStore = await cookies();

  cookieStore.delete(COOKIE_NAME);

  redirect("/members");
}

export default async function AccountCreatedPage() {
  const cookieStore = await cookies();

  const encryptedCredentials =
    cookieStore.get(COOKIE_NAME)?.value;

  if (!encryptedCredentials) {
    redirect("/members");
  }

  const credentials =
    decryptTemporaryCredentials(encryptedCredentials);

  if (!credentials) {
    redirect("/members");
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto flex min-h-screen max-w-2xl items-center px-6 py-12">
        <div className="w-full">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-7 w-7 text-emerald-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 12.5 9.5 17 19 7.5"
                />
              </svg>
            </div>

            <p className="mt-5 text-xs font-medium uppercase tracking-[0.18em] text-zinc-600">
              Member Portal
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Account Created
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">
              The member account has been created successfully.
              Give the temporary login credentials below to the
              member.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-2xl shadow-black/20">
            <div className="border-b border-zinc-800 pb-5">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
                Member
              </p>

              <h2 className="mt-2 text-xl font-semibold text-white">
                {credentials.fullName}
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                {credentials.memberNumber}
              </p>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
                  Login Email
                </p>

                <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                  <p className="break-all text-sm text-zinc-200">
                    {credentials.email}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
                  Temporary Password
                </p>

                <div className="mt-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-4">
                  <p className="break-all font-mono text-base font-semibold tracking-wide text-white">
                    {credentials.temporaryPassword}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex gap-3">
                <div className="mt-0.5 shrink-0 text-amber-400">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v4m0 4h.01M10.3 3.9 2.8 17a2 2 0 0 0 1.7 0L13.7 3.9a2 2 0 0 0-3.4 0Z"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-sm font-medium text-amber-200">
                    Give these credentials to the member
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-200/60">
                    This temporary password is only for the
                    member&apos;s first login. They will be required
                    to create a new password after signing in.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-xs leading-5 text-zinc-500">
                The temporary password is not stored in the
                database. It is kept in a short-lived encrypted
                browser cookie for this onboarding session.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <form action={finishAccountCreation} className="flex-1">
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
                >
                  Done
                </button>
              </form>

              <Link
                href="/dashboard"
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
              >
                Dashboard
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-zinc-700">
            Click Done after giving the temporary credentials to
            the member.
          </p>
        </div>
      </div>
    </main>
  );
}