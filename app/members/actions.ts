"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  COOKIE_MAX_AGE,
  COOKIE_NAME,
  encryptTemporaryCredentials,
} from "@/lib/temporary-credentials";

function generateTemporaryPassword(length = 12) {
  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  let password = "";

  for (let i = 0; i < length; i++) {
    password += characters[randomValues[i] % characters.length];
  }

  return password;
}

/**
 * Creates a new member and automatically creates
 * their Supabase Auth login account.
 *
 * The generated temporary password is never stored
 * in the database. It is placed into a short-lived
 * encrypted HTTP-only cookie so the admin can see it
 * once after creation.
 */
export async function createMember(formData: FormData) {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!fullName) {
    throw new Error("Member name is required.");
  }

  if (!email) {
    throw new Error("Member email is required.");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    throw new Error("Only administrators can create members.");
  }

  const { data: member, error: memberError } =
    await supabase.rpc("create_member", {
      p_full_name: fullName,
      p_email: email,
    });

  if (memberError || !member) {
    throw new Error(
      memberError?.message ?? "Failed to create the member record."
    );
  }

  const adminSupabase = createAdminClient();

  let authUserId: string | null = null;

  try {
    const temporaryPassword = generateTemporaryPassword();

    const { data: authData, error: authError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

    if (authError || !authData.user) {
      throw new Error(
        authError?.message ??
          "Failed to create the member login account."
      );
    }

    authUserId = authData.user.id;

    const { error: profileUpsertError } =
      await adminSupabase.from("profiles").upsert(
        {
          id: authUserId,
          full_name: fullName,
          role: "member",
          must_change_password: true,
        },
        {
          onConflict: "id",
        }
      );

    if (profileUpsertError) {
      throw new Error(
        `Failed to create the member profile: ${profileUpsertError.message}`
      );
    }

    const { error: linkError } = await adminSupabase
      .from("members")
      .update({
        user_id: authUserId,
      })
      .eq("id", member.id);

    if (linkError) {
      throw new Error(
        `Failed to link the member account: ${linkError.message}`
      );
    }

    const encryptedCredentials = encryptTemporaryCredentials({
      memberId: member.id,
      memberNumber: member.member_number,
      fullName: member.full_name,
      email,
      temporaryPassword,
    });

    const cookieStore = await cookies();

    cookieStore.set({
      name: COOKIE_NAME,
      value: encryptedCredentials,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
  } catch (error) {
    if (authUserId) {
      await adminSupabase.auth.admin.deleteUser(authUserId);
    }

    await adminSupabase
      .from("members")
      .delete()
      .eq("id", member.id);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Failed to create the member account.");
  }

  redirect("/members/account-created");
}

/**
 * Generates a brand-new temporary password for an
 * existing member account.
 *
 * This is intentionally NOT a password recovery function.
 * The old password cannot be viewed or recovered.
 *
 * Instead:
 * - The old password is replaced.
 * - A new random temporary password is generated.
 * - The member is forced to change it on login.
 * - The temporary password is never stored in the database.
 * - The new credentials are displayed through the
 *   existing short-lived encrypted credential page.
 */
export async function resetMemberPassword(memberId: string) {
  if (!memberId) {
    throw new Error("Member ID is required.");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    throw new Error(
      "Only administrators can reset member passwords."
    );
  }

  const adminSupabase = createAdminClient();

  const { data: member, error: memberError } =
    await adminSupabase
      .from("members")
      .select(
        "id, member_number, full_name, email, user_id, status"
      )
      .eq("id", memberId)
      .single();

  if (memberError || !member) {
    throw new Error("Member could not be found.");
  }

  if (!member.user_id) {
    throw new Error(
      "This member does not have a linked login account."
    );
  }

  if (!member.email) {
    throw new Error(
      "This member does not have an email address."
    );
  }

  if (member.status !== "active") {
    throw new Error(
      "Only active members can have their login password reset."
    );
  }

  const temporaryPassword = generateTemporaryPassword();

  const { error: updatePasswordError } =
    await adminSupabase.auth.admin.updateUserById(
      member.user_id,
      {
        password: temporaryPassword,
      }
    );

  if (updatePasswordError) {
    throw new Error(
      `Failed to reset the member password: ${updatePasswordError.message}`
    );
  }

  const { error: profileUpdateError } =
    await adminSupabase
      .from("profiles")
      .update({
        must_change_password: true,
      })
      .eq("id", member.user_id);

  if (profileUpdateError) {
    throw new Error(
      `The password was reset, but the password-change requirement could not be updated: ${profileUpdateError.message}`
    );
  }

  const encryptedCredentials = encryptTemporaryCredentials({
    memberId: member.id,
    memberNumber: member.member_number,
    fullName: member.full_name,
    email: member.email,
    temporaryPassword,
  });

  const cookieStore = await cookies();

  cookieStore.set({
    name: COOKIE_NAME,
    value: encryptedCredentials,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  redirect("/members/account-created?reset=1");
}