"use server";

import { createClient } from "@/lib/supabase/server";

type BattlePassReward = {
  id: string;
  level: number;
  required_points: number;
  name: string;
  description: string;
};

type BattlePassProgress = {
  points: number;
  level: number;
  total_levels: number;
  current_reward: BattlePassReward | null;
  next_reward: BattlePassReward | null;
};

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
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    throw new Error("Your profile could not be found.");
  }

  if (profile.role !== "admin" && profile.role !== "officer") {
    throw new Error("You do not have permission to view Battle Pass data.");
  }

  return { supabase, profile };
}

export async function getBattlePassData(memberId: string) {
  const { supabase } = await requireOfficer();

  if (!memberId) {
    throw new Error("Member ID is required.");
  }

  const { data: member, error: memberError } = await supabase
    .from("members")
    .select(
      "id, member_number, full_name, email, membership_type, status, core_started_at, core_review_due_at"
    )
    .eq("id", memberId)
    .single();

  if (memberError || !member) {
    throw new Error("Member not found.");
  }

  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("id, name, description, start_date, end_date, status")
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(1)
    .single();

  if (seasonError || !season) {
    throw new Error("There is currently no active season.");
  }

  const { data: progress, error: progressError } = await supabase.rpc(
    "get_battle_pass_progress",
    {
      p_member_id: memberId,
      p_season_id: season.id,
    }
  );

  if (progressError) {
    throw new Error(
      `Unable to load Battle Pass progress: ${progressError.message}`
    );
  }

  const { data: rewards, error: rewardsError } = await supabase
    .from("rewards")
    .select("id, level, required_points, name, description")
    .eq("season_id", season.id)
    .order("level", { ascending: true });

  if (rewardsError) {
    throw new Error(
      `Unable to load Battle Pass rewards: ${rewardsError.message}`
    );
  }

  return {
    member,
    season,
    progress: progress as BattlePassProgress,
    rewards: rewards as BattlePassReward[],
  };
}

export async function getActiveMembers() {
  const { supabase } = await requireOfficer();

  const { data: members, error } = await supabase
    .from("members")
    .select(
      "id, member_number, full_name, membership_type, status"
    )
    .eq("status", "active")
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load members: ${error.message}`);
  }

  return members ?? [];
}