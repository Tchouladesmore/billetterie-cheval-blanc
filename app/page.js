"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { VENUE, EVENTS, TIERS } from "../lib/config";

const fmt = (n) => n.toLocaleString("fr-FR").replace(/\u202f/g, " ") + " F";

async function api(path, code, body) {
  const r = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json", "x-code": code },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 401) throw new Error("code");
  return r.json();
}

async function drawTicket(t) {
  const W = 600, H = 960;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = "#14121f"; x.fillRect(0, 0, W, H);
  x.fillStyle = "#d9480f"; x.fillRect(0, 0, W, 14);
  x.textAlign = "center";
  x.fillStyle = "#fff"; x.font = "bold 40px Arial, sans-serif"; x.fillText(VENUE, W / 2, 80);
  x.fillStyle = "#c9c9d6"; x.font = "20px Arial, sans-serif";
  x.fillText(("BILLET · " + t.event).toUpperCase(), W / 2, 114);
  x.fillStyle = "#ffa94d"; x.font = "bold 44px Arial, sans-serif"; x.fillText(fmt(t.price), W / 2, 180);
  x.fillStyle = "#fff"; x.font = "bold 34px Arial, sans-serif";
  let nm = t.name;
  while (x.measureText(nm).width > 520 && nm.length > 3) nm = nm.slice(0, -2) + "…";
  x.fillText(nm, W / 2, 250);
  x.fillStyle = "#e8e8f0"; x.font = "24px Arial, sans-serif";
  TIERS[t.price].forEach((p, i) => x.fillText("• " + p, W / 2, 310 + i * 38));
  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, t.id, { width: 360, margin: 0, errorCorrectionLevel: "H" });
  x.fillStyle = "#fff"; x.fillRect(W / 2 - 190, 480, 380, 380);
  x.drawImage(qr, W / 2 - 180, 490, 360, 360);
  x.fillStyle = "#c9c9d6"; x.font = "bold 24px monospace"; x.fillText(t.id, W / 2, 905);
  x.font = "15px Arial, sans-serif"; x.fillText("Valable une seule fois · Ne pas partager", W / 2, 936);
  return c;
}

