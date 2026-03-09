import { useState, useEffect } from "react";

// ─── SUPABASE CONFIG ───────────────────────────────────────────────
const SUPABASE_URL = "https://uztplrszzpwywhvsmoqz.supabase.co";
const SUPABASE_KEY = "sb_publishable_Lxs6J-YBpbBl0sQ6XBZjMA_R0_P9i_n";

async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": options.prefer || "return=representation",
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `HTTP ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

const api = {
  // Cirkels
  getCirkels: () => sb("cirkels?select=*&order=naam"),
  insertCirkel: (row) => sb("cirkels", { method: "POST", body: JSON.stringify(row) }),

  // Accounts
  getAccount: (email) => sb(`accounts?select=*&email=eq.${encodeURIComponent(email)}`),
  getAccountById: (id) => sb(`accounts?select=*&id=eq.${id}`),
  getAccountsByCirkel: (cirkelId) => sb(`accounts?select=*&cirkel_id=eq.${encodeURIComponent(cirkelId)}&order=naam`),
  insertAccount: (row) => sb("accounts", { method: "POST", body: JSON.stringify(row) }),
  updateAccount: (id, patch) => sb(`accounts?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteAccount: (id) => sb(`accounts?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }),

  // Diensten
  getDiensten: (cirkelId) => sb(`diensten?select=*&cirkel_id=eq.${encodeURIComponent(cirkelId)}&order=datum.desc`),
  insertDienst: (row) => sb("diensten", { method: "POST", body: JSON.stringify(row) }),
  deleteDienst: (id) => sb(`diensten?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }),
};

// ─── STIJL HELPERS ────────────────────────────────────────────────
const CAT_STIJL = {
  Educatie:  { bg: "#FFF3CD", text: "#856404" },
  Technisch: { bg: "#D1ECF1", text: "#0C5460" },
  Koken:     { bg: "#F8D7DA", text: "#721C24" },
  Tuin:      { bg: "#D4EDDA", text: "#155724" },
  Zorg:      { bg: "#E2D9F3", text: "#4A235A" },
  Overig:    { bg: "#F0F0F0", text: "#555555" },
};
const CATS = ["Educatie", "Technisch", "Koken", "Tuin", "Zorg", "Overig"];
const inp  = { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #ddd", fontSize: 14, outline: "none", background: "#fafafa", boxSizing: "border-box", fontFamily: "inherit" };
const card = { background: "#fff", borderRadius: 14, padding: "18px 20px", boxShadow: "0 2px 10px rgba(0,0,0,0.07)" };

function ini(naam) {
  return (naam || "").trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

// ─── UI COMPONENTEN ───────────────────────────────────────────────
function Avatar({ tekst, size = 40, kleur = "#888" }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: kleur, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: size * 0.35, flexShrink: 0 }}>
      {tekst}
    </div>
  );
}

