import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Ensures a construction.profiles row exists after OAuth callback.
 * The DB trigger only runs on INSERT; users who already existed in auth.users
 * (e.g. signed up via another app on this project) never hit the trigger.
 */
export async function ensureProfile(
  supabase: SupabaseClient<Database, "construction">,
  user: User,
) {
  const meta = user.user_metadata ?? {};
  const fullName =
    (meta.full_name as string | undefined) ??
    (meta.name as string | undefined) ??
    user.email!;
  const avatarUrl =
    (meta.avatar_url as string | undefined) ??
    (meta.picture as string | undefined) ??
    null;

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existing) {
    await supabase.from("profiles").insert({
      id: user.id,
      email: user.email!,
      full_name: fullName,
      avatar_url: avatarUrl,
      phone: null,
    });
    return;
  }

  await supabase
    .from("profiles")
    .update({
      email: user.email!,
      full_name: fullName,
      avatar_url: avatarUrl,
    })
    .eq("id", user.id);
}
