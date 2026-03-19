const APP_VERSIE = "2.8.4";

// ─── SUPABASE CONFIG ───────────────────────────────────────────────
const SUPABASE_URL = "https://uztplrszzpwywhvsmoqz.supabase.co";
const SUPABASE_KEY = "sb_publishable_Lxs6J-YBpbBl0sQ6XBZjMA_R0_P9i_n";

// ─── HCAPTCHA ─────────────────────────────────────────────────────
const HCAPTCHA_SITE_KEY = "ef56a732-ebfc-459e-9b72-ffbc5e0e8a0e";

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

  // Profielen (accounts tabel)
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

  // Alle accounts (voor super beheerder)
  getAlleAccounts: () => sb("accounts?select=*&order=cirkel_id,naam"),

  // Login pogingen
  getLoginPoging:    (email) => sb(`login_pogingen?select=*&email=eq.${encodeURIComponent(email)}`),
  upsertLoginPoging: (row)   => sb("login_pogingen", { method: "POST", body: JSON.stringify(row), prefer: "resolution=merge-duplicates,return=representation" }),
  resetLoginPoging:  (email) => sb(`login_pogingen?email=eq.${encodeURIComponent(email)}`, { method: "PATCH", body: JSON.stringify({ pogingen: 0, geblokkerd_tot: null }) }),

  // Beheerder-cirkels
  getBeheerderCirkels:  (beheerderId) => sb(`beheerder_cirkels?select=cirkel_id&beheerder_id=eq.${beheerderId}`),
  insertBeheerderCirkel:(row)         => sb("beheerder_cirkels", { method: "POST", body: JSON.stringify(row) }),

  // Wachtwoord reset e-mail
  resetWachtwoord: (email, captchaToken) => fetch(`${SUPABASE_URL}/auth/v1/recover`, {
    method: "POST",
    headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, gotrue_meta_security: { captcha_token: captchaToken } }),
  }).then(r => r.json()),
};

// ─── DESIGN SYSTEEM ───────────────────────────────────────────────
const T = {
  bg:       "#F7F8FA",
  surface:  "#FFFFFF",
  border:   "#EAECF0",
  accent:   "#E8503A",
  accentDk: "#C93E2A",
  dark:     "#0F1117",
  muted:    "#6B7280",
  mutedLt:  "#9CA3AF",
  success:  "#059669",
  warning:  "#D97706",
  danger:   "#DC2626",
  fontDisplay: "'DM Sans', -apple-system, sans-serif",
  r:   "10px",
  rLg: "16px",
  rXl: "20px",
};

