import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

Deno.serve(async (request: Request) => {
    if (request.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }
    if (request.method !== "POST") {
        return jsonResponse({ error: "Méthode non autorisée." }, 405);
    }

    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
        return jsonResponse({ error: "Authentification requise." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
        console.error("Missing Supabase environment configuration for admin-create-user.");
        return jsonResponse({ error: "Le service d’invitation n’est pas correctement configuré." }, 500);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await callerClient.auth.getUser();
    if (authError || !user) {
        return jsonResponse({ error: "Session invalide ou expirée." }, 401);
    }

    const { data: profile, error: profileError } = await callerClient
        .from("staff_profiles")
        .select("role, active")
        .eq("id", user.id)
        .maybeSingle();
    if (profileError) {
        console.error("Could not verify the caller profile:", profileError);
        return jsonResponse({ error: "Impossible de vérifier les droits du compte." }, 500);
    }
    if (!profile?.active || profile.role !== "super_admin") {
        return jsonResponse({ error: "Seul le superuser peut inviter des utilisateurs." }, 403);
    }

    let input: { fullName?: unknown; email?: unknown; role?: unknown };
    try {
        input = await request.json();
    } catch {
        return jsonResponse({ error: "Corps de requête JSON invalide." }, 400);
    }

    const fullName = typeof input.fullName === "string" ? input.fullName.trim() : "";
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const role = input.role;
    if (fullName.length < 2 || fullName.length > 120
        || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        || !["owner", "hotel_manager", "bar_manager"].includes(String(role))) {
        return jsonResponse({ error: "Nom, adresse e-mail ou rôle invalide." }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: invitation, error: invitationError } = await adminClient.auth.admin
        .inviteUserByEmail(email, { data: { full_name: fullName } });
    if (invitationError) {
        console.error("Supabase could not send the staff invitation:", invitationError);
        return jsonResponse({ error: "Impossible d’envoyer l’invitation. Vérifiez l’adresse ou les réglages e-mail." }, 400);
    }
    if (!invitation.user) {
        return jsonResponse({ error: "Supabase n’a pas retourné le compte invité." }, 502);
    }

    const { error: insertError } = await adminClient.from("staff_profiles").insert({
        id: invitation.user.id,
        full_name: fullName,
        role,
        active: true,
    });
    if (insertError) {
        const { error: cleanupError } = await adminClient.auth.admin.deleteUser(invitation.user.id);
        console.error("Could not create the invited staff profile:", insertError);
        if (cleanupError) {
            console.error("Could not remove the partially created invited account:", cleanupError);
            return jsonResponse({
                error: "L’invitation est partie mais le profil n’a pas été créé et le compte provisoire n’a pas pu être supprimé. Une intervention est requise.",
            }, 500);
        }
        return jsonResponse({ error: "Le profil n’a pas pu être créé ; le compte provisoire a été supprimé." }, 500);
    }

    return jsonResponse({ invited: true, userId: invitation.user.id, email }, 201);
});
