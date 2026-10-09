"use server";

import { createClient } from "@/lib/supabase/server";

type ReviewMember = {
  id: string;
  member_number: string;
  full_name: string;
  membership_type: "standard" | "core";
  core_started_at: string | null;
  core_review_due_at: string | null;
};

type ReviewSeason = {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: string;
  core_selection_points: number;
  core_maintenance_points: number;
};

async function requireOfficer() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("You must be logged in.");
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
    !["admin", "officer"].includes(profile.role)
  ) {
    throw new Error(
      "You do not have permission to manage membership reviews."
    );
  }

  return {
    supabase,
    user,
    profile,
  };
}


/* =========================================================
   GET ACTIVE SEASON
   ========================================================= */

export async function getActiveSeason() {
  const { supabase } = await requireOfficer();

  const { data, error } = await supabase
    .from("seasons")
    .select(`
      id,
      name,
      description,
      start_date,
      end_date,
      status,
      core_selection_points,
      core_maintenance_points
    `)
    .eq("status", "active")
    .order("start_date", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("ACTIVE SEASON ERROR:", error);

    throw new Error(
      `Unable to load active season: ${error.message}`
    );
  }

  return data as ReviewSeason | null;
}


/* =========================================================
   GET MEMBERS ELIGIBLE FOR REVIEW
   ========================================================= */

export async function getReviewCandidates(
  seasonId: string
) {
  const { supabase } = await requireOfficer();

  const { data: season, error: seasonError } =
    await supabase
      .from("seasons")
      .select(`
        id,
        core_selection_points,
        core_maintenance_points
      `)
      .eq("id", seasonId)
      .single();

  if (seasonError || !season) {
    throw new Error(
      "Unable to load season settings."
    );
  }

  const { data: members, error: membersError } =
    await supabase
      .from("members")
      .select(`
        id,
        member_number,
        full_name,
        membership_type,
        core_started_at,
        core_review_due_at
      `)
      .eq("status", "active")
      .order("full_name", {
        ascending: true,
      });

  if (membersError) {
    throw new Error(
      `Unable to load members: ${membersError.message}`
    );
  }

  const { data: transactions, error: transactionsError } =
    await supabase
      .from("point_transactions")
      .select(`
        member_id,
        amount
      `)
      .eq("season_id", seasonId);

  if (transactionsError) {
    throw new Error(
      `Unable to load member points: ${transactionsError.message}`
    );
  }

  const { data: pendingReviews, error: reviewsError } =
    await supabase
      .from("membership_reviews")
      .select(`
        member_id
      `)
      .eq("status", "pending");

  if (reviewsError) {
    throw new Error(
      `Unable to load pending reviews: ${reviewsError.message}`
    );
  }

  const pointsMap = new Map<string, number>();

  for (const transaction of transactions ?? []) {
    const current =
      pointsMap.get(transaction.member_id) ?? 0;

    pointsMap.set(
      transaction.member_id,
      current + transaction.amount
    );
  }

  const pendingSet = new Set(
    (pendingReviews ?? []).map(
      (review) => review.member_id
    )
  );

  const candidates: Array<
    ReviewMember & {
      points: number;
      review_type: "core_selection" | "core_maintenance";
    }
  > = [];

  for (const member of members ?? []) {
    const points =
      pointsMap.get(member.id) ?? 0;

    /*
     * Ignore members who already have
     * a pending review.
     */
    if (pendingSet.has(member.id)) {
      continue;
    }

    /*
     * STANDARD → CORE SELECTION
     */

    if (
      member.membership_type === "standard" &&
      points >= season.core_selection_points
    ) {
      candidates.push({
        ...member,
        membership_type: "standard",
        points,
        review_type: "core_selection",
      });

      continue;
    }

    /*
     * CORE → MAINTENANCE REVIEW
     */

    if (
      member.membership_type === "core" &&
      points >= season.core_maintenance_points &&
      (
        member.core_review_due_at === null ||
        new Date(member.core_review_due_at) <= new Date()
      )
    ) {
      candidates.push({
        ...member,
        membership_type: "core",
        points,
        review_type: "core_maintenance",
      });
    }
  }

  return candidates;
}