export default function Home() {
  const [code, setCode] = useState(null);
  const [codeInput, setCodeInput] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [tab, setTab] = useState("gen");
  const [tickets, setTickets] = useState([]);
  const [tier, setTier] = useState(5000);
  const [evt, setEvt] = useState(EVENTS[0]);
  const [seller, setSeller] = useState("");
  const [name, setName] = useState("");
  const [busyGen, setBusyGen] = useState(false);
  const [img, setImg] = useState(null);
  const [res, setRes] = useState(null);
  const [manual, setManual] = useState("");
  const blobRef = useRef(null);
  const lastNameRef = useRef("");
  const scannerRef = useRef(null);
  const lockRef = useRef(false);
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    const c = localStorage.getItem("code");
    if (c) setCode(c);
    setSeller(localStorage.getItem("vendeur") || "");
    setAdmin(localStorage.getItem("admin"));
  }, []);

  async function refresh(c = code) {
    try {
      const l = await api("/api/tickets", c);
      if (Array.isArray(l)) setTickets(l);
    } catch (e) {
      if (e.message === "code") logout();
    }
  }
  useEffect(() => {
    if (!code) return;
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [code]);

  async function login(e) {
    e.preventDefault();
    setLoginErr("");
    try {
      const l = await api("/api/tickets", codeInput.trim());
      if (!Array.isArray(l)) throw new Error("x");
      localStorage.setItem("code", codeInput.trim());
      setCode(codeInput.trim());
    } catch (e) {
      setLoginErr("Code incorrect.");
    }
  }
  function logout() { localStorage.removeItem("code"); localStorage.removeItem("admin"); setCode(null); setAdmin(null); }
  async function becomeAdmin() {
    const a = prompt("Code administrateur :");
    if (!a) return;
    const r = await fetch("/api/admin", { method: "POST", headers: { "x-code": code, "x-admin": a } }).then((x) => x.json()).catch(() => ({}));
    if (r.ok) { localStorage.setItem("admin", a); setAdmin(a); } else alert("Code administrateur incorrect.");
  }
  async function removeTicket(t) {
    if (!confirm("Supprimer le billet de " + t.name + " ? Il ne sera plus valable.")) return;
    const r = await fetch("/api/tickets", { method: "DELETE", headers: { "content-type": "application/json", "x-code": code, "x-admin": admin }, body: JSON.stringify({ id: t.id }) });
    if (r.ok) refresh(); else alert("Suppression refusée.");
  }

  async function generate() {
    if (!name.trim() || busyGen) return;
    setBusyGen(true);
    try {
      localStorage.setItem("vendeur", seller.trim());
      const t = await api("/api/tickets", code, { name, price: tier, event: evt, seller });
      if (t.error) throw new Error(t.error);
      const c = await drawTicket(t);
      setImg(c.toDataURL("image/png"));
      c.toBlob((b) => (blobRef.current = b), "image/png");
      lastNameRef.current = t.name;
      setName("");
      refresh();
    } catch (e) {
      alert("Erreur : le billet n’a pas pu être créé.");
    }
    setBusyGen(false);
  }

  async function share() {
    const b = blobRef.current;
    if (!b) return;
    const fname = "billet-" + lastNameRef.current.replace(/[^\w]+/g, "_") + ".png";
    const f = new File([b], fname, { type: "image/png" });
    try {
      if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f] }); return; }
    } catch (e) { return; }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b); a.download = fname; a.click();
  }

  async function verify(raw) {
    if (lockRef.current) return;
    lockRef.current = true;
    setTimeout(() => (lockRef.current = false), 2500);
    try {
      const r = await api("/api/scan", code, { id: raw });
      setRes(r);
      try { navigator.vibrate && navigator.vibrate(r.status === "valid" ? 80 : [200, 100, 200]); } catch (e) {}
      refresh();
    } catch (e) {
      setRes({ status: "error" });
    }
  }
  async function startCam() {
    if (scannerRef.current) return;
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const s = new Html5Qrcode("reader");
      scannerRef.current = s;
      await s.start({ facingMode: "environment" }, { fps: 10, qrbox: 240 }, (txt) => verify(txt.trim().toUpperCase()), () => {});
    } catch (e) {
      scannerRef.current = null;
      setRes({ status: "nocam" });
    }
  }
  function stopCam() {
    if (scannerRef.current) { scannerRef.current.stop().catch(() => {}); scannerRef.current = null; }
  }
  function go(t) { if (t !== "scan") stopCam(); setTab(t); }

  if (!code) {
    return (
      <main>
        <h1>🎟️ Billetterie {VENUE}</h1>
        <form className="card" onSubmit={login}>
          <label>Code d’accès vendeur</label>
          <input type="password" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} autoFocus />
          {loginErr && <div className="err">{loginErr}</div>}
          <button className="btn" type="submit">Entrer</button>
        </form>
      </main>
    );
  }

  const used = tickets.filter((t) => t.usedAt).length;
  const total = tickets.reduce((s, t) => s + t.price, 0);
  const hm = (ms) => new Date(ms).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

  return (
    <main>
      <h1>🎟️ Billetterie {VENUE}</h1>
      <nav>
        {[["gen", "Générer"], ["scan", "Scanner"], ["list", "Liste"]].map(([k, l]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => go(k)}>{l}</button>
        ))}
      </nav>

      {tab === "gen" && (
        <>
          <div className="card">
            <label>Soirée</label>
            <div className="tiers">
              {EVENTS.map((n) => (
                <button key={n} className={"tier" + (n === evt ? " on" : "")} onClick={() => setEvt(n)}><b>{n}</b></button>
              ))}
            </div>
            <label>Votre nom (vendeur)</label>
            <input value={seller} onChange={(e) => setSeller(e.target.value)} placeholder="Ex : Paul" />
            <label>Nom du client</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Marie Ngono" />
            <label>Format du billet</label>
            <div className="tiers">
              {Object.keys(TIERS).map((p) => (
                <button key={p} className={"tier" + (+p === tier ? " on" : "")} onClick={() => setTier(+p)}>
                  <b>{fmt(+p)}</b><small>{TIERS[p].join(" · ")}</small>
                </button>
              ))}
            </div>
            <button className="btn" onClick={generate} disabled={busyGen}>{busyGen ? "Création…" : "Générer le billet"}</button>
          </div>
          {img && (
            <div className="card preview">
              <img src={img} alt="Billet" />
              <button className="btn" onClick={share}>Télécharger / partager le billet</button>
            </div>
          )}
        </>
      )}

      {tab === "scan" && (
        <>
          <div className="card">
            <div id="reader" style={{ width: "100%" }} />
            <button className="btn" onClick={startCam}>Démarrer la caméra</button>
            <label>Ou saisir le code du billet à la main</label>
            <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Code (ex : K7M2QX9PA4)" autoCapitalize="characters" />
            <button className="btn alt" onClick={() => manual.trim() && verify(manual.trim().toUpperCase())}>Vérifier</button>
          </div>
          {res && (
            <div className={"res " + (res.status === "valid" ? "ok" : "ko")}>
              {res.status === "valid" && (<><b>✅ VALIDE</b>{res.ticket.name} · {fmt(res.ticket.price)}<br />{res.ticket.event}<br />{TIERS[res.ticket.price].join(" · ")}</>)}
              {res.status === "used" && (<><b>⛔ DÉJÀ UTILISÉ</b>{res.ticket.name} · scanné le {hm(res.ticket.usedAt)}</>)}
              {res.status === "invalid" && (<><b>❌ BILLET INVALIDE</b>Ce code n’existe pas.</>)}
              {res.status === "nocam" && (<><b>Caméra indisponible</b>Autorisez la caméra ou saisissez le code.</>)}
              {res.status === "error" && (<><b>Erreur réseau</b>Réessayez.</>)}
            </div>
          )}
        </>
      )}

      {tab === "list" && (
        <>
          <div className="stats">
            <div><b>{tickets.length}</b>Vendus</div>
            <div><b>{used}</b>Entrés</div>
            <div><b>{fmt(total)}</b>Recette</div>
          </div>
          <div className="card">
            {tickets.length === 0 && <span style={{ color: "var(--mut)" }}>Aucun billet pour l’instant.</span>}
            {tickets.map((t) => (
              <div className="row" key={t.id}>
                <div>{t.name} · {fmt(t.price)} · {t.event.replace("Réveillon ", "")}{t.seller ? " · par " + t.seller : ""} · {t.id}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span className={"tag " + (t.usedAt ? "u" : "v")}>{t.usedAt ? "Entré" : "Valide"}</span>
                  {admin && <button onClick={() => removeTicket(t)} style={{ border: 0, background: "var(--ko)", color: "#fff", borderRadius: 6, padding: "4px 8px" }}>Supprimer</button>}
                </div>
              </div>
            ))}
          </div>
          {!admin && <button className="btn alt" onClick={becomeAdmin}>Mode administrateur</button>}
          <button className="btn alt" onClick={logout}>Se déconnecter</button>
        </>
      )}
    </main>
  );
}
