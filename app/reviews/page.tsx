"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  getActiveSeason,
  getReviewCandidates,
  getReviews,
  createReview,
  decideReview,
} from "./actions";

type Season = {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: string;
  core_selection_points: number;
  core_maintenance_points: number;
};

type Candidate = {
  id: string;
  member_number: string;
  full_name: string;
  membership_type: "standard" | "core";
  core_started_at: string | null;
  core_review_due_at: string | null;
  points: number;
  review_type:
    | "core_selection"
    | "core_maintenance";
};

type Review = {
  id: string;
  member_id: string;
  season_id: string;
  review_type:
    | "core_selection"
    | "core_maintenance";
  status: "pending" | "approved" | "denied";
  review_period_start: string;
  review_period_end: string | null;
  points_at_review: number;
  reliability: string | null;
  community_conduct: string | null;
  operational_interest: string | null;
  conduct_issues: boolean;
  notes: string | null;
  created_at: string;

  members:
    | {
        id: string;
        member_number: string;
        full_name: string;
        membership_type: string;
      }[]
    | null;

  seasons:
    | {
        id: string;
        name: string;
        start_date: string;
        end_date: string;
      }[]
    | null;
};

export default function ReviewsPage() {
  const [season, setSeason] =
    useState<Season | null>(null);

  const [candidates, setCandidates] =
    useState<Candidate[]>([]);

  const [reviews, setReviews] =
    useState<Review[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [creatingReview, setCreatingReview] =
    useState<string | null>(null);

  const [selectedReview, setSelectedReview] =
    useState<Review | null>(null);

  const [decision, setDecision] =
    useState<"approved" | "denied">(
      "approved"
    );

  const [reliability, setReliability] =
    useState("");

  const [communityConduct, setCommunityConduct] =
    useState("");

  const [operationalInterest, setOperationalInterest] =
    useState("");

  const [conductIssues, setConductIssues] =
    useState(false);

  const [notes, setNotes] =
    useState("");

  const [submittingDecision, setSubmittingDecision] =
    useState(false);

  async function loadPage() {
    try {
      setLoading(true);
      setError(null);

      const activeSeason =
        await getActiveSeason();

      if (!activeSeason) {
        setSeason(null);
        setCandidates([]);
        setReviews([]);
        return;
      }

      setSeason(activeSeason);

      const [
        reviewCandidates,
        pendingReviews,
      ] = await Promise.all([
        getReviewCandidates(
          activeSeason.id
        ),
        getReviews(),
      ]);

      setCandidates(
        reviewCandidates as Candidate[]
      );

      setReviews(
        pendingReviews as Review[]
      );

    } catch (err) {
      console.error(
        "REVIEWS PAGE ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load membership reviews."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function handleCreateReview(
    candidate: Candidate
  ) {
    try {
      setCreatingReview(candidate.id);
      setError(null);

      await createReview(
        candidate.id,
        candidate.review_type
      );

      await loadPage();

    } catch (err) {
      console.error(
        "CREATE REVIEW ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create review."
      );
    } finally {
      setCreatingReview(null);
    }
  }

  function openReview(review: Review) {
    setSelectedReview(review);

    setDecision("approved");
    setReliability("");
    setCommunityConduct("");
    setOperationalInterest("");
    setConductIssues(false);
    setNotes("");
  }

  async function handleDecision() {
    if (!selectedReview) {
      return;
    }

    if (conductIssues && decision === "approved") {
      setError(
        "A review with conduct issues cannot be approved."
      );

      return;
    }

    try {
      setSubmittingDecision(true);
      setError(null);

      await decideReview(
        selectedReview.id,
        decision,
        reliability,
        communityConduct,
        operationalInterest,
        conductIssues,
        notes
      );

      setSelectedReview(null);

      await loadPage();

    } catch (err) {
      console.error(
        "DECISION ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to decide review."
      );
    } finally {
      setSubmittingDecision(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-zinc-400">
            Loading membership reviews...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* HEADER */}

        <section>
          <div className="mb-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
            >
              ← Back to Dashboard
            </Link>
          </div>

          <h1 className="text-3xl font-bold">
            Core Member Reviews
          </h1>

          <p className="mt-2 text-zinc-400">
            Review members for Core membership
            selection and maintenance.
          </p>
        </section>

        {/* ERROR */}

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 p-4 text-red-300">
            <p className="font-medium">
              {error}
            </p>

            <button
              onClick={loadPage}
              className="mt-3 rounded-md bg-red-900 px-4 py-2 text-sm text-white hover:bg-red-800"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ACTIVE SEASON */}

        {season ? (
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

              <div>
                <p className="text-sm text-zinc-500">
                  Active Season
                </p>

                <h2 className="text-xl font-semibold">
                  {season.name}
                </h2>

                {season.description && (
                  <p className="mt-1 text-sm text-zinc-400">
                    {season.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">

                <div className="rounded-lg bg-zinc-800 px-4 py-3">
                  <p className="text-xs text-zinc-500">
                    Core Selection
                  </p>

                  <p className="text-lg font-semibold">
                    {season.core_selection_points} pts
                  </p>
                </div>

                <div className="rounded-lg bg-zinc-800 px-4 py-3">
                  <p className="text-xs text-zinc-500">
                    Core Maintenance
                  </p>

                  <p className="text-lg font-semibold">
                    {season.core_maintenance_points} pts
                  </p>
                </div>

              </div>

            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-yellow-800 bg-yellow-950/30 p-6">
            <h2 className="font-semibold text-yellow-300">
              No active season
            </h2>

            <p className="mt-1 text-sm text-yellow-400/80">
              Create or activate a season before
              reviewing Core Members.
            </p>
          </section>
        )}

        {/* ELIGIBLE MEMBERS */}

        {season && (
          <section className="space-y-4">

            <div>
              <h2 className="text-xl font-semibold">
                Eligible Members
              </h2>

              <p className="text-sm text-zinc-500">
                Members who currently meet the
                requirements for review.
              </p>
            </div>

            {candidates.length === 0 ? (

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                <p className="text-zinc-400">
                  No members are currently eligible
                  for review.
                </p>
              </div>

            ) : (

              <div className="overflow-hidden rounded-xl border border-zinc-800">

                <div className="overflow-x-auto">

                  <table className="w-full text-left">

                    <thead className="bg-zinc-900 text-sm text-zinc-400">

                      <tr>
                        <th className="px-5 py-4">
                          Member
                        </th>

                        <th className="px-5 py-4">
                          Type
                        </th>

                        <th className="px-5 py-4">
                          Points
                        </th>

                        <th className="px-5 py-4">
                          Review
                        </th>

                        <th className="px-5 py-4"></th>
                      </tr>

                    </thead>

                    <tbody className="divide-y divide-zinc-800 bg-zinc-950">

                      {candidates.map(
                        (candidate) => (

                          <tr
                            key={candidate.id}
                            className="hover:bg-zinc-900/60"
                          >

                            <td className="px-5 py-4">
                              <div>
                                <p className="font-medium">
                                  {candidate.full_name}
                                </p>

                                <p className="text-sm text-zinc-500">
                                  {candidate.member_number}
                                </p>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              {candidate.membership_type ===
                              "core" ? (
                                <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-300">
                                  Core
                                </span>
                              ) : (
                                <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300">
                                  Standard
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <span className="font-semibold">
                                {candidate.points}
                              </span>

                              <span className="ml-1 text-sm text-zinc-500">
                                pts
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              {candidate.review_type ===
                              "core_selection" ? (
                                <span className="text-sm text-blue-300">
                                  Core Selection
                                </span>
                              ) : (
                                <span className="text-sm text-purple-300">
                                  Core Maintenance
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <button
                                onClick={() =>
                                  handleCreateReview(
                                    candidate
                                  )
                                }
                                disabled={
                                  creatingReview ===
                                  candidate.id
                                }
                                className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {creatingReview ===
                                candidate.id
                                  ? "Creating..."
                                  : "Start Review"}
                              </button>
                            </td>

                          </tr>
                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </div>
            )}
          </section>
        )}

        {/* PENDING REVIEWS */}

        <section className="space-y-4">

          <div>
            <h2 className="text-xl font-semibold">
              Pending Reviews
            </h2>

            <p className="text-sm text-zinc-500">
              Reviews waiting for an officer or
              administrator decision.
            </p>
          </div>

          {reviews.length === 0 ? (

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <p className="text-zinc-400">
                There are no pending reviews.
              </p>
            </div>

          ) : (

            <div className="grid gap-4 md:grid-cols-2">

              {reviews.map((review) => {

                const member = Array.isArray(review.members)
                  ? review.members[0]
                  : review.members;

                return (
                  <div
                    key={review.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div>
                        <h3 className="font-semibold">
                          {member?.full_name ??
                            "Unknown Member"}
                        </h3>

                        <p className="text-sm text-zinc-500">
                          {member?.member_number ??
                            "Unknown member number"}
                        </p>
                      </div>

                      <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-300">
                        Pending
                      </span>

                    </div>

                    <div className="mt-4 space-y-2 text-sm">

                      <div className="flex justify-between">
                        <span className="text-zinc-500">
                          Review
                        </span>

                        <span>
                          {review.review_type ===
                          "core_selection"
                            ? "Core Selection"
                            : "Core Maintenance"}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-zinc-500">
                          Points
                        </span>

                        <span>
                          {review.points_at_review}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-zinc-500">
                          Created
                        </span>

                        <span>
                          {new Date(
                            review.created_at
                          ).toLocaleDateString()}
                        </span>
                      </div>

                    </div>

                    <button
                      onClick={() =>
                        openReview(review)
                      }
                      className="mt-5 w-full rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200"
                    >
                      Review Member
                    </button>

                  </div>
                );
              })}

            </div>
          )}

        </section>

        {/* REVIEW MODAL */}

        {selectedReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">

            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-6">

              <div className="flex items-start justify-between">

                <div>
                  <h2 className="text-xl font-bold">
                    Review Member
                  </h2>

                  <p className="mt-1 text-sm text-zinc-400">
                    {selectedReview.members?.[0]?.full_name ??
                      "Unknown Member"}
                  </p>
                </div>

                <button
                  onClick={() =>
                    setSelectedReview(null)
                  }
                  className="text-zinc-500 hover:text-white"
                >
                  ✕
                </button>

              </div>

              {/* DECISION */}

              <div className="mt-6">

                <label className="text-sm font-medium">
                  Decision
                </label>

                <div className="mt-2 grid grid-cols-2 gap-3">

                  <button
                    type="button"
                    onClick={() =>
                      setDecision("approved")
                    }
                    className={`rounded-lg border px-4 py-3 text-sm font-medium ${
                      decision === "approved"
                        ? "border-green-500 bg-green-500/10 text-green-300"
                        : "border-zinc-700 text-zinc-400"
                    }`}
                  >
                    Approve
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setDecision("denied")
                    }
                    className={`rounded-lg border px-4 py-3 text-sm font-medium ${
                      decision === "denied"
                        ? "border-red-500 bg-red-500/10 text-red-300"
                        : "border-zinc-700 text-zinc-400"
                    }`}
                  >
                    Deny
                  </button>

                </div>
              </div>

              {/* RELIABILITY */}

              <div className="mt-5">

                <label className="text-sm font-medium">
                  Reliability
                </label>

                <textarea
                  value={reliability}
                  onChange={(event) =>
                    setReliability(
                      event.target.value
                    )
                  }
                  placeholder="Describe the member's reliability..."
                  className="mt-2 min-h-24 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-zinc-500"
                />

              </div>

              {/* COMMUNITY CONDUCT */}

              <div className="mt-5">

                <label className="text-sm font-medium">
                  Community Conduct
                </label>

                <textarea
                  value={communityConduct}
                  onChange={(event) =>
                    setCommunityConduct(
                      event.target.value
                    )
                  }
                  placeholder="Describe the member's community conduct..."
                  className="mt-2 min-h-24 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-zinc-500"
                />

              </div>

              {/* OPERATIONAL INTEREST */}

              <div className="mt-5">

                <label className="text-sm font-medium">
                  Operational Interest
                </label>

                <textarea
                  value={operationalInterest}
                  onChange={(event) =>
                    setOperationalInterest(
                      event.target.value
                    )
                  }
                  placeholder="Describe the member's interest in organization operations..."
                  className="mt-2 min-h-24 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-zinc-500"
                />

              </div>

              {/* CONDUCT ISSUE */}

              <div className="mt-5 rounded-lg border border-zinc-800 bg-zinc-950 p-4">

                <label className="flex cursor-pointer items-start gap-3">

                  <input
                    type="checkbox"
                    checked={conductIssues}
                    onChange={(event) =>
                      setConductIssues(
                        event.target.checked
                      )
                    }
                    className="mt-1 h-4 w-4"
                  />

                  <span>
                    <span className="block text-sm font-medium">
                      Conduct issues
                    </span>

                    <span className="mt-1 block text-xs text-zinc-500">
                      Mark this if the member has
                      conduct issues that should affect
                      the review.
                    </span>
                  </span>

                </label>

              </div>

              {/* NOTES */}

              <div className="mt-5">

                <label className="text-sm font-medium">
                  Review Notes
                </label>

                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(
                      event.target.value
                    )
                  }
                  placeholder="Additional notes..."
                  className="mt-2 min-h-28 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-zinc-500"
                />

              </div>

              {/* ACTIONS */}

              <div className="mt-6 flex gap-3">

                <button
                  type="button"
                  onClick={() =>
                    setSelectedReview(null)
                  }
                  disabled={submittingDecision}
                  className="flex-1 rounded-md border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDecision}
                  disabled={
                    submittingDecision ||
                    (
                      decision === "approved" &&
                      conductIssues
                    )
                  }
                  className={`flex-1 rounded-md px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                    decision === "approved"
                      ? "bg-green-700 hover:bg-green-600"
                      : "bg-red-700 hover:bg-red-600"
                  }`}
                >
                  {submittingDecision
                    ? "Saving..."
                    : decision === "approved"
                      ? "Approve Core Membership"
                      : "Deny Review"}
                </button>

              </div>

            </div>
          </div>
        )}

      </div>
    </main>
  );
}