import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = authHeader.replace("Bearer ", "");
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: { user: caller } } = await anonClient.auth.getUser(token);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: callerProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .single();

  if (!callerProfile || (callerProfile.role !== "admin" && callerProfile.role !== "admin_master")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: targetProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });
  }

  if (targetProfile.role === "admin_master") {
    return NextResponse.json({ error: "Cannot deny admin_master" }, { status: 403 });
  }

  // 1. Try to delete auth user (may not exist — that's OK)
  try {
    await supabaseAdmin.auth.admin.deleteUser(userId);
  } catch {
    // Auth user doesn't exist — no problem
  }

  // 2. Mark profile as denied
  await supabaseAdmin
    .from("profiles")
    .update({ approved: false, role: "terapeuta", is_admin: false })
    .eq("id", userId);

  // 3. Try to delete profile row; if FK blocks it, the update above already denied access
  try {
    await supabaseAdmin.from("profiles").delete().eq("id", userId);
  } catch {
    // FK constraint — profile stays but user is already denied
  }

  return NextResponse.json({ ok: true });
}
