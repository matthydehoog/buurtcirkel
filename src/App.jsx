const APP_VERSIE = "2.7.3";

// ─── SUPABASE CONFIG ───────────────────────────────────────────────
const SUPABASE_URL = "https://uztplrszzpwywhvsmoqz.supabase.co";
const SUPABASE_KEY = "sb_publishable_Lxs6J-YBpbBl0sQ6XBZjMA_R0_P9i_n";

// ─── HCAPTCHA ─────────────────────────────────────────────────────
const HCAPTCHA_SITE_KEY = "ef56a732-ebfc-459e-9b72-ffbc5e0e8a0e"; // ← vervang dit

// Actieve Auth sessie (token wordt na login ingesteld)
let authToken = null;

// REST API helper — gebruikt JWT token als die beschikbaar is
async function sb(path, options = {}) {
  const token = authToken || SUPABASE_KEY;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${token}`,
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

// Supabase Auth helper
async function authFetch(endpoint, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${endpoint}`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || data.message || "Auth fout");
  return data;
}

const api = {
  // Auth
  signUp:  (email, wachtwoord, captchaToken) => authFetch("signup",  { email, password: wachtwoord, gotrue_meta_security: { captcha_token: captchaToken } }),
  signIn:  (email, wachtwoord, captchaToken) => authFetch("token?grant_type=password", { email, password: wachtwoord, gotrue_meta_security: { captcha_token: captchaToken } }),
  updatePassword: (nieuwWachtwoord) => fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "PUT",
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ password: nieuwWachtwoord }),
  }).then(r => r.json()),
  signOut: () => fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: "POST",
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${authToken}` },
  }),

  // Cirkels
  getCirkels:    ()        => sb("cirkels?select=*&order=naam"),
  insertCirkel:  (row)     => sb("cirkels", { method: "POST", body: JSON.stringify(row) }),
  deleteCirkel:  (id)      => sb(`cirkels?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", prefer: "return=minimal" }),

  // Profielen (accounts tabel — geen wachtwoord meer)
  getProfiel:          (authId)   => sb(`accounts?select=*&auth_id=eq.${authId}`),
  getAccountsByCirkel: (cirkelId) => sb(`accounts?select=*&cirkel_id=eq.${encodeURIComponent(cirkelId)}&order=naam`),
  insertAccount:       (row)      => sb("accounts", { method: "POST", body: JSON.stringify(row) }),
  updateAccount:       (id, patch)=> sb(`accounts?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteAccount:       (id)       => sb(`accounts?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }),

  // Diensten
  getDiensten:   (cirkelId) => sb(`diensten?select=*&cirkel_id=eq.${encodeURIComponent(cirkelId)}&order=datum.desc`),
  insertDienst:  (row)      => sb("diensten", { method: "POST", body: JSON.stringify(row) }),
  updateDienst:  (id, patch)=> sb(`diensten?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteDienst:  (id)       => sb(`diensten?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }),

  // Verzoeken
  getVerzoeken:         (aanbiederId) => sb(`verzoeken?select=*&aanbieder_id=eq.${aanbiederId}&order=datum.desc`),
  getMijnVerzoeken:     (aanvragerId) => sb(`verzoeken?select=*&aanvrager_id=eq.${aanvragerId}&order=datum.desc`),
  insertVerzoek:        (row)         => sb("verzoeken", { method: "POST", body: JSON.stringify(row) }),
  updateVerzoek:        (id, patch)   => sb(`verzoeken?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(patch) }),

  // Alle wachtende accounts (voor super beheerder)
  getAlleWachtenden: () => sb("accounts?select=*&status=eq.wacht&order=naam"),

  // Login pogingen
  getLoginPoging:    (email) => sb(`login_pogingen?select=*&email=eq.${encodeURIComponent(email)}`),
  upsertLoginPoging: (row)   => sb("login_pogingen", { method: "POST", body: JSON.stringify(row), prefer: "resolution=merge-duplicates,return=representation" }),
  resetLoginPoging:  (email) => sb(`login_pogingen?email=eq.${encodeURIComponent(email)}`, { method: "PATCH", body: JSON.stringify({ pogingen: 0, geblokkerd_tot: null }) }),

  // Beheerder-cirkels
  getBeheerderCirkels:  (beheerderId) => sb(`beheerder_cirkels?select=cirkel_id&beheerder_id=eq.${beheerderId}`),
  insertBeheerderCirkel:(row)         => sb("beheerder_cirkels", { method: "POST", body: JSON.stringify(row) }),
};

// ─── STIJL ────────────────────────────────────────────────────────
const CAT_STIJL = {
  Educatie:  { bg: "#FFF3CD", text: "#856404" },
  Technisch: { bg: "#D1ECF1", text: "#0C5460" },
  Koken:     { bg: "#F8D7DA", text: "#721C24" },
  Tuin:      { bg: "#D4EDDA", text: "#155724" },
  Zorg:      { bg: "#E2D9F3", text: "#4A235A" },
  Overig:    { bg: "#F0F0F0", text: "#555555" },
};
const VERZOEK_STIJL = {
  wacht:     { bg: "#FFF3CD", text: "#856404", label: "Wacht" },
  geaccepteerd: { bg: "#D4EDDA", text: "#155724", label: "Geaccepteerd" },
  afgewezen: { bg: "#F8D7DA", text: "#721C24", label: "Afgewezen" },
};
const CATS = ["Educatie", "Technisch", "Koken", "Tuin", "Zorg", "Overig"];
const inp  = { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #ddd", fontSize: 14, outline: "none", background: "#fafafa", boxSizing: "border-box", fontFamily: "inherit" };
const card = { background: "#fff", borderRadius: 14, padding: "18px 20px", boxShadow: "0 2px 10px rgba(0,0,0,0.07)" };

// ─── HCAPTCHA WIDGET ──────────────────────────────────────────────
function HCaptcha({ id = "hcaptcha-widget", onVerify, onExpire }) {
  useEffect(() => {
    // Laad hCaptcha script als het nog niet geladen is
    if (!document.getElementById("hcaptcha-script")) {
      const script = document.createElement("script");
      script.id = "hcaptcha-script";
      script.src = "https://js.hcaptcha.com/1/api.js";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    // Render widget zodra script geladen is
    function renderWidget() {
      const el = document.getElementById(id);
      if (!el || el.dataset.rendered) return;
      if (window.hcaptcha) {
        window.hcaptcha.render(el, {
          sitekey: HCAPTCHA_SITE_KEY,
          callback: onVerify,
          "expired-callback": () => { if (onExpire) onExpire(); },
          theme: "light",
          size: "normal",
        });
        el.dataset.rendered = "true";
      }
    }

    if (window.hcaptcha) {
      renderWidget();
    } else {
      document.getElementById("hcaptcha-script").addEventListener("load", renderWidget);
    }

    return () => {
      // Cleanup: reset widget bij unmount
      const el = document.getElementById(id);
      if (el) {
        el.dataset.rendered = "";
        el.innerHTML = "";
      }
    };
  }, [id]);

  return <div id={id} style={{ marginBottom: 16 }} />;
}

function ini(naam) {
  return (naam || "").trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

// ─── UI HELPERS ───────────────────────────────────────────────────
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
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: 28, maxWidth: 480, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", maxHeight: "90vh", overflowY: "auto" }}>
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

// ─── SUPER CIRKEL KAART (sub-component) ───────────────────────────
function SuperCirkelKaart({ cirkel, onKoppel, onVerwijder, showToast, sb }) {
  const [beheerders, setBeheerders] = useState([]);
  const [alleAcc, setAlleAcc]       = useState([]);
  const [laden, setLaden]           = useState(true);
  const [selectId, setSelectId]     = useState("");

  useEffect(() => {
    async function laad() {
      try {
        const [koppelingen, accounts] = await Promise.all([
          sb(`beheerder_cirkels?select=beheerder_id&cirkel_id=eq.${encodeURIComponent(cirkel.id)}`),
          sb(`accounts?select=id,naam,email,rol&cirkel_id=eq.${encodeURIComponent(cirkel.id)}&rol=eq.beheerder&status=eq.actief`),
        ]);
        const ids = koppelingen.map(k => k.beheerder_id);
        setBeheerders(accounts.filter(a => ids.includes(a.id)));
        setAlleAcc(accounts.filter(a => !ids.includes(a.id)));
      } catch (e) {
        console.error(e);
      } finally {
        setLaden(false);
      }
    }
    laad();
  }, [cirkel.id]);

  async function koppel() {
    if (!selectId) return;
    try {
      await onKoppel(selectId, cirkel.id);
      const acc = alleAcc.find(a => a.id === selectId);
      if (acc) {
        setBeheerders(prev => [...prev, acc]);
        setAlleAcc(prev => prev.filter(a => a.id !== selectId));
      }
      setSelectId("");
    } catch(e) {}
  }

  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", boxShadow: "0 2px 10px rgba(0,0,0,0.07)", borderLeft: "5px solid " + cirkel.kleur }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 17 }}>{cirkel.naam}</div>
          <div style={{ fontSize: 13, color: "#999" }}>{cirkel.stad} · <span style={{ fontFamily: "monospace", background: "#f0f0f0", padding: "1px 6px", borderRadius: 4 }}>{cirkel.id}</span></div>
        </div>
        <button type="button" onClick={() => onVerwijder(cirkel.id)} style={{ background: "#fee", color: "#c0392b", border: "1px solid #fcc", padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Verwijderen
        </button>
      </div>

      {laden ? (
        <div style={{ fontSize: 13, color: "#bbb" }}>Laden...</div>
      ) : (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Beheerder</div>
          {beheerders.length === 0 ? (
            <div style={{ fontSize: 13, color: "#bbb", marginBottom: 10 }}>Nog geen beheerder gekoppeld</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
              {beheerders.map(b => (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                  <span style={{ background: "#6C3FC5", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>beheerder</span>
                  <span style={{ fontWeight: 600 }}>{b.naam}</span>
                  <span style={{ color: "#aaa", fontSize: 12 }}>{b.email}</span>
                </div>
              ))}
            </div>
          )}

          {alleAcc.length > 0 && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select value={selectId} onChange={e => setSelectId(e.target.value)} style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 13, background: "#fafafa", minWidth: 0 }}>
                <option value="">— Kies beheerder —</option>
                {alleAcc.map(a => (
                  <option key={a.id} value={a.id}>{a.naam} ({a.email})</option>
                ))}
              </select>
              <button type="button" onClick={koppel} disabled={!selectId} style={{ background: "#6C3FC5", color: "#fff", border: "none", padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: selectId ? "pointer" : "not-allowed", opacity: selectId ? 1 : 0.5, whiteSpace: "nowrap" }}>
                Koppelen
              </button>
            </div>
          )}
          {alleAcc.length === 0 && beheerders.length > 0 && (
            <div style={{ fontSize: 12, color: "#bbb" }}>Alle beheerders in deze cirkel zijn al gekoppeld</div>
          )}
        </>
      )}
    </div>
  );
}

// ─── HOOFD APP ────────────────────────────────────────────────────
function App() {
  const [gebruiker, setGebruiker]     = useState(null);
  const [scherm, setScherm]           = useState("login");
  const [cirkels, setCirkels]         = useState([]);
  const [cirkelId, setCirkelId]       = useState(null);
  const [mijnCirkels, setMijnCirkels]       = useState([]); // voor beheerder: alle beheerde cirkels
  const [superWachtenden, setSuperWachtenden] = useState([]); // alle wachtende accounts (super beheerder)
  const [leden, setLeden]             = useState([]);
  const [diensten, setDiensten]       = useState([]);
  const [verzoeken, setVerzoeken]     = useState([]); // inkomende verzoeken voor mijn diensten
  const [mijnVerzoeken, setMijnVerzoeken] = useState([]); // verzoeken die ik zelf verstuurd heb
  const [laden, setLaden]             = useState(false);
  const [fout, setFout]               = useState(null);
  const [filter, setFilter]           = useState("Alle");
  const [zoek, setZoek]               = useState("");
  const [toast, setToast]             = useState(null);
  const [verzoekModal, setVerzoekModal] = useState(null); // dienst waarvoor verzoek wordt aangemaakt
  const [verzoekBericht, setVerzoekBericht] = useState("");
  const [bezig, setBezig]             = useState(false);

  // forms
  const [loginForm,   setLoginForm]   = useState({ email: "", wachtwoord: "" });
  const [aanmeldForm, setAanmeldForm] = useState({ naam: "", email: "", wachtwoord: "", herhaal: "", telefoon: "", cirkelId: "" });
  const [dienstForm,  setDienstForm]  = useState({ titel: "", categorie: "Overig", beschrijving: "" });
  const [cirkelForm,  setCirkelForm]  = useState({ naam: "", stad: "", code: "" });
  const [loginFout,   setLoginFout]   = useState("");
  const [aanmeldFout, setAanmeldFout] = useState("");
  const [loginCaptcha,   setLoginCaptcha]   = useState(null);
  const [aanmeldCaptcha, setAanmeldCaptcha] = useState(null);
  const [wijzigForm, setWijzigForm]         = useState({ huidig: "", nieuw: "", herhaal: "" });
  const [wijzigFout, setWijzigFout]         = useState("");
  const [wijzigModal, setWijzigModal]       = useState(false);

  const cirkel           = cirkels.find(c => c.id === cirkelId) || null;
  const isBeheerder      = gebruiker?.rol === "beheerder" || gebruiker?.rol === "super_beheerder";
  const isSuperBeheerder = gebruiker?.rol === "super_beheerder";
  const wachtenden       = leden.filter(l => l.status === "wacht");
  const actieven         = leden.filter(l => l.status === "actief");
  const openVerzoeken    = verzoeken.filter(v => v.status === "wacht");

  function showToast(msg, type = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ── DATA LADEN ──────────────────────────────────────────────────
  useEffect(() => { laadCirkels(); }, []);

  async function laadCirkels() {
    try {
      const data = await api.getCirkels();
      setCirkels(data);
    } catch (e) {
      setFout("Kan geen verbinding maken: " + e.message);
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

  async function laadVerzoeken(gebruikerId) {
    try {
      const [incoming, outgoing] = await Promise.all([
        api.getVerzoeken(gebruikerId),
        api.getMijnVerzoeken(gebruikerId),
      ]);
      setVerzoeken(incoming);
      setMijnVerzoeken(outgoing);
    } catch (e) {
      console.error("Verzoeken laden mislukt:", e.message);
    }
  }

  async function laadMijnCirkels(beheerderId) {
    try {
      const data = await api.getBeheerderCirkels(beheerderId);
      setMijnCirkels(data.map(r => r.cirkel_id));
    } catch (e) {
      console.error("Beheerder cirkels laden mislukt:", e.message);
    }
  }

  async function laadSuperWachtenden() {
    try {
      const data = await api.getAlleWachtenden();
      setSuperWachtenden(data);
    } catch (e) { console.error("Wachtenden laden mislukt:", e.message); }
  }

  // ── AUTH ────────────────────────────────────────────────────────
  async function inloggen() {
    setLoginFout("");
    if (!loginCaptcha) { setLoginFout("Bevestig dat je geen robot bent."); return; }

    const email = loginForm.email.trim().toLowerCase();
    setBezig(true);
    try {
      // ── 1. Blokkering controleren in database ─────────────────
      const pogingData = await api.getLoginPoging(email);
      const poging = pogingData[0] || null;
      if (poging?.geblokkerd_tot && new Date(poging.geblokkerd_tot) > new Date()) {
        const seconden = Math.ceil((new Date(poging.geblokkerd_tot) - Date.now()) / 1000);
        const minuten  = Math.ceil(seconden / 60);
        setLoginFout(`Te veel mislukte pogingen. Probeer het over ${minuten} minuut${minuten !== 1 ? "en" : ""} opnieuw.`);
        return;
      }

      // ── 2. Supabase Auth sign-in → krijg JWT token ────────────
      const authData = await api.signIn(email, loginForm.wachtwoord, loginCaptcha);
      authToken = authData.access_token;

      // Inloggen geslaagd → pogingen resetten
      await api.resetLoginPoging(email);

      // ── 3. Haal profiel op via auth_id ────────────────────────
      const profielen = await api.getProfiel(authData.user.id);
      const acc = profielen[0];
      if (!acc) { setLoginFout("Geen profiel gevonden. Neem contact op met de beheerder."); authToken = null; return; }

      if (acc.status === "wacht")     { setGebruiker(acc); setScherm("wachten"); return; }
      if (acc.status === "afgewezen") { setLoginFout("Je aanmelding is helaas afgewezen."); authToken = null; return; }

      setGebruiker(acc);
      if (acc.rol === "super_beheerder") {
        await Promise.all([laadCirkels(), laadSuperWachtenden()]);
        setScherm("superBeheer");
        showToast("Welkom, " + acc.naam.split(" ")[0] + "!");
        return;
      }
      setCirkelId(acc.cirkel_id);
      await Promise.all([laadCirkelData(acc.cirkel_id), laadVerzoeken(acc.id)]);
      setScherm("cirkel");
      showToast("Welkom terug, " + acc.naam.split(" ")[0] + "!");
    } catch (e) {
      const isVerkeerd = e.message.includes("Invalid login");
      if (isVerkeerd) {
        // ── Mislukte poging opslaan in database ───────────────────
        try {
          const huidigData = await api.getLoginPoging(email);
          const huidig = huidigData[0] || { pogingen: 0 };
          const nieuwePogingen = (huidig.pogingen || 0) + 1;
          const geblokkerdTot  = nieuwePogingen >= 3
            ? new Date(Date.now() + 5 * 60 * 1000).toISOString()
            : null;
          await api.upsertLoginPoging({
            email,
            pogingen: nieuwePogingen,
            geblokkerd_tot: geblokkerdTot,
            laatste_poging: new Date().toISOString(),
          });
          const resterend = 3 - nieuwePogingen;
          if (geblokkerdTot) {
            setLoginFout("Te veel mislukte pogingen. Account is 5 minuten geblokkeerd.");
          } else {
            setLoginFout(`E-mailadres of wachtwoord klopt niet. Nog ${resterend} poging${resterend !== 1 ? "en" : ""} voor blokkering.`);
          }
        } catch (_) {
          setLoginFout("E-mailadres of wachtwoord klopt niet.");
        }
      } else {
        setLoginFout("Fout: " + e.message);
      }
      setLoginCaptcha(null);
      if (window.hcaptcha) window.hcaptcha.reset();
    } finally {
      setBezig(false);
    }
  }

  async function wachtwoordWijzigen() {
    setWijzigFout("");
    const { huidig, nieuw, herhaal } = wijzigForm;
    if (!huidig || !nieuw || !herhaal)           { setWijzigFout("Vul alle velden in."); return; }
    if (nieuw !== herhaal)                        { setWijzigFout("Nieuwe wachtwoorden komen niet overeen."); return; }
    if (nieuw.length < 8)                         { setWijzigFout("Wachtwoord moet minimaal 8 tekens zijn."); return; }
    if (!/[A-Z]/.test(nieuw))                     { setWijzigFout("Wachtwoord moet minimaal 1 hoofdletter bevatten."); return; }
    if (!/[^A-Za-z0-9]/.test(nieuw))             { setWijzigFout("Wachtwoord moet minimaal 1 speciaal teken bevatten."); return; }
    setBezig(true);
    try {
      // Verifieer huidig wachtwoord door opnieuw in te loggen
      await api.signIn(gebruiker.email, huidig);
      // Wachtwoord bijwerken via Supabase Auth
      const result = await api.updatePassword(nieuw);
      if (result.error) throw new Error(result.error.message || result.msg || "Fout bij wijzigen");
      setWijzigModal(false);
      setWijzigForm({ huidig: "", nieuw: "", herhaal: "" });
      showToast("Wachtwoord gewijzigd!");
    } catch (e) {
      setWijzigFout(e.message.includes("Invalid login") ? "Huidig wachtwoord klopt niet." : "Fout: " + e.message);
    } finally {
      setBezig(false);
    }
  }

  async function uitloggen() {
    try { await api.signOut(); } catch (_) {}
    authToken = null;
    setGebruiker(null);
    setCirkelId(null);
    setLaden(false);
    setLeden([]);
    setDiensten([]);
    setVerzoeken([]);
    setMijnVerzoeken([]);
    setMijnCirkels([]);
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
    if (wachtwoord.length < 8)         { setAanmeldFout("Wachtwoord moet minimaal 8 tekens zijn."); return; }
    if (!/[A-Z]/.test(wachtwoord))     { setAanmeldFout("Wachtwoord moet minimaal 1 hoofdletter bevatten."); return; }
    if (!/[^A-Za-z0-9]/.test(wachtwoord)) { setAanmeldFout("Wachtwoord moet minimaal 1 speciaal teken bevatten (bijv. ! @ # $)."); return; }
    if (!/^[0-9\s\+\-]{7,15}$/.test(telefoon.trim())) { setAanmeldFout("Voer een geldig telefoonnummer in."); return; }
    if (!cirkels.find(c => c.id === cId)) { setAanmeldFout("Onbekende buurtcirkelcode."); return; }
    if (!aanmeldCaptcha) { setAanmeldFout("Bevestig dat je geen robot bent."); return; }
    setBezig(true);
    try {
      // 1. Maak Auth account aan bij Supabase
      const authData = await api.signUp(email.trim(), wachtwoord, aanmeldCaptcha);
      const authId = authData.user?.id;
      if (!authId) throw new Error("Aanmaken Auth account mislukt.");

      // 2. Direct inloggen om een JWT token te krijgen (nodig voor RLS INSERT)
      const sessie = await api.signIn(email.trim(), wachtwoord);
      authToken = sessie.access_token;

      // 3. Sla profiel op in accounts tabel (zonder wachtwoord)
      const nieuw = await api.insertAccount({
        auth_id: authId,
        naam: naam.trim(), email: email.trim(),
        telefoon: telefoon.trim(), rol: "lid", status: "wacht", cirkel_id: cId,
      });

      // 4. Uitloggen — account moet eerst goedgekeurd worden
      try { await api.signOut(); } catch (_) {}
      authToken = null;

      setGebruiker(nieuw[0]);
      setScherm("wachten");
      showToast("Aanmelding verstuurd!");
    } catch (e) {
      setAanmeldFout(e.message.includes("already registered") ? "Dit e-mailadres is al in gebruik." : "Fout: " + e.message);
      setAanmeldCaptcha(null);
      if (window.hcaptcha) window.hcaptcha.reset("aanmeld-captcha");
    } finally {
      setBezig(false);
    }
  }

  // ── BEHEER ──────────────────────────────────────────────────────
  async function lidGoedkeuren(id) {
    try {
      await api.updateAccount(id, { status: "actief" });
      setLeden(prev => prev.map(l => l.id === id ? { ...l, status: "actief" } : l));
      setSuperWachtenden(prev => prev.filter(l => l.id !== id));
      showToast("Lid goedgekeurd!");
    } catch (e) { showToast("Fout: " + e.message, "fout"); }
  }

  async function lidAfwijzen(id) {
    try {
      await api.updateAccount(id, { status: "afgewezen" });
      setLeden(prev => prev.map(l => l.id === id ? { ...l, status: "afgewezen" } : l));
      setSuperWachtenden(prev => prev.filter(l => l.id !== id));
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

  // Super beheerder: cirkel koppelen aan een beheerder
  async function cirkelKoppelenAanBeheerder(beheerderId, cId) {
    try {
      await api.insertBeheerderCirkel({ beheerder_id: beheerderId, cirkel_id: cId });
      showToast("Cirkel gekoppeld aan beheerder!");
    } catch (e) { showToast("Fout: " + e.message, "fout"); }
  }

  // Super beheerder: cirkel verwijderen (incl. alle gekoppelde data)
  async function cirkelVerwijderen(cId) {
    if (!window.confirm(`Weet je zeker dat je buurtcirkel ${cId} wilt verwijderen? Alle leden, diensten en verzoeken worden ook verwijderd.`)) return;
    try {
      // Verwijder in volgorde: verzoeken → diensten → beheerder_cirkels → accounts → cirkel
      await sb(`verzoeken?cirkel_id=eq.${encodeURIComponent(cId)}`, { method: "DELETE", prefer: "return=minimal" });
      await sb(`diensten?cirkel_id=eq.${encodeURIComponent(cId)}`, { method: "DELETE", prefer: "return=minimal" });
      await sb(`beheerder_cirkels?cirkel_id=eq.${encodeURIComponent(cId)}`, { method: "DELETE", prefer: "return=minimal" });
      await sb(`accounts?cirkel_id=eq.${encodeURIComponent(cId)}`, { method: "DELETE", prefer: "return=minimal" });
      await api.deleteCirkel(cId);
      setCirkels(prev => prev.filter(c => c.id !== cId));
      showToast("Buurtcirkel verwijderd.");
    } catch (e) { showToast("Fout bij verwijderen: " + e.message, "fout"); }
  }

  async function schakelCirkel(cId) {
    setCirkelId(cId);
    await laadCirkelData(cId);
    setScherm("cirkel");
    setFilter("Alle");
    setZoek("");
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
        status: "wacht",
      });
      setDiensten(prev => [nieuw[0], ...prev]);
      setDienstForm({ titel: "", categorie: "Overig", beschrijving: "" });
      setScherm("cirkel");
      showToast("Dienst ingediend! De beheerder moet deze nog goedkeuren.");
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

  async function dienstGoedkeuren(id) {
    try {
      await api.updateDienst(id, { status: "actief" });
      setDiensten(prev => prev.map(d => d.id === id ? { ...d, status: "actief" } : d));
      showToast("Dienst goedgekeurd!");
    } catch (e) { showToast("Fout: " + e.message, "fout"); }
  }

  async function dienstAfwijzen(id) {
    try {
      await api.deleteDienst(id);
      setDiensten(prev => prev.filter(d => d.id !== id));
      showToast("Dienst afgewezen en verwijderd.");
    } catch (e) { showToast("Fout: " + e.message, "fout"); }
  }

  // ── VERZOEKEN ───────────────────────────────────────────────────
  async function verzoekVersturen() {
    if (!verzoekModal) return;
    setBezig(true);
    try {
      const nieuw = await api.insertVerzoek({
        dienst_id: verzoekModal.id,
        dienst_titel: verzoekModal.titel,
        aanvrager_id: gebruiker.id,
        aanvrager_naam: gebruiker.naam,
        aanbieder_id: verzoekModal.lid_id,
        cirkel_id: cirkelId,
        bericht: verzoekBericht.trim(),
        status: "wacht",
        datum: new Date().toISOString().slice(0, 10),
      });
      setMijnVerzoeken(prev => [nieuw[0], ...prev]);
      setVerzoekModal(null);
      setVerzoekBericht("");
      showToast("Verzoek verstuurd!");
    } catch (e) { showToast("Fout: " + e.message, "fout"); }
    finally { setBezig(false); }
  }

  async function verzoekBeantwoorden(id, status) {
    try {
      await api.updateVerzoek(id, { status });
      setVerzoeken(prev => prev.map(v => v.id === id ? { ...v, status } : v));
      showToast(status === "geaccepteerd" ? "Verzoek geaccepteerd!" : "Verzoek afgewezen.");
    } catch (e) { showToast("Fout: " + e.message, "fout"); }
  }

  // ── NIEUWE CIRKEL ───────────────────────────────────────────────
  async function nieuweCirkelAanmaken() {
    if (!isSuperBeheerder) return;
    const code = cirkelForm.code.trim().toUpperCase();
    if (!cirkelForm.naam.trim() || !cirkelForm.stad.trim() || !code) {
      showToast("Vul alle velden in.", "fout"); return;
    }
    if (!/^BC-[A-Z0-9]{2,10}$/.test(code)) {
      showToast("Code moet beginnen met BC- gevolgd door letters/cijfers (bijv. BC-PIJP of BC-1042).", "fout"); return;
    }
    if (cirkels.find(c => c.id === code)) {
      showToast("Deze code is al in gebruik.", "fout"); return;
    }
    setBezig(true);
    try {
      const kleuren = ["#E8503A", "#4A6FD9", "#6BBF4A", "#C0567B", "#F5A623", "#17A2B8"];
      const kleur = kleuren[Math.floor(Math.random() * kleuren.length)];
      await api.insertCirkel({ id: code, naam: cirkelForm.naam.trim(), stad: cirkelForm.stad.trim(), kleur });
      const nieuweCirkels = await api.getCirkels();
      setCirkels(nieuweCirkels);
      setCirkelForm({ naam: "", stad: "", code: "" });
      setScherm("superBeheer");
      showToast("Buurtcirkel " + code + " aangemaakt!");
    } catch (e) { showToast("Fout: " + e.message, "fout"); }
    finally { setBezig(false); }
  }

  // ── GEFILTERDE DIENSTEN ─────────────────────────────────────────
  const gefilterд = diensten.filter(d => {
    // Actieve diensten zijn voor iedereen zichtbaar
    // Wachtende diensten: alleen voor de aanbieder zelf en de beheerder
    if (d.status !== "actief" && !isBeheerder && d.lid_id !== gebruiker?.id) return false;
    return (filter === "Alle" || d.categorie === filter) &&
      (zoek === "" || d.titel.toLowerCase().includes(zoek.toLowerCase()) || d.beschrijving.toLowerCase().includes(zoek.toLowerCase()));
  });

  const totaalOpenVerzoeken = openVerzoeken.length;
  const totaalWachtenden = wachtenden.length;
  const wachtendeDiensten = diensten.filter(d => d.status === "wacht");
  const badgeCount = totaalOpenVerzoeken + totaalWachtenden + wachtendeDiensten.length;

  // ═══════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", background: "#F5F2EE", fontFamily: "Georgia, serif", color: "#1a1a2e" }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* ── HEADER ── */}
      <div style={{ background: "#1a1a2e", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", position: "sticky", top: 0, zIndex: 100 }}>
        <button type="button" onClick={() => gebruiker && scherm !== "wachten" && setScherm(isSuperBeheerder ? "superBeheer" : "cirkel")} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: 20, fontWeight: 900 }}>
          Buurt<span style={{ color: "#E8503A" }}>Cirkel</span>
          <span style={{ fontSize: 10, fontWeight: 400, color: "rgba(255,255,255,0.4)", marginLeft: 6, letterSpacing: 0.5 }}>v{APP_VERSIE}</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {gebruiker && scherm !== "wachten" && (
            <>
              {/* Super beheerder navigatie */}
              {isSuperBeheerder ? (
                <>
                  <button type="button" onClick={() => setScherm("superBeheer")} style={{ background: scherm === "superBeheer" || scherm === "superGoedkeuren" ? "#E8503A" : "rgba(255,255,255,0.12)", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", position: "relative" }}>
                    Super beheer
                    {superWachtenden.length > 0 && <span style={{ position: "absolute", top: -6, right: -6, background: "#F5A623", color: "#fff", fontSize: 10, fontWeight: 700, width: 17, height: 17, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #1a1a2e" }}>{superWachtenden.length}</span>}
                  </button>
                  <button type="button" onClick={() => setScherm("nieuweCirkel")} style={{ background: scherm === "nieuweCirkel" ? "#E8503A" : "rgba(255,255,255,0.12)", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    + Cirkel
                  </button>
                </>
              ) : (
                <>
                  {/* Mijn verzoeken */}
                  <button type="button" onClick={() => setScherm("mijnVerzoeken")} style={{ background: scherm === "mijnVerzoeken" ? "#E8503A" : "rgba(255,255,255,0.12)", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Mijn verzoeken
                  </button>

                  {/* Beheer (alleen reguliere beheerder) */}
                  {isBeheerder && (
                    <button type="button" onClick={() => setScherm(scherm === "beheer" ? "cirkel" : "beheer")} style={{ background: scherm === "beheer" ? "#E8503A" : "rgba(255,255,255,0.12)", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", position: "relative" }}>
                      Beheer
                      {badgeCount > 0 && <span style={{ position: "absolute", top: -6, right: -6, background: "#E8503A", color: "#fff", fontSize: 10, fontWeight: 700, width: 17, height: 17, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #1a1a2e" }}>{badgeCount}</span>}
                    </button>
                  )}
                </>
              )}

              <span style={{ color: "#fff", fontSize: 13, fontWeight: 600, opacity: 0.85, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {gebruiker.naam.split(" ")[0]}
              </span>
              <button type="button" onClick={() => { setWijzigModal(true); setWijzigFout(""); }} style={{ background: "none", color: "#aaa", border: "1px solid #444", padding: "5px 10px", borderRadius: 20, fontSize: 11, cursor: "pointer" }}>🔑</button>
              <button type="button" onClick={uitloggen} style={{ background: "none", color: "#aaa", border: "1px solid #444", padding: "5px 10px", borderRadius: 20, fontSize: 11, cursor: "pointer" }}>Uit</button>
              <Avatar tekst={ini(gebruiker.naam)} size={30} kleur={isSuperBeheerder ? "#6C3FC5" : (cirkel?.kleur || "#E8503A")} />
            </>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px" }}>

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
              <input type="password" value={loginForm.wachtwoord} onChange={e => setLoginForm(p => ({ ...p, wachtwoord: e.target.value }))} onKeyDown={e => e.key === "Enter" && inloggen()} placeholder="••••••••" style={{ ...inp, marginBottom: 16 }} />
              <HCaptcha
                id="login-captcha"
                onVerify={token => setLoginCaptcha(token)}
                onExpire={() => setLoginCaptcha(null)}
              />
              <button type="button" onClick={inloggen} disabled={bezig} style={{ background: "#E8503A", color: "#fff", border: "none", padding: "12px", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: bezig ? "not-allowed" : "pointer", width: "100%", marginBottom: 12, opacity: bezig ? 0.7 : 1 }}>
                {bezig ? "Bezig..." : "Inloggen"}
              </button>
              <button type="button" onClick={() => { setScherm("aanmelden"); setAanmeldFout(""); }} style={{ background: "#f5f5f5", color: "#444", border: "none", padding: "12px", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%" }}>
                Nog geen account? Aanmelden
              </button>
              <div style={{ marginTop: 16, padding: "12px 14px", background: "#f9f9f9", borderRadius: 10, fontSize: 12, color: "#999", lineHeight: 1.7 }}>
                <strong>Let op:</strong> gebruik je geregistreerde e-mail en wachtwoord.<br />
                Accounts worden aangemaakt via het aanmeldformulier.
              </div>
            </div>
          </div>
        )}

        {/* ══ AANMELDEN ══ */}
        {scherm === "aanmelden" && (
          <div>
            <button type="button" onClick={() => setScherm("login")} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 14, marginBottom: 18 }}>&#8592; Terug</button>
            <div style={card}>
              <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Aanmelden</h2>
              <p style={{ color: "#999", fontSize: 13, marginBottom: 20 }}>Na aanmelding beoordeelt de beheerder je verzoek.</p>
              {aanmeldFout && <div style={{ background: "#fff0f0", color: "#c0392b", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 14, border: "1px solid #fcc" }}>{aanmeldFout}</div>}
              {[
                { label: "Volledige naam", key: "naam", ph: "Voor- en achternaam", type: "text" },
                { label: "E-mailadres", key: "email", ph: "jouw@email.nl", type: "text" },
                { label: "Mobiel telefoonnummer", key: "telefoon", ph: "bijv. 06 12345678", type: "text" },
                { label: "Wachtwoord", key: "wachtwoord", ph: "Min. 8 tekens, 1 hoofdletter, 1 speciaal teken", type: "password" },
                { label: "Herhaal wachtwoord", key: "herhaal", ph: "Nogmaals je wachtwoord", type: "password" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 5 }}>{f.label}</label>
                  <input type={f.type} value={aanmeldForm[f.key]} onChange={e => setAanmeldForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.ph} style={{ ...inp, marginBottom: 12 }} />
                </div>
              ))}
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 5 }}>Buurtcirkel code</label>
              <input value={aanmeldForm.cirkelId} onChange={e => setAanmeldForm(p => ({ ...p, cirkelId: e.target.value.toUpperCase() }))} placeholder="bijv. BC-1042" style={{ ...inp, marginBottom: 6 }} />
              <div style={{ fontSize: 12, color: "#aaa", marginBottom: 20 }}>
                Je ontvangt deze code van de beheerder van je buurtcirkel.
              </div>
              <HCaptcha
                id="aanmeld-captcha"
                onVerify={token => setAanmeldCaptcha(token)}
                onExpire={() => setAanmeldCaptcha(null)}
              />
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
            <p style={{ color: "#888", fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>
              De beheerder van <strong>{cirkels.find(c => c.id === gebruiker?.cirkel_id)?.naam || "je buurtcirkel"}</strong> beoordeelt je verzoek.
            </p>
            <button type="button" onClick={uitloggen} style={{ background: "#eee", color: "#555", border: "none", padding: "11px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Uitloggen</button>
          </div>
        )}

        {/* ══ CIRKEL ══ */}
        {scherm === "cirkel" && cirkel && (
          <div>
            {/* Cirkel header met schakelaar voor beheerder */}
            <div style={{ background: cirkel.kleur, borderRadius: 18, padding: "20px 22px 18px", marginBottom: 18, color: "#fff" }}>
              <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8, marginBottom: 3, letterSpacing: 1 }}>{cirkelId}</div>
              <div style={{ fontWeight: 900, fontSize: 26, marginBottom: 4 }}>{cirkel.naam}</div>
              <div style={{ opacity: 0.85, fontSize: 13, marginBottom: 14 }}>{cirkel.stad} · {diensten.length} diensten · {actieven.length} leden</div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => setScherm("nieuweDienst")} style={{ background: "rgba(255,255,255,0.25)", color: "#fff", border: "2px solid rgba(255,255,255,0.5)", padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  + Dienst aanbieden
                </button>
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
                  const alVerzocht = mijnVerzoeken.some(v => v.dienst_id === d.id);
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
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          {d.status === "wacht" && (
                            <span style={{ background: "#FFF3CD", color: "#856404", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>Wacht op goedkeuring</span>
                          )}
                          {(isEigen || isBeheerder) && (
                            <button type="button" onClick={() => dienstVerwijderen(d.id)} style={{ background: "#fee", color: "#c0392b", border: "1px solid #fcc", padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                              Verwijder
                            </button>
                          )}
                          {!isEigen && d.status === "actief" && (
                            alVerzocht ? (
                              <span style={{ background: "#f0f0f0", color: "#aaa", padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Verzocht ✓</span>
                            ) : (
                              <button type="button" onClick={() => { setVerzoekModal(d); setVerzoekBericht(""); }} style={{ background: cirkel.kleur, color: "#fff", border: "none", padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                                Aanvragen
                              </button>
                            )
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

        {/* ══ MIJN VERZOEKEN ══ */}
        {scherm === "mijnVerzoeken" && (
          <div>
            <button type="button" onClick={() => setScherm("cirkel")} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 14, marginBottom: 18 }}>&#8592; Terug</button>
            <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 6 }}>Mijn verzoeken</h2>

            {/* Inkomende verzoeken (voor mijn diensten) */}
            {verzoeken.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  Inkomend — voor mijn diensten
                  {openVerzoeken.length > 0 && <span style={{ background: "#E8503A", color: "#fff", fontSize: 12, padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>{openVerzoeken.length}</span>}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {verzoeken.map(v => {
                    const stijl = VERZOEK_STIJL[v.status] || VERZOEK_STIJL.wacht;
                    return (
                      <div key={v.id} style={{ ...card, borderLeft: "4px solid " + (v.status === "wacht" ? "#F5A623" : v.status === "geaccepteerd" ? "#27ae60" : "#e74c3c") }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{v.aanvrager_naam}</div>
                            <div style={{ fontSize: 13, color: "#999" }}>vraagt om: <em>{v.dienst_titel}</em></div>
                          </div>
                          <span style={{ background: stijl.bg, color: stijl.text, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>{stijl.label}</span>
                        </div>
                        {v.bericht && <p style={{ fontSize: 14, color: "#555", margin: "0 0 10px", lineHeight: 1.5 }}>"{v.bericht}"</p>}
                        {v.status === "wacht" && (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button type="button" onClick={() => verzoekBeantwoorden(v.id, "geaccepteerd")} style={{ background: "#27ae60", color: "#fff", border: "none", padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Accepteren</button>
                            <button type="button" onClick={() => verzoekBeantwoorden(v.id, "afgewezen")} style={{ background: "#e74c3c", color: "#fff", border: "none", padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Afwijzen</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Verstuurde verzoeken */}
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Verstuurd — mijn aanvragen</h3>
              {mijnVerzoeken.length === 0 ? (
                <div style={{ ...card, color: "#bbb", textAlign: "center", padding: 24 }}>Je hebt nog geen diensten aangevraagd</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {mijnVerzoeken.map(v => {
                    const stijl = VERZOEK_STIJL[v.status] || VERZOEK_STIJL.wacht;
                    return (
                      <div key={v.id} style={{ ...card }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{v.dienst_titel}</div>
                            <div style={{ fontSize: 12, color: "#bbb" }}>{new Date(v.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}</div>
                          </div>
                          <span style={{ background: stijl.bg, color: stijl.text, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>{stijl.label}</span>
                        </div>
                        {v.bericht && <p style={{ fontSize: 13, color: "#888", margin: "8px 0 0", lineHeight: 1.5 }}>"{v.bericht}"</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ BEHEER ══ */}
        {scherm === "beheer" && isBeheerder && (
          <div>
            <button type="button" onClick={() => setScherm("cirkel")} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 14, marginBottom: 18 }}>&#8592; Terug</button>
            <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 20 }}>Beheer — {cirkel?.naam}</h2>

            {wachtenden.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  Wachten op goedkeuring
                  <span style={{ background: "#E8503A", color: "#fff", fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{wachtenden.length}</span>
                </h3>
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
              </div>
            )}

            {wachtendeDiensten.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  Diensten — wachten op goedkeuring
                  <span style={{ background: "#F5A623", color: "#fff", fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{wachtendeDiensten.length}</span>
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {wachtendeDiensten.map(d => {
                    const cat = CAT_STIJL[d.categorie] || CAT_STIJL.Overig;
                    return (
                      <div key={d.id} style={{ ...card, borderLeft: "4px solid #F5A623" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                          <Avatar tekst={d.avatar} size={38} kleur={cirkel?.kleur || "#888"} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{d.titel}</div>
                            <div style={{ fontSize: 13, color: "#999" }}>{d.lid_naam}</div>
                            <span style={{ background: cat.bg, color: cat.text, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, display: "inline-block", marginTop: 4 }}>{d.categorie}</span>
                          </div>
                        </div>
                        <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6, margin: "0 0 12px" }}>{d.beschrijving}</p>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="button" onClick={() => dienstGoedkeuren(d.id)} style={{ background: "#27ae60", color: "#fff", border: "none", padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Goedkeuren</button>
                          <button type="button" onClick={() => dienstAfwijzen(d.id)} style={{ background: "#e74c3c", color: "#fff", border: "none", padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Afwijzen</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Actieve leden ({actieven.length})</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {actieven.map(lid => (
                  <div key={lid.id} style={{ ...card, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <Avatar tekst={ini(lid.naam)} size={40} kleur={cirkel?.kleur || "#888"} />
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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

        {/* ══ SUPER BEHEER ══ */}
        {scherm === "superBeheer" && isSuperBeheerder && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 10 }}>
              <h2 style={{ fontWeight: 900, fontSize: 22 }}>Super beheer</h2>
              {superWachtenden.length > 0 && (
                <button type="button" onClick={() => setScherm("superGoedkeuren")} style={{ background: "#FFF3CD", color: "#856404", border: "1px solid #F5A623", padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  ⏳ Aanmeldingen goedkeuren
                  <span style={{ background: "#E8503A", color: "#fff", fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 20 }}>{superWachtenden.length}</span>
                </button>
              )}
            </div>
            <p style={{ color: "#999", fontSize: 13, marginBottom: 20 }}>Overzicht van alle buurtcirkels en beheerders. Koppel cirkels aan beheerders.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {cirkels.map(c => (
                <SuperCirkelKaart
                  key={c.id}
                  cirkel={c}
                  onKoppel={cirkelKoppelenAanBeheerder}
                  onVerwijder={cirkelVerwijderen}
                  showToast={showToast}
                  sb={sb}
                />
              ))}
              {cirkels.length === 0 && (
                <div style={{ ...card, color: "#bbb", textAlign: "center", padding: 24 }}>Nog geen buurtcirkels aangemaakt</div>
              )}
            </div>
          </div>
        )}

        {/* ══ SUPER GOEDKEUREN ══ */}
        {scherm === "superGoedkeuren" && isSuperBeheerder && (
          <div>
            <button type="button" onClick={() => setScherm("superBeheer")} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 14, marginBottom: 18 }}>&#8592; Terug</button>
            <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 6 }}>Aanmeldingen goedkeuren</h2>
            <p style={{ color: "#999", fontSize: 13, marginBottom: 20 }}>Alle wachtende aanmeldingen over alle buurtcirkels.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {superWachtenden.length === 0 ? (
                <div style={{ ...card, color: "#bbb", textAlign: "center", padding: 24 }}>Geen wachtende aanmeldingen</div>
              ) : superWachtenden.map(lid => {
                const cirkelNaam = cirkels.find(c => c.id === lid.cirkel_id);
                return (
                  <div key={lid.id} style={{ ...card, borderLeft: "4px solid #F5A623" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <Avatar tekst={ini(lid.naam)} size={40} kleur="#F5A623" />
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{lid.naam}</div>
                        <div style={{ fontSize: 13, color: "#999" }}>{lid.email}</div>
                        {lid.telefoon && <div style={{ fontSize: 13, color: "#999" }}>📱 {lid.telefoon}</div>}
                        <div style={{ fontSize: 12, marginTop: 3 }}>
                          <span style={{ background: "#f0f0f0", color: "#555", padding: "2px 8px", borderRadius: 20, fontFamily: "monospace" }}>{lid.cirkel_id}</span>
                          {cirkelNaam && <span style={{ color: "#aaa", fontSize: 12, marginLeft: 6 }}>{cirkelNaam.naam}</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button type="button" onClick={() => lidGoedkeuren(lid.id)} style={{ background: "#27ae60", color: "#fff", border: "none", padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Goedkeuren</button>
                        <button type="button" onClick={() => lidAfwijzen(lid.id)} style={{ background: "#e74c3c", color: "#fff", border: "none", padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Afwijzen</button>
                      </div>
                    </div>
                  </div>
                );
              })}
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

        {/* ══ NIEUWE CIRKEL (alleen super beheerder) ══ */}
        {scherm === "nieuweCirkel" && isSuperBeheerder && (
          <div>
            <button type="button" onClick={() => setScherm("superBeheer")} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 14, marginBottom: 18 }}>&#8592; Terug</button>
            <div style={card}>
              <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 6 }}>Nieuwe buurtcirkel</h2>
              <p style={{ color: "#999", fontSize: 13, marginBottom: 20 }}>Kies een unieke BC-code voor deze cirkel. Leden gebruiken deze code bij aanmelding.</p>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 5 }}>BC-code</label>
              <input value={cirkelForm.code} onChange={e => setCirkelForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="bijv. BC-PIJP of BC-1042" style={{ ...inp, marginBottom: 6, fontFamily: "monospace" }} />
              <div style={{ fontSize: 12, color: "#aaa", marginBottom: 14 }}>Begint altijd met BC- gevolgd door letters of cijfers</div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 5 }}>Naam van de wijk</label>
              <input value={cirkelForm.naam} onChange={e => setCirkelForm(p => ({ ...p, naam: e.target.value }))} placeholder="bijv. De Pijp" style={{ ...inp, marginBottom: 14 }} />
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 5 }}>Stad</label>
              <input value={cirkelForm.stad} onChange={e => setCirkelForm(p => ({ ...p, stad: e.target.value }))} placeholder="bijv. Amsterdam" style={{ ...inp, marginBottom: 20 }} />
              <button type="button" onClick={nieuweCirkelAanmaken} disabled={bezig} style={{ background: "#6C3FC5", color: "#fff", border: "none", padding: "12px", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: bezig ? "not-allowed" : "pointer", width: "100%", opacity: bezig ? 0.7 : 1 }}>
                {bezig ? "Bezig..." : "Buurtcirkel aanmaken"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── WACHTWOORD WIJZIGEN MODAL ── */}
      <Modal open={wijzigModal} onClose={() => { setWijzigModal(false); setWijzigForm({ huidig: "", nieuw: "", herhaal: "" }); setWijzigFout(""); }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 6 }}>Wachtwoord wijzigen</div>
          <p style={{ color: "#666", fontSize: 14, marginBottom: 20 }}>Voer je huidige wachtwoord in en kies een nieuw wachtwoord.</p>
          {wijzigFout && <div style={{ background: "#fff0f0", color: "#c0392b", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 14, border: "1px solid #fcc" }}>{wijzigFout}</div>}
          {[
            { label: "Huidig wachtwoord", key: "huidig" },
            { label: "Nieuw wachtwoord", key: "nieuw" },
            { label: "Herhaal nieuw wachtwoord", key: "herhaal" },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 5 }}>{f.label}</label>
              <input
                type="password"
                value={wijzigForm[f.key]}
                onChange={e => setWijzigForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder="••••••••"
                style={{ ...inp, marginBottom: 12 }}
              />
            </div>
          ))}
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 18 }}>Min. 8 tekens, 1 hoofdletter, 1 speciaal teken</div>
          <button type="button" onClick={wachtwoordWijzigen} disabled={bezig} style={{ background: "#E8503A", color: "#fff", border: "none", padding: "11px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: bezig ? "not-allowed" : "pointer", width: "100%", marginBottom: 8, opacity: bezig ? 0.7 : 1 }}>
            {bezig ? "Bezig..." : "Wachtwoord wijzigen"}
          </button>
          <button type="button" onClick={() => { setWijzigModal(false); setWijzigForm({ huidig: "", nieuw: "", herhaal: "" }); setWijzigFout(""); }} style={{ background: "#eee", color: "#555", border: "none", padding: "11px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%" }}>
            Annuleren
          </button>
        </div>
      </Modal>

      {/* ── VERZOEK MODAL ── */}
      <Modal open={!!verzoekModal} onClose={() => setVerzoekModal(null)}>
        {verzoekModal && (
          <div>
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 6 }}>Dienst aanvragen</div>
            <p style={{ color: "#666", fontSize: 14, marginBottom: 16 }}>
              Je vraagt <strong>{verzoekModal.lid_naam}</strong> om: <em>{verzoekModal.titel}</em>
            </p>
            <div style={{ background: "#f9f9f9", borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 14, color: "#444", lineHeight: 1.6 }}>
              {verzoekModal.beschrijving}
            </div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 5 }}>Optioneel bericht</label>
            <textarea value={verzoekBericht} onChange={e => setVerzoekBericht(e.target.value)} placeholder="Vertel iets over je situatie of vraag..." rows={3} style={{ ...inp, resize: "vertical", marginBottom: 18 }} />
            <button type="button" onClick={verzoekVersturen} disabled={bezig} style={{ background: cirkel?.kleur || "#E8503A", color: "#fff", border: "none", padding: "11px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: bezig ? "not-allowed" : "pointer", width: "100%", marginBottom: 8, opacity: bezig ? 0.7 : 1 }}>
              {bezig ? "Bezig..." : "Verzoek versturen"}
            </button>
            <button type="button" onClick={() => setVerzoekModal(null)} style={{ background: "#eee", color: "#555", border: "none", padding: "11px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%" }}>
              Annuleren
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}


// ── PWA: mount React app ──────────────────────────────────────────
const { useState, useEffect } = React;
const rootEl = document.getElementById("root");
ReactDOM.createRoot(rootEl).render(React.createElement(App));
