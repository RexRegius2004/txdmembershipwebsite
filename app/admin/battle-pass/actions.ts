"use server";

import { createClient } from "@/lib/supabase/server";


async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in.");
  }

  const { data: profile, error } =
    await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

  if (
    error ||
    !profile ||
    profile.role !== "admin"
  ) {
    throw new Error(
      "You do not have permission to manage Battle Pass settings."
    );
  }

  return supabase;
}


export async function getBattlePassSettings() {
  const supabase = await requireAdmin();

  const {
    data: seasons,
    error: seasonError,
  } = await supabase
    .from("seasons")
    .select(
      `
      id,
      name,
      description,
      start_date,
      end_date,
      status,
      core_selection_points,
      core_maintenance_points
      `
    )
    .order("created_at", {
      ascending: false,
    });

  if (seasonError) {
    throw new Error(
      "Unable to load seasons."
    );
  }

  const activeSeason =
    seasons?.find(
      (season) =>
        season.status === "active"
    ) ?? null;

  let rewards: any[] = [];

  if (activeSeason) {
    const {
      data,
      error: rewardError,
    } = await supabase
      .from("rewards")
      .select(
        `
        id,
        season_id,
        level,
        required_points,
        name,
        description
        `
      )
      .eq(
        "season_id",
        activeSeason.id
      )
      .order("level", {
        ascending: true,
      });

    if (rewardError) {
      throw new Error(
        "Unable to load Battle Pass levels."
      );
    }

    rewards = data ?? [];
  }

  return {
    seasons: seasons ?? [],
    activeSeason,
    rewards,
  };
}


export async function createReward(
  seasonId: string,
  level: number,
  requiredPoints: number,
  name: string,
  description: string
) {
  const supabase = await requireAdmin();

  if (level <= 0) {
    throw new Error(
      "Level must be greater than zero."
    );
  }

  if (requiredPoints < 0) {
    throw new Error(
      "Required points cannot be negative."
    );
  }

  if (!name.trim()) {
    throw new Error(
      "Reward name is required."
    );
  }

  const { error } =
    await supabase
      .from("rewards")
      .insert({
        season_id: seasonId,
        level,
        required_points:
          requiredPoints,
        name: name.trim(),
        description:
          description.trim() || null,
      });

  if (error) {
    throw new Error(error.message);
  }
}


export async function updateReward(
  rewardId: string,
  level: number,
  requiredPoints: number,
  name: string,
  description: string
) {
  const supabase = await requireAdmin();

  if (level <= 0) {
    throw new Error(
      "Level must be greater than zero."
    );
  }

  if (requiredPoints < 0) {
    throw new Error(
      "Required points cannot be negative."
    );
  }

  if (!name.trim()) {
    throw new Error(
      "Reward name is required."
    );
  }

  const { error } =
    await supabase
      .from("rewards")
      .update({
        level,
        required_points:
          requiredPoints,
        name: name.trim(),
        description:
          description.trim() || null,
      })
      .eq("id", rewardId);

  if (error) {
    throw new Error(error.message);
  }
}


export async function deleteReward(
  rewardId: string
) {
  const supabase = await requireAdmin();

  const { error } =
    await supabase
      .from("rewards")
      .delete()
      .eq("id", rewardId);

  if (error) {
    throw new Error(error.message);
  }
}


export async function updateCoreRequirements(
  seasonId: string,
  selectionPoints: number,
  maintenancePoints: number
) {
  const supabase = await requireAdmin();

  if (selectionPoints < 0) {
    throw new Error(
      "Core selection points cannot be negative."
    );
  }

  if (maintenancePoints < 0) {
    throw new Error(
      "Core maintenance points cannot be negative."
    );
  }

  const { error } =
    await supabase
      .from("seasons")
      .update({
        core_selection_points:
          selectionPoints,
        core_maintenance_points:
          maintenancePoints,
      })
      .eq("id", seasonId);

  if (error) {
    throw new Error(error.message);
  }
}