/* =========================================================
   GET PENDING REVIEWS
   ========================================================= */

export async function getReviews() {
  const { supabase } = await requireOfficer();

  const {
    data,
    error,
  } = await supabase
    .from("membership_reviews")
    .select(`
      id,
      member_id,
      season_id,
      review_type,
      status,
      review_period_start,
      review_period_end,
      points_at_review,
      reliability,
      community_conduct,
      operational_interest,
      conduct_issues,
      notes,
      reviewed_by,
      reviewed_at,
      created_at,

      members (
        id,
        member_number,
        full_name,
        membership_type
      ),

      seasons (
        id,
        name,
        start_date,
        end_date
      )
    `)
    .eq("status", "pending")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error("REVIEWS ERROR:", error);

    throw new Error(
      `Unable to load membership reviews: ${error.message}`
    );
  }

  return data ?? [];
}


/* =========================================================
   CREATE REVIEW
   ========================================================= */

export async function createReview(
  memberId: string,
  reviewType:
    | "core_selection"
    | "core_maintenance"
) {
  const { supabase } = await requireOfficer();

  /*
   * IMPORTANT:
   *
   * The database function now determines
   * the active season itself.
   *
   * Therefore we only send:
   *
   * p_member_id
   * p_review_type
   */

  const { data, error } =
    await supabase.rpc(
      "create_membership_review",
      {
        p_member_id: memberId,
        p_review_type: reviewType,
      }
    );

  if (error) {
    console.error(
      "CREATE REVIEW ERROR:",
      error
    );

    throw new Error(
      `Unable to create review: ${error.message}`
    );
  }

  return data;
}


/* =========================================================
   DECIDE REVIEW
   ========================================================= */

export async function decideReview(
  reviewId: string,
  decision: "approved" | "denied",
  reliability: string,
  communityConduct: string,
  operationalInterest: string,
  conductIssues: boolean,
  notes: string
) {
  const { supabase } = await requireOfficer();

  const { data, error } =
    await supabase.rpc(
      "decide_membership_review",
      {
        p_review_id: reviewId,
        p_decision: decision,
        p_reliability: reliability,
        p_community_conduct:
          communityConduct,
        p_operational_interest:
          operationalInterest,
        p_conduct_issues:
          conductIssues,
        p_notes: notes,
      }
    );

  if (error) {
    console.error(
      "DECIDE REVIEW ERROR:",
      error
    );

    throw new Error(
      `Unable to decide review: ${error.message}`
    );
  }

  return data;
}


/* =========================================================
   GET CONDUCT RECORDS
   ========================================================= */

export async function getConductRecords(
  memberId: string
) {
  const { supabase } = await requireOfficer();

  const {
    data,
    error,
  } = await supabase
    .from("conduct_records")
    .select(`
      id,
      member_id,
      title,
      description,
      severity,
      status,
      created_by,
      created_at,
      resolved_at
    `)
    .eq("member_id", memberId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Unable to load conduct records: ${error.message}`
    );
  }

  return data ?? [];
}


/* =========================================================
   CREATE CONDUCT RECORD
   ========================================================= */

export async function createConductRecord(
  memberId: string,
  title: string,
  description: string,
  severity:
    | "minor"
    | "moderate"
    | "major"
) {
  const { supabase, user } =
    await requireOfficer();

  if (!title.trim()) {
    throw new Error(
      "Conduct record title is required."
    );
  }

  const { data, error } =
    await supabase
      .from("conduct_records")
      .insert({
        member_id: memberId,
        title: title.trim(),
        description:
          description.trim() || null,
        severity,
        status: "open",
        created_by: user.id,
      })
      .select()
      .single();

  if (error) {
    throw new Error(
      `Unable to create conduct record: ${error.message}`
    );
  }

  return data;
}


/* =========================================================
   RESOLVE CONDUCT RECORD
   ========================================================= */

export async function resolveConductRecord(
  recordId: string
) {
  const { supabase } =
    await requireOfficer();

  const { data, error } =
    await supabase
      .from("conduct_records")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", recordId)
      .select()
      .single();

  if (error) {
    throw new Error(
      `Unable to resolve conduct record: ${error.message}`
    );
  }

  return data;
}