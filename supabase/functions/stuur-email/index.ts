import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function goedkeuringEmail(naam: string, cirkelNaam: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #EAECF0;">
      <div style="background: #E8503A; padding: 32px; text-align: center;">
        <div style="font-size: 32px; margin-bottom: 8px;">🏘️</div>
        <div style="color: #ffffff; font-size: 22px; font-weight: 800;">BuurtCirkel</div>
        <div style="color: rgba(255,255,255,0.75); font-size: 13px; margin-top: 4px;">Diensten uitwisselen met je buren</div>
      </div>
      <div style="padding: 32px;">
        <h2 style="font-size: 18px; font-weight: 700; color: #0F1117; margin: 0 0 12px;">Welkom bij ${cirkelNaam}!</h2>
        <p style="font-size: 14px; color: #6B7280; line-height: 1.7; margin: 0 0 24px;">
          Hallo ${naam},<br><br>
          Je aanmelding voor <strong>${cirkelNaam}</strong> is goedgekeurd. Je kunt nu inloggen en diensten uitwisselen met je buren.
        </p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="https://buurtcirkel.vercel.app" style="display: inline-block; background: #E8503A; color: #ffffff; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 10px; text-decoration: none;">
            Inloggen bij BuurtCirkel
          </a>
        </div>
        <div style="background: #F7F8FA; border-radius: 10px; padding: 14px 16px; border: 1px solid #EAECF0;">
          <p style="font-size: 12px; color: #9CA3AF; margin: 0; line-height: 1.6;">
            Je ontvangt deze e-mail omdat je je hebt aangemeld bij BuurtCirkel.
          </p>
        </div>
      </div>
      <div style="padding: 16px 32px 24px; text-align: center; border-top: 1px solid #EAECF0;">
        <p style="font-size: 12px; color: #9CA3AF; margin: 0;">© 2026 BuurtCirkel · buurtcirkel.net</p>
      </div>
    </div>
  `;
}

function verzoekEmail(aanbiedernaam: string, aanvragernaam: string, dienstTitel: string, bericht: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #EAECF0;">
      <div style="background: #E8503A; padding: 32px; text-align: center;">
        <div style="font-size: 32px; margin-bottom: 8px;">🏘️</div>
        <div style="color: #ffffff; font-size: 22px; font-weight: 800;">BuurtCirkel</div>
        <div style="color: rgba(255,255,255,0.75); font-size: 13px; margin-top: 4px;">Diensten uitwisselen met je buren</div>
      </div>
      <div style="padding: 32px;">
        <h2 style="font-size: 18px; font-weight: 700; color: #0F1117; margin: 0 0 12px;">Nieuw verzoek voor je dienst!</h2>
        <p style="font-size: 14px; color: #6B7280; line-height: 1.7; margin: 0 0 16px;">
          Hallo ${aanbiedernaam},<br><br>
          <strong>${aanvragernaam}</strong> heeft een verzoek gestuurd voor je dienst: <strong>${dienstTitel}</strong>.
        </p>
        ${bericht ? `
        <div style="background: #F7F8FA; border-radius: 10px; padding: 14px 16px; border: 1px solid #EAECF0; margin-bottom: 24px;">
          <p style="font-size: 13px; color: #6B7280; margin: 0; line-height: 1.6; font-style: italic;">"${bericht}"</p>
        </div>
        ` : ""}
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="https://buurtcirkel.vercel.app" style="display: inline-block; background: #E8503A; color: #ffffff; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 10px; text-decoration: none;">
            Bekijk het verzoek
          </a>
        </div>
        <div style="background: #F7F8FA; border-radius: 10px; padding: 14px 16px; border: 1px solid #EAECF0;">
          <p style="font-size: 12px; color: #9CA3AF; margin: 0; line-height: 1.6;">
            Log in bij BuurtCirkel om het verzoek te accepteren of af te wijzen.
          </p>
        </div>
      </div>
      <div style="padding: 16px 32px 24px; text-align: center; border-top: 1px solid #EAECF0;">
        <p style="font-size: 12px; color: #9CA3AF; margin: 0;">© 2026 BuurtCirkel · buurtcirkel.net</p>
      </div>
    </div>
  `;
}

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

    const body = await req.json();
    const { type } = body;

    let onderwerp = "";
    let html = "";

    if (type === "goedkeuring") {
      const { naar, naam, cirkelNaam } = body;
      // Alleen beheerders mogen goedkeuringsmails sturen
      const { data: account } = await supabase.from("accounts").select("rol").eq("auth_id", user.id).single();
      if (!account || !["beheerder", "super_beheerder"].includes(account.rol)) throw new Error("Geen toegang");
      onderwerp = "Je aanmelding is goedgekeurd — BuurtCirkel";
      html = goedkeuringEmail(naam, cirkelNaam);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: "BuurtCirkel <noreply@buurtcirkel.net>", to: naar, subject: onderwerp, html }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Fout bij versturen");

    } else if (type === "verzoek") {
      const { naar, aanbiedernaam, aanvragernaam, dienstTitel, bericht } = body;
      onderwerp = `Nieuw verzoek voor je dienst: ${dienstTitel}`;
      html = verzoekEmail(aanbiedernaam, aanvragernaam, dienstTitel, bericht || "");
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: "BuurtCirkel <noreply@buurtcirkel.net>", to: naar, subject: onderwerp, html }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Fout bij versturen");

    } else {
      throw new Error("Onbekend e-mail type");
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
