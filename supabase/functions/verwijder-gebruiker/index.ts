import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Geen autorisatie");

    // Valideer JWT en controleer rol
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Ongeldige token");

    // Controleer of gebruiker beheerder is
    const { data: account } = await supabase
      .from("accounts")
      .select("rol")
      .eq("auth_id", user.id)
      .single();

    if (!account || !["beheerder", "super_beheerder"].includes(account.rol)) {
      throw new Error("Geen toegang");
    }

    const { auth_id } = await req.json();
    if (!auth_id) throw new Error("auth_id vereist");

    const { error } = await supabase.auth.admin.deleteUser(auth_id);
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});