if (!document.getElementById("bc-global-style")) {
  const s = document.createElement("style");
  s.id = "bc-global-style";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', -apple-system, sans-serif; background: ${T.bg}; color: ${T.dark}; -webkit-font-smoothing: antialiased; }
    input, select, textarea, button { font-family: inherit; }
    input:focus, select:focus, textarea:focus { outline: 2px solid ${T.accent}; outline-offset: 1px; border-color: ${T.accent} !important; }
    button { transition: opacity 0.15s, transform 0.1s; }
    button:active { transform: scale(0.97); }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .bc-fade { animation: fadeIn 0.2s ease; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
  `;
  document.head.appendChild(s);
}

const CAT_STIJL = {
  Educatie:  { bg: "#FEF9C3", text: "#854D0E" },
  Technisch: { bg: "#DBEAFE", text: "#1E40AF" },
  Koken:     { bg: "#FCE7F3", text: "#9D174D" },
  Tuin:      { bg: "#DCFCE7", text: "#166534" },
  Zorg:      { bg: "#EDE9FE", text: "#5B21B6" },
  Overig:    { bg: "#F3F4F6", text: "#374151" },
};
const VERZOEK_STIJL = {
  wacht:        { bg: "#FEF9C3", text: "#854D0E",  label: "Wacht" },
  geaccepteerd: { bg: "#DCFCE7", text: "#166534",  label: "Geaccepteerd" },
  afgewezen:    { bg: "#FEE2E2", text: "#991B1B",  label: "Afgewezen" },
};
const CATS = ["Educatie", "Technisch", "Koken", "Tuin", "Zorg", "Overig"];

const inp = {
  width: "100%", padding: "11px 14px", borderRadius: T.r,
  border: `1.5px solid ${T.border}`, fontSize: 14, outline: "none",
  background: T.surface, boxSizing: "border-box", color: T.dark,
  transition: "border-color 0.15s",
};
const card = {
  background: T.surface, borderRadius: T.rLg, padding: "20px",
  border: `1px solid ${T.border}`,
  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
};
const btnPrimary = {
  background: T.accent, color: "#fff", border: "none",
  padding: "12px 20px", borderRadius: T.r, fontSize: 15,
  fontWeight: 700, cursor: "pointer", width: "100%",
};
const btnSecondary = {
  background: T.bg, color: T.dark, border: `1.5px solid ${T.border}`,
  padding: "11px 20px", borderRadius: T.r, fontSize: 14,
  fontWeight: 600, cursor: "pointer", width: "100%",
};
const badge = (bg, text) => ({
  background: bg, color: text, fontSize: 11, fontWeight: 700,
  padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap",
  letterSpacing: "0.02em",
});
const foutBox = {
  background: "#FEF2F2", color: T.danger, padding: "11px 14px",
  borderRadius: T.r, fontSize: 13, marginBottom: 14,
  border: `1px solid #FECACA`,
};
const label = {
  display: "block", fontSize: 12, fontWeight: 700,
  color: T.muted, marginBottom: 6, textTransform: "uppercase",
  letterSpacing: "0.05em",
};

// ─── HCAPTCHA WIDGET ──────────────────────────────────────────────
function HCaptcha({ id = "hcaptcha-widget", onVerify, onExpire }) {
  useEffect(() => {
    if (!document.getElementById("hcaptcha-script")) {
      const script = document.createElement("script");
      script.id = "hcaptcha-script";
      script.src = "https://js.hcaptcha.com/1/api.js";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

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
    <div style={{ width: size, height: size, borderRadius: "50%", background: kleur, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: size * 0.33, flexShrink: 0, letterSpacing: "-0.5px" }}>
      {tekst}
    </div>
  );
}

function Toast({ msg, type = "ok" }) {
  return (
    <div style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", background: type === "fout" ? T.danger : T.dark, color: "#fff", padding: "11px 24px", borderRadius: 30, fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", whiteSpace: "nowrap", animation: "fadeIn 0.2s ease" }}>
      {type === "fout" ? "✕ " : "✓ "}{msg}
    </div>
  );
}

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.surface, borderRadius: T.rXl, padding: "28px 24px", maxWidth: 480, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.18)", maxHeight: "90vh", overflowY: "auto", animation: "fadeIn 0.2s ease" }}>
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "56px 0" }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${T.border}`, borderTop: `3px solid ${T.accent}`, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    </div>
  );
}

function Foutmelding({ tekst, onHerlaad }) {
  return (
    <div style={{ ...card, textAlign: "center", padding: 32 }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
      <div style={{ fontWeight: 700, marginBottom: 6, color: T.danger }}>Verbindingsfout</div>
      <div style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>{tekst}</div>
      {onHerlaad && <button type="button" onClick={onHerlaad} style={{ ...btnPrimary, width: "auto", padding: "9px 20px" }}>Opnieuw proberen</button>}
    </div>
  );
}

// ─── SUPER CIRKEL KAART ───────────────────────────────────────────
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
    <div style={{ ...card, borderLeft: `4px solid ${cirkel.kleur}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.2px" }}>{cirkel.naam}</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>
            {cirkel.stad} · <span style={{ fontFamily: "monospace", background: T.bg, padding: "1px 7px", borderRadius: 4, border: `1px solid ${T.border}`, fontSize: 12 }}>{cirkel.id}</span>
          </div>
        </div>
        <button type="button" onClick={() => onVerwijder(cirkel.id)} style={{ background: "#FEF2F2", color: T.danger, border: `1px solid #FECACA`, padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Verwijderen
        </button>
      </div>

      {laden ? (
        <div style={{ fontSize: 13, color: T.mutedLt }}>Laden...</div>
      ) : (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.mutedLt, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Beheerder</div>
          {beheerders.length === 0 ? (
            <div style={{ fontSize: 13, color: T.mutedLt, marginBottom: 10 }}>Nog geen beheerder gekoppeld</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
              {beheerders.map(b => (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <span style={{ background: "#6C3FC5", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>beheerder</span>
                  <span style={{ fontWeight: 600 }}>{b.naam}</span>
                  <span style={{ color: T.mutedLt, fontSize: 12 }}>{b.email}</span>
                </div>
              ))}
            </div>
          )}

          {alleAcc.length > 0 && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select value={selectId} onChange={e => setSelectId(e.target.value)} style={{ flex: 1, padding: "8px 10px", borderRadius: T.r, border: `1.5px solid ${T.border}`, fontSize: 13, background: T.bg, minWidth: 0, color: T.dark }}>
                <option value="">— Kies beheerder —</option>
                {alleAcc.map(a => (
                  <option key={a.id} value={a.id}>{a.naam} ({a.email})</option>
                ))}
              </select>
              <button type="button" onClick={koppel} disabled={!selectId} style={{ background: "#6C3FC5", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: selectId ? "pointer" : "not-allowed", opacity: selectId ? 1 : 0.4, whiteSpace: "nowrap" }}>
                Koppelen
              </button>
            </div>
          )}
          {alleAcc.length === 0 && beheerders.length > 0 && (
            <div style={{ fontSize: 12, color: T.mutedLt }}>Alle beheerders zijn al gekoppeld</div>
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
  const [mijnCirkels, setMijnCirkels] = useState([]);
  const [superWachtenden, setSuperWachtenden] = useState([]);
  const [alleGebruikers, setAlleGebruikers]   = useState([]);
  const [leden, setLeden]             = useState([]);
  const [diensten, setDiensten]       = useState([]);
  const [verzoeken, setVerzoeken]     = useState([]);
  const [mijnVerzoeken, setMijnVerzoeken] = useState([]);
  const [laden, setLaden]             = useState(false);
  const [fout, setFout]               = useState(null);
  const [filter, setFilter]           = useState("Alle");
  const [zoek, setZoek]               = useState("");
  const [toast, setToast]             = useState(null);
  const [verzoekModal, setVerzoekModal] = useState(null);
  const [verzoekBericht, setVerzoekBericht] = useState("");
  const [bezig, setBezig]             = useState(false);

  const [loginForm,   setLoginForm]   = useState({ email: "", wachtwoord: "" });
  const [aanmeldForm, setAanmeldForm] = useState({ naam: "", email: "", wachtwoord: "", herhaal: "", telefoon: "", cirkelId: "" });
  const [dienstForm,  setDienstForm]  = useState({ titel: "", categorie: "Overig", beschrijving: "" });
  const [cirkelForm,  setCirkelForm]  = useState({ naam: "", stad: "", code: "" });
  const [loginFout,   setLoginFout]   = useState("");
  const [aanmeldFout, setAanmeldFout] = useState("");
  const [loginCaptcha,   setLoginCaptcha]   = useState(null);
  const [aanmeldCaptcha, setAanmeldCaptcha] = useState(null);
  const [wijzigForm, setWijzigForm]   = useState({ huidig: "", nieuw: "", herhaal: "" });
  const [wijzigFout, setWijzigFout]   = useState("");
  const [wijzigModal, setWijzigModal] = useState(false);
  const [resetModal, setResetModal]     = useState(null);
  const [resetCaptcha, setResetCaptcha] = useState(null);

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

  // ── RECOVERY TOKEN AFVANGEN ─────────────────────────────────────
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery") && hash.includes("access_token=")) {
      const params = new URLSearchParams(hash.replace("#", ""));
      const token = params.get("access_token");
      if (token) {
        authToken = token;
        setScherm("resetWachtwoord");
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
  }, []);

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

  async function laadAlleGebruikers() {
    try {
      const data = await api.getAlleAccounts();
      setAlleGebruikers(data);
    } catch (e) { console.error("Gebruikers laden mislukt:", e.message); }
  }

  // ── AUTH ────────────────────────────────────────────────────────
  async function inloggen() {
    setLoginFout("");
    if (!loginCaptcha) { setLoginFout("Bevestig dat je geen robot bent."); return; }

    const email = loginForm.email.trim().toLowerCase();
    setBezig(true);
    try {
      const pogingData = await api.getLoginPoging(email);
      const poging = pogingData[0] || null;
      if (poging?.geblokkerd_tot && new Date(poging.geblokkerd_tot) > new Date()) {
        const seconden = Math.ceil((new Date(poging.geblokkerd_tot) - Date.now()) / 1000);
        const minuten  = Math.ceil(seconden / 60);
        setLoginFout(`Te veel mislukte pogingen. Probeer het over ${minuten} minuut${minuten !== 1 ? "en" : ""} opnieuw.`);
        return;
      }

      const authData = await api.signIn(email, loginForm.wachtwoord, loginCaptcha);
      authToken = authData.access_token;

      await api.resetLoginPoging(email);

      const profielen = await api.getProfiel(authData.user.id);
      const acc = profielen[0];
      if (!acc) { setLoginFout("Geen profiel gevonden. Neem contact op met de beheerder."); authToken = null; return; }

      if (acc.status === "wacht")     { setGebruiker(acc); setScherm("wachten"); return; }
      if (acc.status === "afgewezen") { setLoginFout("Je aanmelding is helaas afgewezen."); authToken = null; return; }

      setGebruiker(acc);
      if (acc.rol === "super_beheerder") {
        await Promise.all([laadCirkels(), laadSuperWachtenden(), laadAlleGebruikers()]);
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

  async function wachtwoordResetten() {
    setAanmeldFout("");
    const { nieuw, herhaal } = wijzigForm;
    if (!nieuw || !herhaal)              { setAanmeldFout("Vul alle velden in."); return; }
    if (nieuw !== herhaal)               { setAanmeldFout("Wachtwoorden komen niet overeen."); return; }
    if (nieuw.length < 8)                { setAanmeldFout("Wachtwoord moet minimaal 8 tekens zijn."); return; }
    if (!/[A-Z]/.test(nieuw))            { setAanmeldFout("Wachtwoord moet minimaal 1 hoofdletter bevatten."); return; }
    if (!/[^A-Za-z0-9]/.test(nieuw))    { setAanmeldFout("Wachtwoord moet minimaal 1 speciaal teken bevatten."); return; }
    setBezig(true);
    try {
      const result = await api.updatePassword(nieuw);
      if (result.error) throw new Error(result.error.message || "Fout bij opslaan");
      authToken = null;
      setWijzigForm({ huidig: "", nieuw: "", herhaal: "" });
      setScherm("login");
      showToast("Wachtwoord gewijzigd! Je kunt nu inloggen.");
    } catch (e) {
      setAanmeldFout("Fout: " + e.message);
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
      await api.signIn(gebruiker.email, huidig);
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

  // ── AANMELDEN — captcha fix: token direct uit signUp response ───
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
    if (!aanmeldCaptcha) { setAanmeldFout("Bevestig dat je geen robot bent."); return; }
    setBezig(true);
    try {
      // 1. Maak Auth account aan — captcha token wordt hier verbruikt
      const authData = await api.signUp(email.trim(), wachtwoord, aanmeldCaptcha);
      const authId = authData.user?.id;
      if (!authId) throw new Error("Aanmaken Auth account mislukt.");

      // 2. Haal token direct uit signUp response
      //    (werkt omdat e-mailbevestiging uitstaat in Supabase)
      authToken = authData.access_token;
      if (!authToken) throw new Error("Geen sessie ontvangen na aanmelden.");

      // 3. Sla profiel op in accounts tabel
      const nieuw = await api.insertAccount({
        auth_id: authId,
        naam: naam.trim(), email: email.trim(),
        telefoon: telefoon.trim(), rol: "lid", status: "wacht", cirkel_id: cId,
      });

      // 4. Uitloggen — account moet eerst goedgekeurd worden door beheerder
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

  async function superGebruikerVerwijderen(id, naam) {
    if (!window.confirm(`Weet je zeker dat je "${naam}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return;
    try {
      await api.deleteAccount(id);
      setAlleGebruikers(prev => prev.filter(g => g.id !== id));
      setSuperWachtenden(prev => prev.filter(g => g.id !== id));
      showToast(`${naam} verwijderd.`);
    } catch (e) { showToast("Fout: " + e.message, "fout"); }
  }

  async function superGebruikerRolWijzigen(id, naam, huidigeRol, nieuweRol) {
    if (huidigeRol === nieuweRol) return;
    if (!window.confirm(`Rol van "${naam}" wijzigen van "${huidigeRol}" naar "${nieuweRol}"?`)) return;
    try {
      await api.updateAccount(id, { rol: nieuweRol });
      setAlleGebruikers(prev => prev.map(g => g.id === id ? { ...g, rol: nieuweRol } : g));
      showToast(`Rol van ${naam} gewijzigd naar ${nieuweRol}.`);
    } catch (e) { showToast("Fout: " + e.message, "fout"); }
  }


  async function wachtwoordResetVersturen() {
    if (!resetCaptcha) { showToast("Bevestig dat je geen robot bent.", "fout"); return; }
    setBezig(true);
    try {
      await api.resetWachtwoord(resetModal.email, resetCaptcha);
      showToast(`Reset e-mail verstuurd naar ${resetModal.naam}.`);
      setResetModal(null);
      setResetCaptcha(null);
    } catch (e) {
      showToast("Fout: " + e.message, "fout");
    } finally {
      setBezig(false);
    }
  }

  async function cirkelKoppelenAanBeheerder(beheerderId, cId) {
    try {
      await api.insertBeheerderCirkel({ beheerder_id: beheerderId, cirkel_id: cId });
      showToast("Cirkel gekoppeld aan beheerder!");
    } catch (e) { showToast("Fout: " + e.message, "fout"); }
  }

  async function cirkelVerwijderen(cId) {
    if (!window.confirm(`Weet je zeker dat je buurtcirkel ${cId} wilt verwijderen? Alle leden, diensten en verzoeken worden ook verwijderd.`)) return;
    try {
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
  const gefilterd = diensten.filter(d => {
    if (d.status !== "actief" && !isBeheerder && d.lid_id !== gebruiker?.id) return false;
    return (filter === "Alle" || d.categorie === filter) &&
      (zoek === "" || d.titel.toLowerCase().includes(zoek.toLowerCase()) || d.beschrijving.toLowerCase().includes(zoek.toLowerCase()));
  });

  const totaalOpenVerzoeken  = openVerzoeken.length;
  const totaalWachtenden     = wachtenden.length;
  const wachtendeDiensten    = diensten.filter(d => d.status === "wacht");
  const badgeCount           = totaalOpenVerzoeken + totaalWachtenden + wachtendeDiensten.length;

  // ═══════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.dark }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* ── HEADER ── */}
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 0 rgba(0,0,0,0.04)" }}>
        <button type="button" onClick={() => gebruiker && scherm !== "wachten" && setScherm(isSuperBeheerder ? "superBeheer" : "cirkel")} style={{ background: "none", border: "none", cursor: "pointer", color: T.dark, fontSize: 19, fontWeight: 800, letterSpacing: "-0.5px" }}>
          Buurt<span style={{ color: T.accent }}>Cirkel</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: T.mutedLt, marginLeft: 6 }}>v{APP_VERSIE}</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {gebruiker && scherm !== "wachten" && (
            <>
              {isSuperBeheerder ? (
                <>
                  <button type="button" onClick={() => setScherm("superBeheer")} style={{ background: scherm === "superBeheer" || scherm === "superGoedkeuren" || scherm === "superGebruikers" ? T.accent : T.bg, color: scherm === "superBeheer" || scherm === "superGoedkeuren" || scherm === "superGebruikers" ? "#fff" : T.muted, border: `1px solid ${T.border}`, padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", position: "relative" }}>
                    Beheer
                    {superWachtenden.length > 0 && <span style={{ position: "absolute", top: -5, right: -5, background: T.warning, color: "#fff", fontSize: 10, fontWeight: 800, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${T.surface}` }}>{superWachtenden.length}</span>}
                  </button>
                  <button type="button" onClick={() => setScherm("nieuweCirkel")} style={{ background: scherm === "nieuweCirkel" ? T.accent : T.bg, color: scherm === "nieuweCirkel" ? "#fff" : T.muted, border: `1px solid ${T.border}`, padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    + Cirkel
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setScherm("mijnVerzoeken")} style={{ background: scherm === "mijnVerzoeken" ? T.accent : T.bg, color: scherm === "mijnVerzoeken" ? "#fff" : T.muted, border: `1px solid ${T.border}`, padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Verzoeken
                  </button>
                  {isBeheerder && (
                    <button type="button" onClick={() => setScherm(scherm === "beheer" ? "cirkel" : "beheer")} style={{ background: scherm === "beheer" ? T.accent : T.bg, color: scherm === "beheer" ? "#fff" : T.muted, border: `1px solid ${T.border}`, padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", position: "relative" }}>
                      Beheer
                      {badgeCount > 0 && <span style={{ position: "absolute", top: -5, right: -5, background: T.accent, color: "#fff", fontSize: 10, fontWeight: 800, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${T.surface}` }}>{badgeCount}</span>}
                    </button>
                  )}
                </>
              )}
              <button type="button" onClick={() => { setWijzigModal(true); setWijzigFout(""); }} style={{ background: T.bg, color: T.muted, border: `1px solid ${T.border}`, padding: "6px 10px", borderRadius: 20, fontSize: 13, cursor: "pointer" }} title="Wachtwoord wijzigen">🔑</button>
              <button type="button" onClick={uitloggen} style={{ background: T.bg, color: T.muted, border: `1px solid ${T.border}`, padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Uit</button>
              <Avatar tekst={ini(gebruiker.naam)} size={32} kleur={isSuperBeheerder ? "#6C3FC5" : (cirkel?.kleur || T.accent)} />
            </>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "28px 16px" }}>

        {fout && scherm !== "login" && scherm !== "aanmelden" && (
          <div style={{ marginBottom: 16 }}>
            <Foutmelding tekst={fout} onHerlaad={() => cirkelId && laadCirkelData(cirkelId)} />
          </div>
        )}

        {/* ══ LOGIN ══ */}
        {scherm === "login" && (
          <div className="bc-fade">
            <div style={{ textAlign: "center", marginBottom: 36, paddingTop: 16 }}>
              <div style={{ width: 64, height: 64, background: T.accent, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 30, boxShadow: `0 8px 24px ${T.accent}40` }}>🏘️</div>
              <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6, letterSpacing: "-0.5px" }}>BuurtCirkel</h1>
              <p style={{ color: T.muted, fontSize: 14 }}>Diensten uitwisselen met je buren</p>
            </div>
            <div style={{ ...card, maxWidth: 420, margin: "0 auto" }}>
              <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 20, color: T.dark }}>Inloggen</h2>
              {loginFout && <div style={foutBox}>{loginFout}</div>}
              {fout && <div style={foutBox}>{fout}</div>}
              <label style={label}>E-mailadres</label>
              <input value={loginForm.email} onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))} placeholder="jouw@email.nl" style={{ ...inp, marginBottom: 14 }} />
              <label style={label}>Wachtwoord</label>
              <input type="password" value={loginForm.wachtwoord} onChange={e => setLoginForm(p => ({ ...p, wachtwoord: e.target.value }))} onKeyDown={e => e.key === "Enter" && inloggen()} placeholder="••••••••" style={{ ...inp, marginBottom: 18 }} />
              <HCaptcha id="login-captcha" onVerify={token => setLoginCaptcha(token)} onExpire={() => setLoginCaptcha(null)} />
              <button type="button" onClick={inloggen} disabled={bezig} style={{ ...btnPrimary, marginBottom: 10, opacity: bezig ? 0.7 : 1, cursor: bezig ? "not-allowed" : "pointer" }}>
                {bezig ? "Bezig..." : "Inloggen"}
              </button>
              <button type="button" onClick={() => { setScherm("aanmelden"); setAanmeldFout(""); }} style={btnSecondary}>
                Nog geen account? Aanmelden
              </button>
              <div style={{ marginTop: 16, padding: "12px 14px", background: T.bg, borderRadius: T.r, fontSize: 12, color: T.mutedLt, lineHeight: 1.7, border: `1px solid ${T.border}` }}>
                Gebruik je geregistreerde e-mail en wachtwoord. Accounts worden aangemaakt via het aanmeldformulier.
              </div>
            </div>
          </div>
        )}

        {/* ══ AANMELDEN ══ */}
        {scherm === "aanmelden" && (
          <div className="bc-fade">
            <button type="button" onClick={() => setScherm("login")} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 14, fontWeight: 600, marginBottom: 20, display: "flex", alignItems: "center", gap: 4 }}>← Terug</button>
            <div style={card}>
              <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Aanmelden</h2>
              <p style={{ color: T.muted, fontSize: 13, marginBottom: 20 }}>Na aanmelding beoordeelt de beheerder je verzoek.</p>
              {aanmeldFout && <div style={foutBox}>{aanmeldFout}</div>}
              {[
                { label: "Volledige naam", key: "naam", ph: "Voor- en achternaam", type: "text" },
                { label: "E-mailadres", key: "email", ph: "jouw@email.nl", type: "text" },
                { label: "Mobiel telefoonnummer", key: "telefoon", ph: "bijv. 06 12345678", type: "text" },
                { label: "Wachtwoord", key: "wachtwoord", ph: "Min. 8 tekens, 1 hoofdletter, 1 speciaal teken", type: "password" },
                { label: "Herhaal wachtwoord", key: "herhaal", ph: "Nogmaals je wachtwoord", type: "password" },
              ].map(f => (
                <div key={f.key}>
                  <label style={label}>{f.label}</label>
                  <input type={f.type} value={aanmeldForm[f.key]} onChange={e => setAanmeldForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.ph} style={{ ...inp, marginBottom: 14 }} />
                </div>
              ))}
              <label style={label}>Buurtcirkel code</label>
              <input value={aanmeldForm.cirkelId} onChange={e => setAanmeldForm(p => ({ ...p, cirkelId: e.target.value.toUpperCase() }))} placeholder="bijv. BC-1042" style={{ ...inp, marginBottom: 6, fontFamily: "monospace" }} />
              <div style={{ fontSize: 12, color: T.mutedLt, marginBottom: 20 }}>Je ontvangt deze code van de beheerder van je buurtcirkel.</div>
              <HCaptcha id="aanmeld-captcha" onVerify={token => setAanmeldCaptcha(token)} onExpire={() => setAanmeldCaptcha(null)} />
              <button type="button" onClick={aanmelden} disabled={bezig} style={{ ...btnPrimary, opacity: bezig ? 0.7 : 1, cursor: bezig ? "not-allowed" : "pointer" }}>
                {bezig ? "Bezig..." : "Aanmelding versturen"}
              </button>
            </div>
          </div>
        )}

        {/* ══ WACHTEN ══ */}
        {scherm === "wachten" && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <h2 style={{ fontWeight: 800, fontSize: 22, marginBottom: 10, letterSpacing: "-0.5px" }}>Aanmelding wordt beoordeeld</h2>
            <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.7, marginBottom: 28, maxWidth: 320, margin: "0 auto 28px" }}>
              De beheerder van <strong>{cirkels.find(c => c.id === gebruiker?.cirkel_id)?.naam || "je buurtcirkel"}</strong> beoordeelt je verzoek.
            </p>
            <button type="button" onClick={uitloggen} style={{ ...btnSecondary, width: "auto", padding: "10px 24px" }}>Uitloggen</button>
          </div>
        )}

        {/* ══ WACHTWOORD RESETTEN ══ */}
        {scherm === "resetWachtwoord" && (
          <div className="bc-fade">
            <div style={card}>
              <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 4, letterSpacing: "-0.5px" }}>Nieuw wachtwoord instellen</h2>
              <p style={{ color: T.muted, fontSize: 13, marginBottom: 20 }}>Kies een nieuw wachtwoord voor je account.</p>
              {aanmeldFout && <div style={foutBox}>{aanmeldFout}</div>}
              <label style={label}>Nieuw wachtwoord</label>
              <input type="password" value={wijzigForm.nieuw} onChange={e => setWijzigForm(p => ({ ...p, nieuw: e.target.value }))} placeholder="Min. 8 tekens, 1 hoofdletter, 1 speciaal teken" style={{ ...inp, marginBottom: 14 }} />
              <label style={label}>Herhaal wachtwoord</label>
              <input type="password" value={wijzigForm.herhaal} onChange={e => setWijzigForm(p => ({ ...p, herhaal: e.target.value }))} placeholder="Nogmaals je wachtwoord" style={{ ...inp, marginBottom: 20 }} />
              <button type="button" onClick={wachtwoordResetten} disabled={bezig} style={{ ...btnPrimary, opacity: bezig ? 0.7 : 1, cursor: bezig ? "not-allowed" : "pointer" }}>
                {bezig ? "Bezig..." : "Wachtwoord opslaan"}
              </button>
            </div>
          </div>
        )}

        {/* ══ CIRKEL ══ */}
        {scherm === "cirkel" && cirkel && (
          <div className="bc-fade">
            <div style={{ background: cirkel.kleur, borderRadius: T.rXl, padding: "22px", marginBottom: 16, color: "#fff", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", right: -20, top: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
              <div style={{ position: "absolute", right: 20, bottom: -30, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
              <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, marginBottom: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>{cirkelId}</div>
              <div style={{ fontWeight: 800, fontSize: 24, marginBottom: 4, letterSpacing: "-0.5px" }}>{cirkel.naam}</div>
              <div style={{ opacity: 0.8, fontSize: 13, marginBottom: 16 }}>{cirkel.stad} · {diensten.length} diensten · {actieven.length} leden</div>
              <button type="button" onClick={() => setScherm("nieuweDienst")} style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.4)", padding: "8px 18px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(4px)" }}>
                + Dienst aanbieden
              </button>
            </div>

            <input value={zoek} onChange={e => setZoek(e.target.value)} placeholder="🔍  Zoek diensten..." style={{ ...inp, marginBottom: 12 }} />

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {["Alle", ...CATS].map(cat => (
                <button type="button" key={cat} onClick={() => setFilter(cat)} style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1.5px solid ${filter === cat ? cirkel.kleur : T.border}`, cursor: "pointer", background: filter === cat ? cirkel.kleur : T.surface, color: filter === cat ? "#fff" : T.muted, transition: "all 0.15s" }}>
                  {cat}
                </button>
              ))}
            </div>

            {laden ? <Spinner /> : gefilterd.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: T.mutedLt }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
                <div style={{ fontWeight: 600 }}>Geen diensten gevonden</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {gefilterd.map(d => {
                  const cat = CAT_STIJL[d.categorie] || CAT_STIJL.Overig;
                  const isEigen = d.lid_id === gebruiker?.id;
                  const alVerzocht = mijnVerzoeken.some(v => v.dienst_id === d.id);
                  return (
                    <div key={d.id} style={{ ...card, transition: "box-shadow 0.15s" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                        <Avatar tekst={d.avatar} size={40} kleur={cirkel.kleur} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2, letterSpacing: "-0.2px" }}>{d.titel}</div>
                          <div style={{ fontSize: 13, color: T.muted }}>{d.lid_naam}</div>
                        </div>
                        <span style={badge(cat.bg, cat.text)}>{d.categorie}</span>
                      </div>
                      <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, margin: "0 0 12px" }}>{d.beschrijving}</p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
                        <span style={{ fontSize: 12, color: T.mutedLt }}>{new Date(d.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}</span>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          {d.status === "wacht" && <span style={badge(CAT_STIJL.Overig.bg, T.muted)}>⏳ Wacht</span>}
                          {(isEigen || isBeheerder) && (
                            <button type="button" onClick={() => dienstVerwijderen(d.id)} style={{ background: "#FEF2F2", color: T.danger, border: `1px solid #FECACA`, padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                              Verwijder
                            </button>
                          )}
                          {!isEigen && d.status === "actief" && (
                            alVerzocht ? (
                              <span style={badge(T.bg, T.mutedLt)}>Verzocht ✓</span>
                            ) : (
                              <button type="button" onClick={() => { setVerzoekModal(d); setVerzoekBericht(""); }} style={{ background: cirkel.kleur, color: "#fff", border: "none", padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
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
          <div className="bc-fade">
            <button type="button" onClick={() => setScherm("cirkel")} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 14, fontWeight: 600, marginBottom: 20, display: "flex", alignItems: "center", gap: 4 }}>← Terug</button>
            <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 20, letterSpacing: "-0.5px" }}>Mijn verzoeken</h2>

            {verzoeken.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 8, textTransform: "uppercase", letterSpacing: "0.05em", color: T.muted }}>
                  Inkomend
                  {openVerzoeken.length > 0 && <span style={badge(T.accent, "#fff")}>{openVerzoeken.length}</span>}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {verzoeken.map(v => {
                    const stijl = VERZOEK_STIJL[v.status] || VERZOEK_STIJL.wacht;
                    const accentKleur = v.status === "wacht" ? T.warning : v.status === "geaccepteerd" ? T.success : T.danger;
                    return (
                      <div key={v.id} style={{ ...card, borderLeft: `3px solid ${accentKleur}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{v.aanvrager_naam}</div>
                            <div style={{ fontSize: 13, color: T.muted }}>vraagt om: <em>{v.dienst_titel}</em></div>
                          </div>
                          <span style={badge(stijl.bg, stijl.text)}>{stijl.label}</span>
                        </div>
                        {v.bericht && <p style={{ fontSize: 13, color: T.muted, margin: "0 0 10px", lineHeight: 1.5, fontStyle: "italic" }}>"{v.bericht}"</p>}
                        {v.status === "wacht" && (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button type="button" onClick={() => verzoekBeantwoorden(v.id, "geaccepteerd")} style={{ background: T.success, color: "#fff", border: "none", padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Accepteren</button>
                            <button type="button" onClick={() => verzoekBeantwoorden(v.id, "afgewezen")} style={{ background: T.danger, color: "#fff", border: "none", padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Afwijzen</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: T.muted }}>Verstuurd</h3>
              {mijnVerzoeken.length === 0 ? (
                <div style={{ ...card, color: T.mutedLt, textAlign: "center", padding: 24 }}>Je hebt nog geen diensten aangevraagd</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {mijnVerzoeken.map(v => {
                    const stijl = VERZOEK_STIJL[v.status] || VERZOEK_STIJL.wacht;
                    return (
                      <div key={v.id} style={card}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{v.dienst_titel}</div>
                            <div style={{ fontSize: 12, color: T.mutedLt }}>{new Date(v.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}</div>
                          </div>
                          <span style={badge(stijl.bg, stijl.text)}>{stijl.label}</span>
                        </div>
                        {v.bericht && <p style={{ fontSize: 13, color: T.muted, margin: "8px 0 0", lineHeight: 1.5, fontStyle: "italic" }}>"{v.bericht}"</p>}
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
          <div className="bc-fade">
            <button type="button" onClick={() => setScherm("cirkel")} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 14, fontWeight: 600, marginBottom: 20, display: "flex", alignItems: "center", gap: 4 }}>← Terug</button>
            <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 20, letterSpacing: "-0.5px" }}>Beheer — {cirkel?.naam}</h2>

            {wachtenden.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 8, textTransform: "uppercase", letterSpacing: "0.05em", color: T.muted }}>
                  Wachten op goedkeuring
                  <span style={badge(T.accent, "#fff")}>{wachtenden.length}</span>
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {wachtenden.map(lid => (
                    <div key={lid.id} style={{ ...card, borderLeft: `3px solid ${T.warning}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <Avatar tekst={ini(lid.naam)} size={40} kleur={T.warning} />
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{lid.naam}</div>
                          <div style={{ fontSize: 13, color: T.muted }}>{lid.email}</div>
                          {lid.telefoon && <div style={{ fontSize: 13, color: T.muted }}>📱 {lid.telefoon}</div>}
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button type="button" onClick={() => lidGoedkeuren(lid.id)} style={{ background: T.success, color: "#fff", border: "none", padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Goedkeuren</button>
                          <button type="button" onClick={() => lidAfwijzen(lid.id)} style={{ background: T.danger, color: "#fff", border: "none", padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Afwijzen</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {wachtendeDiensten.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 8, textTransform: "uppercase", letterSpacing: "0.05em", color: T.muted }}>
                  Diensten — wacht op goedkeuring
                  <span style={badge("#FEF9C3", T.warning)}>{wachtendeDiensten.length}</span>
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {wachtendeDiensten.map(d => {
                    const cat = CAT_STIJL[d.categorie] || CAT_STIJL.Overig;
                    return (
                      <div key={d.id} style={{ ...card, borderLeft: `3px solid ${T.warning}` }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                          <Avatar tekst={d.avatar} size={36} kleur={cirkel?.kleur || T.muted} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{d.titel}</div>
                            <div style={{ fontSize: 13, color: T.muted }}>{d.lid_naam}</div>
                            <span style={{ ...badge(cat.bg, cat.text), display: "inline-block", marginTop: 4 }}>{d.categorie}</span>
                          </div>
                        </div>
                        <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, margin: "0 0 12px" }}>{d.beschrijving}</p>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="button" onClick={() => dienstGoedkeuren(d.id)} style={{ background: T.success, color: "#fff", border: "none", padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Goedkeuren</button>
                          <button type="button" onClick={() => dienstAfwijzen(d.id)} style={{ background: T.danger, color: "#fff", border: "none", padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Afwijzen</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: T.muted }}>Actieve leden ({actieven.length})</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {actieven.map(lid => (
                  <div key={lid.id} style={{ ...card, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <Avatar tekst={ini(lid.naam)} size={38} kleur={cirkel?.kleur || T.muted} />
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {lid.naam}
                        {lid.rol === "beheerder" && <span style={badge(T.dark, "#fff")}>beheerder</span>}
                      </div>
                      <div style={{ fontSize: 13, color: T.muted }}>{lid.email}</div>
                      {lid.telefoon && <div style={{ fontSize: 13, color: T.muted }}>📱 {lid.telefoon}</div>}
                    </div>
                    {lid.id !== gebruiker.id && (
                      <button type="button" onClick={() => lidVerwijderen(lid.id)} style={{ background: "#FEF2F2", color: T.danger, border: `1px solid #FECACA`, padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
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
          <div className="bc-fade">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 10 }}>
              <h2 style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.5px" }}>Super beheer</h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {superWachtenden.length > 0 && (
                  <button type="button" onClick={() => setScherm("superGoedkeuren")} style={{ background: "#FEF9C3", color: T.warning, border: `1px solid #FDE68A`, padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    ⏳ Aanmeldingen
                    <span style={badge(T.accent, "#fff")}>{superWachtenden.length}</span>
                  </button>
                )}
                <button type="button" onClick={() => { laadAlleGebruikers(); setScherm("superGebruikers"); }} style={{ background: T.bg, color: T.dark, border: `1.5px solid ${T.border}`, padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  👥 Gebruikers
                </button>
              </div>
            </div>
            <p style={{ color: T.muted, fontSize: 13, marginBottom: 20 }}>Overzicht van alle buurtcirkels en beheerders.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {cirkels.map(c => (
                <SuperCirkelKaart key={c.id} cirkel={c} onKoppel={cirkelKoppelenAanBeheerder} onVerwijder={cirkelVerwijderen} showToast={showToast} sb={sb} />
              ))}
              {cirkels.length === 0 && (
                <div style={{ ...card, color: T.mutedLt, textAlign: "center", padding: 24 }}>Nog geen buurtcirkels aangemaakt</div>
              )}
            </div>
          </div>
        )}

        {/* ══ SUPER GOEDKEUREN ══ */}
        {scherm === "superGoedkeuren" && isSuperBeheerder && (
          <div className="bc-fade">
            <button type="button" onClick={() => setScherm("superBeheer")} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 14, fontWeight: 600, marginBottom: 20, display: "flex", alignItems: "center", gap: 4 }}>← Terug</button>
            <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 4, letterSpacing: "-0.5px" }}>Aanmeldingen goedkeuren</h2>
            <p style={{ color: T.muted, fontSize: 13, marginBottom: 20 }}>Alle wachtende aanmeldingen over alle buurtcirkels.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {superWachtenden.length === 0 ? (
                <div style={{ ...card, color: T.mutedLt, textAlign: "center", padding: 24 }}>Geen wachtende aanmeldingen</div>
              ) : superWachtenden.map(lid => {
                const cirkelNaam = cirkels.find(c => c.id === lid.cirkel_id);
                return (
                  <div key={lid.id} style={{ ...card, borderLeft: `3px solid ${T.warning}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <Avatar tekst={ini(lid.naam)} size={40} kleur={T.warning} />
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{lid.naam}</div>
                        <div style={{ fontSize: 13, color: T.muted }}>{lid.email}</div>
                        {lid.telefoon && <div style={{ fontSize: 13, color: T.muted }}>📱 {lid.telefoon}</div>}
                        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                          <span style={{ background: T.bg, color: T.muted, padding: "2px 8px", borderRadius: 20, fontFamily: "monospace", fontSize: 12, border: `1px solid ${T.border}` }}>{lid.cirkel_id}</span>
                          {cirkelNaam && <span style={{ color: T.mutedLt, fontSize: 12 }}>{cirkelNaam.naam}</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button type="button" onClick={() => lidGoedkeuren(lid.id)} style={{ background: T.success, color: "#fff", border: "none", padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Goedkeuren</button>
                        <button type="button" onClick={() => lidAfwijzen(lid.id)} style={{ background: T.danger, color: "#fff", border: "none", padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Afwijzen</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ SUPER GEBRUIKERS ══ */}
        {scherm === "superGebruikers" && isSuperBeheerder && (
          <div className="bc-fade">
            <button type="button" onClick={() => setScherm("superBeheer")} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 14, fontWeight: 600, marginBottom: 20, display: "flex", alignItems: "center", gap: 4 }}>← Terug</button>
            <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 4, letterSpacing: "-0.5px" }}>Gebruikers beheren</h2>
            <p style={{ color: T.muted, fontSize: 13, marginBottom: 20 }}>Alle gebruikers over alle buurtcirkels.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {alleGebruikers.length === 0 ? (
                <div style={{ ...card, color: T.mutedLt, textAlign: "center", padding: 24 }}>Geen gebruikers gevonden</div>
              ) : alleGebruikers.map(g => {
                const cirkelNaam = cirkels.find(c => c.id === g.cirkel_id);
                const rolKleur = g.rol === "super_beheerder" ? "#6C3FC5" : g.rol === "beheerder" ? "#4A6FD9" : T.muted;
                const statusKleur = g.status === "actief" ? { bg: "#D4EDDA", text: "#155724" } : g.status === "wacht" ? { bg: "#FFF3CD", text: "#856404" } : { bg: "#F8D7DA", text: "#721C24" };
                return (
                  <div key={g.id} style={{ ...card, borderLeft: `4px solid ${rolKleur}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <Avatar tekst={ini(g.naam)} size={40} kleur={rolKleur} />
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{g.naam}</div>
                        <div style={{ fontSize: 13, color: "#999" }}>{g.email}</div>
                        {g.telefoon && <div style={{ fontSize: 13, color: "#999" }}>📱 {g.telefoon}</div>}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                          <span style={{ background: "#f0f0f0", color: "#555", padding: "2px 8px", borderRadius: 20, fontFamily: "monospace", fontSize: 12 }}>{g.cirkel_id}</span>
                          {cirkelNaam && <span style={{ color: "#aaa", fontSize: 12 }}>{cirkelNaam.naam}</span>}
                          <span style={{ background: statusKleur.bg, color: statusKleur.text, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{g.status}</span>
                          <span style={{ background: rolKleur, color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{g.rol}</span>
                        </div>
                      </div>
                      {g.rol !== "super_beheerder" && (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <select
                            value={g.rol}
                            onChange={e => superGebruikerRolWijzigen(g.id, g.naam, g.rol, e.target.value)}
                            style={{ padding: "6px 10px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 13, background: "#fafafa", cursor: "pointer" }}
                          >
                            <option value="lid">lid</option>
                            <option value="beheerder">beheerder</option>
                          </select>
                          <button type="button" onClick={() => superGebruikerVerwijderen(g.id, g.naam)} style={{ background: "#fee", color: "#c0392b", border: "1px solid #fcc", padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                            🗑 Verwijderen
                          </button>
                          <button type="button" onClick={() => { setResetModal({ email: g.email, naam: g.naam }); setResetCaptcha(null); }} style={{ background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                            ✉ Reset wachtwoord
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ NIEUWE DIENST ══ */}
        {scherm === "nieuweDienst" && cirkel && (
          <div className="bc-fade">
            <button type="button" onClick={() => setScherm("cirkel")} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 14, fontWeight: 600, marginBottom: 20, display: "flex", alignItems: "center", gap: 4 }}>← Terug</button>
            <div style={card}>
              <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 20, letterSpacing: "-0.5px" }}>Dienst aanbieden</h2>
              <label style={label}>Wat bied je aan?</label>
              <input value={dienstForm.titel} onChange={e => setDienstForm(p => ({ ...p, titel: e.target.value }))} placeholder="bijv. Gitaarlessen voor beginners" style={{ ...inp, marginBottom: 14 }} />
              <label style={label}>Categorie</label>
              <select value={dienstForm.categorie} onChange={e => setDienstForm(p => ({ ...p, categorie: e.target.value }))} style={{ ...inp, marginBottom: 14 }}>
                {CATS.map(c => <option key={c}>{c}</option>)}
              </select>
              <label style={label}>Beschrijving</label>
              <textarea value={dienstForm.beschrijving} onChange={e => setDienstForm(p => ({ ...p, beschrijving: e.target.value }))} placeholder="Vertel meer over wat je aanbiedt..." rows={4} style={{ ...inp, resize: "vertical", marginBottom: 20 }} />
              <button type="button" onClick={dienstToevoegen} disabled={bezig} style={{ ...btnPrimary, background: cirkel.kleur, opacity: bezig ? 0.7 : 1, cursor: bezig ? "not-allowed" : "pointer" }}>
                {bezig ? "Bezig..." : "Dienst plaatsen"}
              </button>
            </div>
          </div>
        )}

        {/* ══ NIEUWE CIRKEL (alleen super beheerder) ══ */}
        {scherm === "nieuweCirkel" && isSuperBeheerder && (
          <div className="bc-fade">
            <button type="button" onClick={() => setScherm("superBeheer")} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 14, fontWeight: 600, marginBottom: 20, display: "flex", alignItems: "center", gap: 4 }}>← Terug</button>
            <div style={card}>
              <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 4, letterSpacing: "-0.5px" }}>Nieuwe buurtcirkel</h2>
              <p style={{ color: T.muted, fontSize: 13, marginBottom: 20 }}>Kies een unieke BC-code. Leden gebruiken deze bij aanmelding.</p>
              <label style={label}>BC-code</label>
              <input value={cirkelForm.code} onChange={e => setCirkelForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="bijv. BC-PIJP of BC-1042" style={{ ...inp, marginBottom: 6, fontFamily: "monospace", fontWeight: 600 }} />
              <div style={{ fontSize: 12, color: T.mutedLt, marginBottom: 16 }}>Begint altijd met BC- gevolgd door letters of cijfers</div>
              <label style={label}>Naam van de wijk</label>
              <input value={cirkelForm.naam} onChange={e => setCirkelForm(p => ({ ...p, naam: e.target.value }))} placeholder="bijv. De Pijp" style={{ ...inp, marginBottom: 14 }} />
              <label style={label}>Stad</label>
              <input value={cirkelForm.stad} onChange={e => setCirkelForm(p => ({ ...p, stad: e.target.value }))} placeholder="bijv. Amsterdam" style={{ ...inp, marginBottom: 20 }} />
              <button type="button" onClick={nieuweCirkelAanmaken} disabled={bezig} style={{ ...btnPrimary, background: "#6C3FC5", opacity: bezig ? 0.7 : 1, cursor: bezig ? "not-allowed" : "pointer" }}>
                {bezig ? "Bezig..." : "Buurtcirkel aanmaken"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── WACHTWOORD WIJZIGEN MODAL ── */}
      <Modal open={wijzigModal} onClose={() => { setWijzigModal(false); setWijzigForm({ huidig: "", nieuw: "", herhaal: "" }); setWijzigFout(""); }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4, letterSpacing: "-0.3px" }}>Wachtwoord wijzigen</div>
          <p style={{ color: T.muted, fontSize: 13, marginBottom: 20 }}>Voer je huidige wachtwoord in en kies een nieuw wachtwoord.</p>
          {wijzigFout && <div style={foutBox}>{wijzigFout}</div>}
          {[
            { label: "Huidig wachtwoord", key: "huidig" },
            { label: "Nieuw wachtwoord", key: "nieuw" },
            { label: "Herhaal nieuw wachtwoord", key: "herhaal" },
          ].map(f => (
            <div key={f.key}>
              <label style={label}>{f.label}</label>
              <input type="password" value={wijzigForm[f.key]} onChange={e => setWijzigForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder="••••••••" style={{ ...inp, marginBottom: 14 }} />
            </div>
          ))}
          <div style={{ fontSize: 12, color: T.mutedLt, marginBottom: 18 }}>Min. 8 tekens, 1 hoofdletter, 1 speciaal teken</div>
          <button type="button" onClick={wachtwoordWijzigen} disabled={bezig} style={{ ...btnPrimary, marginBottom: 8, opacity: bezig ? 0.7 : 1, cursor: bezig ? "not-allowed" : "pointer" }}>
            {bezig ? "Bezig..." : "Wachtwoord wijzigen"}
          </button>
          <button type="button" onClick={() => { setWijzigModal(false); setWijzigForm({ huidig: "", nieuw: "", herhaal: "" }); setWijzigFout(""); }} style={btnSecondary}>
            Annuleren
          </button>
        </div>
      </Modal>

      {/* ── RESET WACHTWOORD MODAL ── */}
      <Modal open={!!resetModal} onClose={() => { setResetModal(null); setResetCaptcha(null); }}>
        {resetModal && (
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4, letterSpacing: "-0.3px" }}>Reset wachtwoord</div>
            <p style={{ color: T.muted, fontSize: 13, marginBottom: 20 }}>
              Een reset e-mail wordt verstuurd naar <strong>{resetModal.naam}</strong> ({resetModal.email}).
            </p>
            <HCaptcha id="reset-captcha" onVerify={token => setResetCaptcha(token)} onExpire={() => setResetCaptcha(null)} />
            <button type="button" onClick={wachtwoordResetVersturen} disabled={bezig} style={{ ...btnPrimary, marginBottom: 8, opacity: bezig ? 0.7 : 1, cursor: bezig ? "not-allowed" : "pointer" }}>
              {bezig ? "Bezig..." : "Reset e-mail versturen"}
            </button>
            <button type="button" onClick={() => { setResetModal(null); setResetCaptcha(null); }} style={btnSecondary}>
              Annuleren
            </button>
          </div>
        )}
      </Modal>

      {/* ── VERZOEK MODAL ── */}
      <Modal open={!!verzoekModal} onClose={() => setVerzoekModal(null)}>
        {verzoekModal && (
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4, letterSpacing: "-0.3px" }}>Dienst aanvragen</div>
            <p style={{ color: T.muted, fontSize: 13, marginBottom: 16 }}>
              Je vraagt <strong>{verzoekModal.lid_naam}</strong> om: <em>{verzoekModal.titel}</em>
            </p>
            <div style={{ background: T.bg, borderRadius: T.r, padding: 14, marginBottom: 16, fontSize: 13, color: T.muted, lineHeight: 1.6, border: `1px solid ${T.border}` }}>
              {verzoekModal.beschrijving}
            </div>
            <label style={label}>Optioneel bericht</label>
            <textarea value={verzoekBericht} onChange={e => setVerzoekBericht(e.target.value)} placeholder="Vertel iets over je situatie of vraag..." rows={3} style={{ ...inp, resize: "vertical", marginBottom: 18 }} />
            <button type="button" onClick={verzoekVersturen} disabled={bezig} style={{ ...btnPrimary, background: cirkel?.kleur || T.accent, marginBottom: 8, opacity: bezig ? 0.7 : 1, cursor: bezig ? "not-allowed" : "pointer" }}>
              {bezig ? "Bezig..." : "Verzoek versturen"}
            </button>
            <button type="button" onClick={() => setVerzoekModal(null)} style={btnSecondary}>
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
