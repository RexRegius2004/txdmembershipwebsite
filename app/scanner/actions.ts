"use server";

import { createClient } from "@/lib/supabase/server";

export async function getScannerData(
  qrToken: string
) {
  const supabase = await createClient();

  // Check login
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in.");
  }

  // Check officer/admin permission
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
      "You do not have permission to scan members."
    );
  }

  // Validate QR token
  if (!qrToken || !qrToken.trim()) {
    throw new Error("Invalid QR code.");
  }

  // Find member
  const { data: member, error: memberError } =
    await supabase
      .from("members")
      .select(
        "id, member_number, full_name, email, status"
      )
      .eq("qr_token", qrToken.trim())
      .single();

  if (memberError || !member) {
    throw new Error("Member not found.");
  }

  // Find active season
  const { data: season, error: seasonError } =
    await supabase
      .from("seasons")
      .select(
        "id, name, description, start_date, end_date"
      )
      .eq("status", "active")
      .maybeSingle();

  if (seasonError) {
    throw new Error(
      "Unable to load the active season."
    );
  }

  if (!season) {
    throw new Error(
      "There is currently no active season."
    );
  }

  // Get active point rules
  const {
    data: pointRules,
    error: rulesError,
  } = await supabase
    .from("point_rules")
    .select(
      "id, name, description, points, active"
    )
    .eq("season_id", season.id)
    .eq("active", true)
    .order("points", {
      ascending: true,
    });

  if (rulesError) {
    throw new Error(
      "Unable to load point rules."
    );
  }

  // Get current points
  const {
    data: points,
    error: pointsError,
  } = await supabase.rpc(
    "get_member_points",
    {
      p_member_id: member.id,
      p_season_id: season.id,
    }
  );

  if (pointsError) {
    throw new Error(
      "Unable to load member points."
    );
  }

  return {
    member,
    season,
    pointRules: pointRules ?? [],
    points: points ?? 0,
  };
}


export async function addPoints(
  memberId: string,
  seasonId: string,
  pointRuleId: string
) {
  const supabase = await createClient();

  // Check login
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in.");
  }

  // Check officer/admin permission
  const {
    data: profile,
    error: profileError,
  } = await supabase
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
      "You do not have permission to add points."
    );
  }

  // Let the database function perform
  // the actual security validation.
  const { data, error } =
    await supabase.rpc(
      "add_points",
      {
        p_member_id: memberId,
        p_season_id: seasonId,
        p_point_rule_id: pointRuleId,
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  return data;
}


export async function getMemberHistory(
  memberId: string,
  seasonId: string
) {
  const supabase = await createClient();

  // Check login
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in.");
  }

  // Check officer/admin permission
  const {
    data: profile,
    error: profileError,
  } = await supabase
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
      "You do not have permission to view point history."
    );
  }

  // Get transactions
  const {
    data: transactions,
    error,
  } = await supabase
    .from("point_transactions")
    .select(
      `
      id,
      amount,
      reason,
      created_at,
      point_rule_id
      `
    )
    .eq("member_id", memberId)
    .eq("season_id", seasonId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      "Unable to load point history."
    );
  }

  return transactions ?? [];
}