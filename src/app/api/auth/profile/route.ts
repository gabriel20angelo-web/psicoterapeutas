import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  // 1. Authenticate caller via their token
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = authHeader.replace("Bearer ", "");
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: { user } } = await anonClient.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Fetch profile using service role (bypasses RLS completely)
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("role, approved, username, is_admin, full_name, avatar_url")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    // Profile doesn't exist yet — create one
    const meta = user.user_metadata || {};
    const fullName = meta.full_name || meta.name || user.email?.split("@")[0] || "";

    // Check if this is the FIRST user in the system → make them admin_master
    const { count } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true });

    const isFirstUser = (count ?? 0) === 0;

    const newProfile = {
      id: user.id,
      email: user.email || "",
      full_name: fullName,
      username: meta.username || "",
      is_admin: isFirstUser,
      approved: isFirstUser,
      role: isFirstUser ? "admin_master" : "terapeuta",
      avatar_url: meta.avatar_url || meta.picture || null,
    };

    const { error: insertError } = await supabaseAdmin
      .from("profiles")
      .upsert(newProfile, { onConflict: "id" });

    if (insertError) {
      // Log kept for server debugging only
      return NextResponse.json({ error: "Erro ao criar perfil" }, { status: 500 });
    }

    return NextResponse.json({ profile: newProfile, created: true });
  }

  return NextResponse.json({ profile });
}