function Toast({ msg, type = "ok" }) {
  return (
    <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: type === "fout" ? "#c0392b" : "#1a1a2e", color: "#fff", padding: "10px 22px", borderRadius: 30, fontSize: 14, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", whiteSpace: "nowrap" }}>
      {msg}
    </div>
  );
}

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: 28, maxWidth: 460, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", maxHeight: "90vh", overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
      <div style={{ width: 36, height: 36, border: "3px solid #eee", borderTop: "3px solid #E8503A", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Foutmelding({ tekst, onHerlaad }) {
  return (
    <div style={{ ...card, textAlign: "center", padding: 32, color: "#c0392b" }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Verbindingsfout</div>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>{tekst}</div>
      {onHerlaad && <button type="button" onClick={onHerlaad} style={{ background: "#E8503A", color: "#fff", border: "none", padding: "9px 20px", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>Opnieuw proberen</button>}
    </div>
  );
}

// ─── HOOFD APP ────────────────────────────────────────────────────
export default function App() {
  const [gebruiker, setGebruiker]   = useState(null);
  const [scherm, setScherm]         = useState("login");
  const [cirkels, setCirkels]       = useState([]);
  const [cirkelId, setCirkelId]     = useState(null);
  const [leden, setLeden]           = useState([]);
  const [diensten, setDiensten]     = useState([]);
  const [laden, setLaden]           = useState(false);
  const [fout, setFout]             = useState(null);
  const [filter, setFilter]         = useState("Alle");
  const [zoek, setZoek]             = useState("");
  const [toast, setToast]           = useState(null);
  const [reageerDienst, setReageerDienst] = useState(null);

  // forms
  const [loginForm,   setLoginForm]   = useState({ email: "", wachtwoord: "" });
  const [aanmeldForm, setAanmeldForm] = useState({ naam: "", email: "", wachtwoord: "", herhaal: "", telefoon: "", cirkelId: "" });
  const [dienstForm,  setDienstForm]  = useState({ titel: "", categorie: "Overig", beschrijving: "" });
  const [cirkelForm,  setCirkelForm]  = useState({ naam: "", stad: "" });
  const [loginFout,   setLoginFout]   = useState("");
  const [aanmeldFout, setAanmeldFout] = useState("");
  const [bezig, setBezig]             = useState(false);

  const cirkel      = cirkels.find(c => c.id === cirkelId) || null;
  const isBeheerder = gebruiker?.rol === "beheerder";
  const wachtenden  = leden.filter(l => l.status === "wacht");
  const actieven    = leden.filter(l => l.status === "actief");

  function showToast(msg, type = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ── DATA LADEN ──────────────────────────────────────────────────
  useEffect(() => {
    laadCirkels();
  }, []);

  async function laadCirkels() {
    try {
      const data = await api.getCirkels();
      setCirkels(data);
    } catch (e) {
      setFout("Kan geen verbinding maken met de database: " + e.message);
    }
  }

  async function laadCirkelData(cId) {
    setLaden(true);
    setFout(null);
    try {
      const [ledenData, dienstenData] = await Promise.all([
        api.getAccountsByCirkel(cId),
        api.getDiensten(cId),
      ]);
      setLeden(ledenData);
      setDiensten(dienstenData);
    } catch (e) {
      setFout("Fout bij laden: " + e.message);
    } finally {
      setLaden(false);
    }
  }

  // ── AUTH ────────────────────────────────────────────────────────
  async function inloggen() {
    setLoginFout("");
    setBezig(true);
    try {
      const res = await api.getAccount(loginForm.email.trim());
      const acc = res[0];
      if (!acc || acc.wachtwoord !== loginForm.wachtwoord) {
        setLoginFout("E-mailadres of wachtwoord klopt niet."); return;
      }
      if (acc.status === "wacht")      { setGebruiker(acc); setScherm("wachten"); return; }
      if (acc.status === "afgewezen")  { setLoginFout("Je aanmelding is helaas afgewezen."); return; }
      setGebruiker(acc);
      setCirkelId(acc.cirkel_id);
      await laadCirkelData(acc.cirkel_id);
      setScherm("cirkel");
      showToast("Welkom terug, " + acc.naam.split(" ")[0] + "!");
    } catch (e) {
      setLoginFout("Verbindingsfout: " + e.message);
    } finally {
      setBezig(false);
    }
  }

  function uitloggen() {
    setGebruiker(null);
    setCirkelId(null);
    setLeden([]);
    setDiensten([]);
    setScherm("login");
    setLoginForm({ email: "", wachtwoord: "" });
  }

  async function aanmelden() {
    setAanmeldFout("");
    const { naam, email, wachtwoord, herhaal, telefoon, cirkelId: cId } = aanmeldForm;
    if (!naam.trim() || !email.trim() || !wachtwoord || !cId || !telefoon.trim()) {
      setAanmeldFout("Vul alle velden in."); return;
    }
    if (wachtwoord !== herhaal) { setAanmeldFout("Wachtwoorden komen niet overeen."); return; }
    if (!/^[0-9\s\+\-]{7,15}$/.test(telefoon.trim())) { setAanmeldFout("Voer een geldig telefoonnummer in."); return; }
    if (!cirkels.find(c => c.id === cId)) { setAanmeldFout("Onbekende buurtcirkelcode."); return; }
    setBezig(true);
    try {
      const bestaand = await api.getAccount(email.trim());
      if (bestaand.length > 0) { setAanmeldFout("Dit e-mailadres is al in gebruik."); return; }
      const nieuw = await api.insertAccount({
        naam: naam.trim(), email: email.trim(), wachtwoord,
        telefoon: telefoon.trim(), rol: "lid", status: "wacht", cirkel_id: cId,
      });
      setGebruiker(nieuw[0]);
      setScherm("wachten");
      showToast("Aanmelding verstuurd!");
    } catch (e) {
      setAanmeldFout("Fout: " + e.message);
    } finally {
      setBezig(false);
    }
  }

  // ── BEHEER ──────────────────────────────────────────────────────
  async function lidGoedkeuren(id) {
    try {
      await api.updateAccount(id, { status: "actief" });
      setLeden(prev => prev.map(l => l.id === id ? { ...l, status: "actief" } : l));
      showToast("Lid goedgekeurd!");
    } catch (e) { showToast("Fout: " + e.message, "fout"); }
  }

  async function lidAfwijzen(id) {
    try {
      await api.updateAccount(id, { status: "afgewezen" });
      setLeden(prev => prev.map(l => l.id === id ? { ...l, status: "afgewezen" } : l));
      showToast("Aanmelding afgewezen.");
    } catch (e) { showToast("Fout: " + e.message, "fout"); }
  }

  async function lidVerwijderen(id) {
    try {
      await api.deleteAccount(id);
      setLeden(prev => prev.filter(l => l.id !== id));
      setDiensten(prev => prev.filter(d => d.lid_id !== id));
      showToast("Lid verwijderd.");
    } catch (e) { showToast("Fout: " + e.message, "fout"); }
  }

  // ── DIENSTEN ────────────────────────────────────────────────────
  async function dienstToevoegen() {
    if (!dienstForm.titel.trim() || !dienstForm.beschrijving.trim()) return;
    setBezig(true);
    try {
      const nieuw = await api.insertDienst({
        lid_id: gebruiker.id, lid_naam: gebruiker.naam,
        avatar: ini(gebruiker.naam), cirkel_id: cirkelId,
        titel: dienstForm.titel, categorie: dienstForm.categorie,
        beschrijving: dienstForm.beschrijving,
        datum: new Date().toISOString().slice(0, 10),
      });
      setDiensten(prev => [nieuw[0], ...prev]);
      setDienstForm({ titel: "", categorie: "Overig", beschrijving: "" });
      setScherm("cirkel");
      showToast("Dienst toegevoegd!");
    } catch (e) { showToast("Fout: " + e.message, "fout"); }
    finally { setBezig(false); }
  }

  async function dienstVerwijderen(id) {
    try {
      await api.deleteDienst(id);
      setDiensten(prev => prev.filter(d => d.id !== id));
      showToast("Dienst verwijderd.");
    } catch (e) { showToast("Fout: " + e.message, "fout"); }
  }

  // ── NIEUWE CIRKEL ───────────────────────────────────────────────
  async function nieuweCirkelAanmaken() {
    if (!cirkelForm.naam.trim() || !cirkelForm.stad.trim()) return;
    setBezig(true);
    try {
      const code = "BC-" + String(Math.floor(1000 + Math.random() * 9000));
      const kleuren = ["#E8503A", "#4A6FD9", "#6BBF4A", "#C0567B", "#F5A623", "#17A2B8"];
      const kleur = kleuren[Math.floor(Math.random() * kleuren.length)];
      await api.insertCirkel({ id: code, naam: cirkelForm.naam.trim(), stad: cirkelForm.stad.trim(), kleur });
      await api.updateAccount(gebruiker.id, { cirkel_id: code, rol: "beheerder" });
      const nieuweCirkels = await api.getCirkels();
      setCirkels(nieuweCirkels);
      setGebruiker(prev => ({ ...prev, cirkel_id: code, rol: "beheerder" }));
      setCirkelId(code);
      setLeden([]);
      setDiensten([]);
      setCirkelForm({ naam: "", stad: "" });
      setScherm("cirkel");
      showToast("Buurtcirkel " + code + " aangemaakt!");
    } catch (e) { showToast("Fout: " + e.message, "fout"); }
    finally { setBezig(false); }
  }

  // ── GEFILTERDE DIENSTEN ─────────────────────────────────────────
  const gefilterд = diensten.filter(d =>
    (filter === "Alle" || d.categorie === filter) &&
    (zoek === "" || d.titel.toLowerCase().includes(zoek.toLowerCase()) || d.beschrijving.toLowerCase().includes(zoek.toLowerCase()))
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", background: "#F5F2EE", fontFamily: "Georgia, serif", color: "#1a1a2e" }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* ── HEADER ── */}
      <div style={{ background: "#1a1a2e", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", position: "sticky", top: 0, zIndex: 100 }}>
        <button type="button" onClick={() => gebruiker && scherm !== "wachten" && setScherm("cirkel")} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: 20, fontWeight: 900 }}>
          Buurt<span style={{ color: "#E8503A" }}>Cirkel</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {gebruiker && scherm !== "wachten" && (
            <>
              {isBeheerder && (
                <button type="button" onClick={() => setScherm(scherm === "beheer" ? "cirkel" : "beheer")} style={{ background: scherm === "beheer" ? "#E8503A" : "rgba(255,255,255,0.15)", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", position: "relative" }}>
                  Beheer
                  {wachtenden.length > 0 && <span style={{ position: "absolute", top: -6, right: -6, background: "#E8503A", color: "#fff", fontSize: 10, fontWeight: 700, width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #1a1a2e" }}>{wachtenden.length}</span>}
                </button>
              )}
              <button type="button" onClick={uitloggen} style={{ background: "none", color: "#aaa", border: "1px solid #444", padding: "5px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer" }}>Uitloggen</button>
              <Avatar tekst={ini(gebruiker.naam)} size={32} kleur={cirkel?.kleur || "#E8503A"} />
            </>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px" }}>

        {/* ── DATABASE FOUT ── */}
        {fout && scherm !== "login" && scherm !== "aanmelden" && (
          <div style={{ marginBottom: 16 }}>
            <Foutmelding tekst={fout} onHerlaad={() => cirkelId && laadCirkelData(cirkelId)} />
          </div>
        )}

        {/* ══ LOGIN ══ */}
        {scherm === "login" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🏘️</div>
              <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 6 }}>BuurtCirkel</h1>
              <p style={{ color: "#888", fontSize: 15 }}>Gratis diensten uitwisselen met je buren</p>
            </div>
            <div style={{ ...card, maxWidth: 400, margin: "0 auto" }}>
              <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 20 }}>Inloggen</h2>
              {loginFout && <div style={{ background: "#fff0f0", color: "#c0392b", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 14, border: "1px solid #fcc" }}>{loginFout}</div>}
              {fout && <div style={{ background: "#fff0f0", color: "#c0392b", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 14, border: "1px solid #fcc" }}>{fout}</div>}
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 5 }}>E-mailadres</label>
              <input value={loginForm.email} onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))} placeholder="jouw@email.nl" style={{ ...inp, marginBottom: 12 }} />
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 5 }}>Wachtwoord</label>
              <input type="password" value={loginForm.wachtwoord} onChange={e => setLoginForm(p => ({ ...p, wachtwoord: e.target.value }))} onKeyDown={e => e.key === "Enter" && inloggen()} placeholder="••••••••" style={{ ...inp, marginBottom: 20 }} />
              <button type="button" onClick={inloggen} disabled={bezig} style={{ background: "#E8503A", color: "#fff", border: "none", padding: "12px", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: bezig ? "not-allowed" : "pointer", width: "100%", marginBottom: 12, opacity: bezig ? 0.7 : 1 }}>
                {bezig ? "Bezig..." : "Inloggen"}
              </button>
              <button type="button" onClick={() => { setScherm("aanmelden"); setAanmeldFout(""); }} style={{ background: "#f5f5f5", color: "#444", border: "none", padding: "12px", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%" }}>
                Nog geen account? Aanmelden
              </button>
              <div style={{ marginTop: 16, padding: "12px 14px", background: "#f9f9f9", borderRadius: 10, fontSize: 12, color: "#999", lineHeight: 1.7 }}>
                <strong>Demo:</strong> lena@bc.nl / lena123 (beheerder BC-1042)<br />
                pieter@bc.nl / pieter123 (lid BC-1042)
              </div>
            </div>
          </div>
        )}

        {/* ══ AANMELDEN ══ */}
        {scherm === "aanmelden" && (
          <div>
            <button type="button" onClick={() => setScherm("login")} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 14, marginBottom: 18 }}>&#8592; Terug naar inloggen</button>
            <div style={card}>
              <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Aanmelden</h2>
              <p style={{ color: "#999", fontSize: 13, marginBottom: 20 }}>Na aanmelding beoordeelt de beheerder je verzoek.</p>
              {aanmeldFout && <div style={{ background: "#fff0f0", color: "#c0392b", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 14, border: "1px solid #fcc" }}>{aanmeldFout}</div>}
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 5 }}>Volledige naam</label>
              <input value={aanmeldForm.naam} onChange={e => setAanmeldForm(p => ({ ...p, naam: e.target.value }))} placeholder="Voor- en achternaam" style={{ ...inp, marginBottom: 12 }} />
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 5 }}>E-mailadres</label>
              <input value={aanmeldForm.email} onChange={e => setAanmeldForm(p => ({ ...p, email: e.target.value }))} placeholder="jouw@email.nl" style={{ ...inp, marginBottom: 12 }} />
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 5 }}>Mobiel telefoonnummer</label>
              <input value={aanmeldForm.telefoon} onChange={e => setAanmeldForm(p => ({ ...p, telefoon: e.target.value }))} placeholder="bijv. 06 12345678" style={{ ...inp, marginBottom: 12 }} />
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 5 }}>Wachtwoord</label>
              <input type="password" value={aanmeldForm.wachtwoord} onChange={e => setAanmeldForm(p => ({ ...p, wachtwoord: e.target.value }))} placeholder="Minimaal 6 tekens" style={{ ...inp, marginBottom: 12 }} />
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 5 }}>Herhaal wachtwoord</label>
              <input type="password" value={aanmeldForm.herhaal} onChange={e => setAanmeldForm(p => ({ ...p, herhaal: e.target.value }))} placeholder="Nogmaals je wachtwoord" style={{ ...inp, marginBottom: 12 }} />
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 5 }}>Buurtcirkel code</label>
              <input value={aanmeldForm.cirkelId} onChange={e => setAanmeldForm(p => ({ ...p, cirkelId: e.target.value.toUpperCase() }))} placeholder="bijv. BC-1042" style={{ ...inp, marginBottom: 6 }} />
              <div style={{ fontSize: 12, color: "#aaa", marginBottom: 20 }}>
                Beschikbaar:{" "}
                {cirkels.map(c => (
                  <button key={c.id} type="button" onClick={() => setAanmeldForm(p => ({ ...p, cirkelId: c.id }))} style={{ background: "none", border: "none", color: "#E8503A", cursor: "pointer", fontSize: 12, textDecoration: "underline", padding: "0 4px" }}>
                    {c.id} ({c.naam})
                  </button>
                ))}
              </div>
              <button type="button" onClick={aanmelden} disabled={bezig} style={{ background: "#E8503A", color: "#fff", border: "none", padding: "12px", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: bezig ? "not-allowed" : "pointer", width: "100%", opacity: bezig ? 0.7 : 1 }}>
                {bezig ? "Bezig..." : "Aanmelding versturen"}
              </button>
            </div>
          </div>
        )}

        {/* ══ WACHTEN ══ */}
        {scherm === "wachten" && (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>⏳</div>
            <h2 style={{ fontWeight: 900, fontSize: 24, marginBottom: 10 }}>Je aanmelding wordt beoordeeld</h2>
            <p style={{ color: "#888", fontSize: 15, lineHeight: 1.7, marginBottom: 8 }}>
              De beheerder van <strong>{cirkels.find(c => c.id === gebruiker?.cirkel_id)?.naam || "je buurtcirkel"}</strong> beoordeelt je verzoek.
            </p>
            <p style={{ color: "#bbb", fontSize: 13, marginBottom: 28 }}>Code: <strong>{gebruiker?.cirkel_id}</strong></p>
            <button type="button" onClick={uitloggen} style={{ background: "#eee", color: "#555", border: "none", padding: "11px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Uitloggen</button>
          </div>
        )}

        {/* ══ CIRKEL ══ */}
        {scherm === "cirkel" && cirkel && (
          <div>
            <div style={{ background: cirkel.kleur, borderRadius: 18, padding: "22px 22px 18px", marginBottom: 18, color: "#fff" }}>
              <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8, marginBottom: 3, letterSpacing: 1 }}>{cirkelId}</div>
              <div style={{ fontWeight: 900, fontSize: 26, marginBottom: 4 }}>{cirkel.naam}</div>
              <div style={{ opacity: 0.85, fontSize: 13 }}>{cirkel.stad} · {diensten.length} diensten · {actieven.length} leden</div>
              <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                <button type="button" onClick={() => setScherm("nieuweDienst")} style={{ background: "rgba(255,255,255,0.25)", color: "#fff", border: "2px solid rgba(255,255,255,0.5)", padding: "8px 18px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  + Dienst aanbieden
                </button>
                {isBeheerder && (
                  <button type="button" onClick={() => setScherm("nieuweCirkel")} style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "2px solid rgba(255,255,255,0.3)", padding: "8px 18px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    + Nieuwe cirkel
                  </button>
                )}
              </div>
            </div>

            <input value={zoek} onChange={e => setZoek(e.target.value)} placeholder="Zoek diensten..." style={{ ...inp, marginBottom: 12 }} />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
              {["Alle", ...CATS].map(cat => (
                <button type="button" key={cat} onClick={() => setFilter(cat)} style={{ padding: "5px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", background: filter === cat ? cirkel.kleur : "#fff", color: filter === cat ? "#fff" : "#666", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                  {cat}
                </button>
              ))}
            </div>

            {laden ? <Spinner /> : gefilterд.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#bbb" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
                <div>Geen diensten gevonden</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {gefilterд.map(d => {
                  const cat = CAT_STIJL[d.categorie] || CAT_STIJL.Overig;
                  const isEigen = d.lid_id === gebruiker?.id;
                  return (
                    <div key={d.id} style={card}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                        <Avatar tekst={d.avatar} size={42} kleur={cirkel.kleur} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{d.titel}</div>
                          <div style={{ fontSize: 13, color: "#999" }}>{d.lid_naam}</div>
                        </div>
                        <span style={{ background: cat.bg, color: cat.text, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>{d.categorie}</span>
                      </div>
                      <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6, margin: "0 0 12px" }}>{d.beschrijving}</p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#bbb" }}>{new Date(d.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}</span>
                        <div style={{ display: "flex", gap: 8 }}>
                          {(isEigen || isBeheerder) && (
                            <button type="button" onClick={() => dienstVerwijderen(d.id)} style={{ background: "#fee", color: "#c0392b", border: "1px solid #fcc", padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                              Verwijder
                            </button>
                          )}
                          {!isEigen && (
                            <button type="button" onClick={() => setReageerDienst(d)} style={{ background: cirkel.kleur, color: "#fff", border: "none", padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                              Reageer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ BEHEER ══ */}
        {scherm === "beheer" && isBeheerder && (
          <div>
            <button type="button" onClick={() => setScherm("cirkel")} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 14, marginBottom: 18 }}>&#8592; Terug</button>
            <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 20 }}>Beheer — {cirkel?.naam}</h2>

            {/* Wachtenden */}
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                Wachten op goedkeuring
                {wachtenden.length > 0 && <span style={{ background: "#E8503A", color: "#fff", fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{wachtenden.length}</span>}
              </h3>
              {wachtenden.length === 0 ? (
                <div style={{ ...card, color: "#bbb", textAlign: "center", padding: 24 }}>Geen openstaande aanmeldingen</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {wachtenden.map(lid => (
                    <div key={lid.id} style={{ ...card, borderLeft: "4px solid #F5A623" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <Avatar tekst={ini(lid.naam)} size={40} kleur="#F5A623" />
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{lid.naam}</div>
                          <div style={{ fontSize: 13, color: "#999" }}>{lid.email}</div>
                          {lid.telefoon && <div style={{ fontSize: 13, color: "#999" }}>📱 {lid.telefoon}</div>}
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button type="button" onClick={() => lidGoedkeuren(lid.id)} style={{ background: "#27ae60", color: "#fff", border: "none", padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Goedkeuren</button>
                          <button type="button" onClick={() => lidAfwijzen(lid.id)} style={{ background: "#e74c3c", color: "#fff", border: "none", padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Afwijzen</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actieve leden */}
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Actieve leden ({actieven.length})</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {actieven.map(lid => (
                  <div key={lid.id} style={{ ...card, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <Avatar tekst={ini(lid.naam)} size={40} kleur={cirkel?.kleur || "#888"} />
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                        {lid.naam}
                        {lid.rol === "beheerder" && <span style={{ background: "#1a1a2e", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>Beheerder</span>}
                      </div>
                      <div style={{ fontSize: 13, color: "#999" }}>{lid.email}</div>
                      {lid.telefoon && <div style={{ fontSize: 13, color: "#999" }}>📱 {lid.telefoon}</div>}
                    </div>
                    {lid.id !== gebruiker.id && (
                      <button type="button" onClick={() => lidVerwijderen(lid.id)} style={{ background: "#fee", color: "#c0392b", border: "1px solid #fcc", padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        Verwijderen
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ NIEUWE DIENST ══ */}
        {scherm === "nieuweDienst" && cirkel && (
          <div>
            <button type="button" onClick={() => setScherm("cirkel")} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 14, marginBottom: 18 }}>&#8592; Terug</button>
            <div style={card}>
              <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 20 }}>Dienst aanbieden</h2>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 5 }}>Wat bied je aan?</label>
              <input value={dienstForm.titel} onChange={e => setDienstForm(p => ({ ...p, titel: e.target.value }))} placeholder="bijv. Gitaarlessen voor beginners" style={{ ...inp, marginBottom: 14 }} />
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 5 }}>Categorie</label>
              <select value={dienstForm.categorie} onChange={e => setDienstForm(p => ({ ...p, categorie: e.target.value }))} style={{ ...inp, marginBottom: 14 }}>
                {CATS.map(c => <option key={c}>{c}</option>)}
              </select>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 5 }}>Beschrijving</label>
              <textarea value={dienstForm.beschrijving} onChange={e => setDienstForm(p => ({ ...p, beschrijving: e.target.value }))} placeholder="Vertel meer over wat je aanbiedt..." rows={4} style={{ ...inp, resize: "vertical", marginBottom: 20 }} />
              <button type="button" onClick={dienstToevoegen} disabled={bezig} style={{ background: cirkel.kleur, color: "#fff", border: "none", padding: "12px", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: bezig ? "not-allowed" : "pointer", width: "100%", opacity: bezig ? 0.7 : 1 }}>
                {bezig ? "Bezig..." : "Dienst plaatsen"}
              </button>
            </div>
          </div>
        )}

        {/* ══ NIEUWE CIRKEL ══ */}
        {scherm === "nieuweCirkel" && (
          <div>
            <button type="button" onClick={() => setScherm("cirkel")} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 14, marginBottom: 18 }}>&#8592; Terug</button>
            <div style={card}>
              <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 6 }}>Nieuwe buurtcirkel</h2>
              <p style={{ color: "#999", fontSize: 13, marginBottom: 20 }}>Er wordt automatisch een unieke code aangemaakt. Jij wordt automatisch beheerder.</p>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 5 }}>Naam van de wijk</label>
              <input value={cirkelForm.naam} onChange={e => setCirkelForm(p => ({ ...p, naam: e.target.value }))} placeholder="bijv. De Pijp" style={{ ...inp, marginBottom: 14 }} />
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 5 }}>Stad</label>
              <input value={cirkelForm.stad} onChange={e => setCirkelForm(p => ({ ...p, stad: e.target.value }))} placeholder="bijv. Amsterdam" style={{ ...inp, marginBottom: 20 }} />
              <button type="button" onClick={nieuweCirkelAanmaken} disabled={bezig} style={{ background: "#E8503A", color: "#fff", border: "none", padding: "12px", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: bezig ? "not-allowed" : "pointer", width: "100%", opacity: bezig ? 0.7 : 1 }}>
                {bezig ? "Bezig..." : "Buurtcirkel aanmaken"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── REAGEER MODAL ── */}
      <Modal open={!!reageerDienst} onClose={() => setReageerDienst(null)}>
        {reageerDienst && (
          <div>
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>Contact opnemen</div>
            <p style={{ color: "#666", fontSize: 14, marginBottom: 16 }}>
              Je reageert op <strong>{reageerDienst.titel}</strong> van {reageerDienst.lid_naam}.
            </p>
            <div style={{ background: "#f9f9f9", borderRadius: 10, padding: 14, marginBottom: 18, fontSize: 14, color: "#444", lineHeight: 1.6 }}>
              {reageerDienst.beschrijving}
            </div>
            <button type="button" onClick={() => { setReageerDienst(null); showToast("Je bericht is verstuurd!"); }} style={{ background: cirkel?.kleur || "#E8503A", color: "#fff", border: "none", padding: "11px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%", marginBottom: 8 }}>
              Stuur een berichtje
            </button>
            <button type="button" onClick={() => setReageerDienst(null)} style={{ background: "#eee", color: "#555", border: "none", padding: "11px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%" }}>
              Annuleren
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
