"use server";

import { createClient } from "@/lib/supabase/server";

async function requireOfficer() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in.");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    throw new Error("Organization profile not found.");
  }

  if (
    profile.role !== "admin" &&
    profile.role !== "officer"
  ) {
    throw new Error("You do not have permission to manage rewards.");
  }

  return supabase;
}

export async function getRewardClaims() {
  const supabase = await requireOfficer();

  const { data, error } = await supabase
    .from("reward_claims")
    .select(`
      id,
      member_id,
      reward_id,
      season_id,
      status,
      claimed_at,
      fulfilled_by,
      fulfilled_at,
      members (
        id,
        member_number,
        full_name
      ),
      rewards (
        id,
        level,
        required_points,
        name,
        description
      ),
      seasons (
        id,
        name
      )
    `)
    .order("claimed_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function fulfillRewardClaim(
  claimId: string
) {
  const supabase = await requireOfficer();

  const { data, error } = await supabase.rpc(
    "fulfill_reward_claim",
    {
      p_claim_id: claimId,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  return data;
}