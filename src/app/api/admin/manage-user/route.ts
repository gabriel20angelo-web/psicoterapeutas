import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

type Action = "approve" | "revoke" | "deny" | "change-role";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, action, role: newRole } = body as {
    userId: string;
    action: Action;
    role?: string;
  };

  if (!userId || !action) {
    return NextResponse.json({ error: "userId and action required" }, { status: 400 });
  }

  // --- Authenticate caller ---
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = authHeader.replace("Bearer ", "");
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: { user: caller } } = await anonClient.auth.getUser(token);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // --- Verify caller is admin (using service role — bypasses RLS) ---
  const { data: callerProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .single();

  if (!callerProfile || (callerProfile.role !== "admin" && callerProfile.role !== "admin_master")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // --- Get target user ---
  const { data: targetProfile } = await supabaseAdmin
    .from("profiles")
    .select("role, email")
    .eq("id", userId)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  // Protect admin_master from being modified by non-admin_master
  if (targetProfile.role === "admin_master" && callerProfile.role !== "admin_master") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  // --- Execute action (all using supabaseAdmin — bypasses RLS) ---

  if (action === "approve") {
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ approved: true })
      .eq("id", userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, message: "Usuario aprovado" });
  }

  if (action === "revoke") {
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ approved: false })
      .eq("id", userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, message: "Acesso revogado" });
  }

  if (action === "change-role") {
    const VALID_ROLES = ["terapeuta", "terapeuta_senior", "admin", "admin_master"];
    if (!newRole || !VALID_ROLES.includes(newRole)) {
      return NextResponse.json({ error: "Role inválida" }, { status: 400 });
    }

    if (newRole === "admin_master" && callerProfile.role !== "admin_master") {
      return NextResponse.json({ error: "Sem permissão para atribuir admin_master" }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, message: `Role alterada para ${newRole}` });
  }

  if (action === "deny") {
    // 1. Try to delete auth user (may not exist — that's fine)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      // Auth user may not exist — expected for orphan profiles
    }

    // 2. Try cascade delete via RPC (deletes all FK references + profile)
    const { error: rpcError } = await supabaseAdmin.rpc("delete_user_cascade", {
      target_user_id: userId,
    });

    if (rpcError) {
      // RPC not available — fallback to update
      // Fallback: just mark as denied (profile stays but user has no access)
      await supabaseAdmin
        .from("profiles")
        .update({ approved: false, role: "terapeuta", is_admin: false })
        .eq("id", userId);
    }

    return NextResponse.json({ ok: true, message: "Usuario negado" });
  }

  return NextResponse.json({ error: "Ação desconhecida" }, { status: 400 });
}
