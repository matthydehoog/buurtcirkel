import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const origin = req.headers.get("origin") || "";
  const toegestaneOrigins = [
    "https://buurtcirkel.vercel.app",
    "http://localhost:3000",
  ];
  if (!toegestaneOrigins.includes(origin)) {
    return new Response(JSON.stringify({ error: "Niet toegestaan" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Geen autorisatie");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Ongeldige token");

    const { auth_id, zelf_cleanup } = await req.json();
    if (!auth_id) throw new Error("auth_id vereist");

    if (zelf_cleanup) {
      // Eigen account opruimen — alleen als auth_id overeenkomt met ingelogde gebruiker
      if (auth_id !== user.id) throw new Error("Geen toegang");
    } else {
      // Beheerder verwijdert iemand anders
      const { data: account } = await supabase
        .from("accounts")
        .select("rol")
        .eq("auth_id", user.id)
        .single();

      if (!account || !["beheerder", "super_beheerder"].includes(account.rol)) {
        throw new Error("Geen toegang");
      }
    }

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