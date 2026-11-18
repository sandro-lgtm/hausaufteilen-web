// Wohnungsweise: Rechner, Vergleichs-Schieber, cookiefreier Zähler, Anfrage an die Business-Radar-Warteliste.
const RADAR = "https://business-radar-0v2o.onrender.com";
const SITE = "wohnungsweise";

const VERTRIEB = 0.0952, MAKLER = 0.0357, ANTEIL = 0.5, DECKEL = 0.12, UST = 0.19;

// Reine Rechnung, exportiert für test.js. Alle Preise je m².
function rechne({ area, whole, wish, unit, prep }) {
  const ganzBrutto = area * whole, makler = ganzBrutto * MAKLER, ganzNetto = ganzBrutto - makler;
  const brutto = area * unit, vertrieb = brutto * VERTRIEB, aufteilung = area * prep;
  const netto = brutto - vertrieb - aufteilung, wunsch = area * wish;
  const mehrerloes = Math.max(0, netto - wunsch);
  const verguetung = Math.min(mehrerloes * ANTEIL, brutto * DECKEL) * (1 + UST);
  const eigentuemer = netto - verguetung;
  return { ganzBrutto, makler, ganzNetto, brutto, kosten: vertrieb + aufteilung, wunsch, verguetung, eigentuemer,
    differenz: eigentuemer - ganzNetto, unterWunsch: netto < wunsch };
}

// Marktwerte je Stadt (Gutachterausschuss 2026 + eigene Angebotsauswertung Dresden, n=58): Haus im Ganzen und ETW je m²
const STAEDTE = [
  { name: "Dresden", re: /^01[0-3]\d\d$/, ganz: 1750, von: 1600, bis: 1900, etw: 2650 },
];
// Leipzig (PLZ 04103–04357) bewusst ohne Marktwerte: kein belegter ETW-Wert Leipzig (18.11.2026); Rechner zeigt dann einen Hinweis statt Dresdner Zahlen
const LEIPZIG = /^04[0-3]\d\d$/;
const stadt = (plz) => STAEDTE.find((x) => x.re.test(plz)) || null;

// Hinweis, wenn Werte über dem Markt liegen (Sandro 04.10.2026: Leute setzen sonst zu hoch an)
function hinweis(st, whole, wish) {
  const b = st || STAEDTE[0];
  const band = `${b.von.toLocaleString("de-DE")}–${b.bis.toLocaleString("de-DE")} €/m²`;
  if (whole > b.bis) return `Ihr Preis im Ganzen liegt über dem, was vermietete Häuser in ${b.name} üblicherweise erzielen (${band}). Rechnen Sie lieber mit dem Marktwert – ihn prüfen wir im Erstcheck.`;
  if (wish > b.bis) return `Ihr Wunschpreis liegt über dem Marktwert im Ganzen (${band}). Das ist möglich, aber je höher er liegt, desto weniger Spielraum bleibt – im Zweifel lohnt sich das Aufteilen dann nicht.`;
  return "";
}
if (typeof module !== "undefined") module.exports = { rechne, stadt, hinweis, LEIPZIG };

if (typeof document !== "undefined") {
  const $ = (id) => document.getElementById(id);
  const eur = (v) => Math.round(v).toLocaleString("de-DE") + " €";
  const m2 = (v) => Math.round(v).toLocaleString("de-DE") + " €/m²";

  // Zähler (Beacon an business-radar /api/hit, wie kinderdepot-ratgeber.de)
  function hit(path) {
    if (location.hostname === "localhost" || location.protocol === "file:" || navigator.doNotTrack === "1") return;
    try {
      if (new URLSearchParams(location.search).get("nocount") === "1") localStorage.setItem("ww_nocount", "1");
      if (localStorage.getItem("ww_nocount") === "1") return;
    } catch {}
    // text/plain + no-cors: kein Preflight, der Server liest den Body trotzdem als JSON
    fetch(RADAR + "/api/hit", { method: "POST", mode: "no-cors", keepalive: true, headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ site: SITE, path, ref: document.referrer || undefined }) }).catch(() => {});
  }
  hit(location.pathname);
  window.hitEvent = (e) => hit(location.pathname + "#" + e); // Ereignisse aus Ratgeber-Werkzeugen

  // Vergleichs-Schieber (Technik wie wei4-investor-landing: Pointer-Drag, hier per clip-path)
  const ba = $("ba");
  if (ba) {
    const range = $("baRange");
    let drag = false;
    const set = (p) => { p = Math.max(3, Math.min(97, p)); ba.style.setProperty("--pos", p + "%"); range.value = Math.round(p); };
    const fromX = (x) => { const r = ba.getBoundingClientRect(); set(((x - r.left) / r.width) * 100); };
    ba.addEventListener("pointerdown", (e) => { drag = true; fromX(e.clientX); try { ba.setPointerCapture(e.pointerId); } catch {} });
    ba.addEventListener("pointermove", (e) => { if (drag) fromX(e.clientX); });
    ["pointerup", "pointercancel"].forEach((t) => ba.addEventListener(t, () => { drag = false; }));
    range.addEventListener("input", () => set(+range.value));
    set(50);
  }

  // Rechner
  // Sandro 04.10.2026: Vergütung und Wunschpreis vorerst nicht im Rechner – Erlös vor unserer Vergütung
  const ids = ["area", "whole", "unitp", "prep"];
  let used = false;
  function calc() {
    const v = { area: +$("area").value, whole: +$("whole").value, unit: +$("unitp").value, prep: +$("prep").value };
    v.wish = v.whole;
    $("areaO").textContent = v.area.toLocaleString("de-DE") + " m²";
    $("wholeO").textContent = m2(v.whole);
    $("unitpO").textContent = m2(v.unit); $("prepO").textContent = m2(v.prep);
    const r = rechne(v);
    const netto = r.brutto - r.kosten, diff = netto - r.ganzNetto;
    $("rWhole").textContent = eur(r.ganzNetto); $("rOwner").textContent = eur(netto);
    $("dGross").textContent = eur(r.brutto); $("dCost").textContent = "− " + eur(r.kosten);
    const pct = diff / r.ganzNetto;
    $("dAbs").textContent = (diff >= 0 ? "+" : "−") + eur(Math.abs(diff));
    $("dPct").textContent = "(" + (pct >= 0 ? "+" : "−") + Math.abs(pct * 100).toFixed(1).replace(".", ",") + " %)";
    $("delta").classList.toggle("neg", diff < 0);
    $("warn").hidden = diff > 0;
    const plzV = $("plz").value.trim(), h = LEIPZIG.test(plzV) ? "" : hinweis(stadt(plzV), v.whole, v.wish); // keine Dresdner Marktgrenzen auf Leipzig anwenden
    $("hint").textContent = h; $("hint").hidden = !h;
    const max = Math.max(r.brutto, r.ganzBrutto), w = (x) => Math.max(0, x / max * 100) + "%";
    $("sA1").style.width = w(r.ganzNetto); $("sA2").style.width = w(r.makler);
    $("sB1").style.width = w(netto); $("sB3").style.width = w(r.kosten);
  }
  if ($("calcForm")) {
    $("plz").addEventListener("input", () => {
      const plz = $("plz").value.replace(/\D/g, "").slice(0, 5); $("plz").value = plz;
      const st = stadt(plz);
      $("plzO").textContent = st ? st.name : (plz.length === 5 ? "nicht hinterlegt" : "");
      if (st) {
        $("whole").value = st.ganz; $("unitp").value = st.etw;
        $("wholeS").textContent = `${st.name}: vermietete Häuser im Ganzen meist ${st.von.toLocaleString("de-DE")}–${st.bis.toLocaleString("de-DE")} €/m².`;
      } else if (plz.length === 5) {
        $("wholeS").textContent = LEIPZIG.test(plz)
          ? "Leipzig: Für Leipzig haben wir noch keine eigene Preisauswertung hinterlegt – die Werte prüfen wir im Erstcheck."
          : "Diese Postleitzahl liegt nicht in Dresden oder Leipzig. Wir sind auf diese beiden Städte spezialisiert – die Werte bitte selbst prüfen.";
      }
      calc();
    });
    ids.forEach((id) => $(id).addEventListener("input", () => {
      if (!used) { used = true; hit("/#rechner-benutzt"); }
      calc();
    }));
    calc();
  }

  // Anfrage → business-radar /api/waitlist (speichert slug, email, utm-JSON)
  const form = $("askForm");
  if (form) form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("formMsg");
    if (!form.checkValidity()) { msg.className = "form-msg err"; msg.textContent = "Bitte füllen Sie alle Pflichtfelder aus und bestätigen Sie die Einwilligung."; form.reportValidity(); return; }
    const d = Object.fromEntries(new FormData(form));
    const utm = { quelle: "anfrage", ort: d.ort, wohnungen: d.wohnungen, flaeche_m2: d.flaeche, ueber_10_jahre: d.haltedauer, rolle: d.rolle, telefon: d.telefon || "",
      zusammenfassung: `${d.ort}, ${d.wohnungen} WE, ${d.flaeche} m², >10 J.: ${d.haltedauer}, ${d.rolle}${d.telefon ? ", Tel. " + d.telefon : ""}` };
    form.querySelector("button").disabled = true;
    try {
      const res = await fetch(RADAR + "/api/waitlist", { method: "POST", headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ slug: SITE, email: d.email, utm }) });
      if (!res.ok) throw new Error("HTTP " + res.status);
      msg.className = "form-msg ok"; msg.textContent = "Danke. Ihre Anfrage ist angekommen – wir melden uns per E-Mail.";
      form.reset(); hit("/#anfrage-gesendet");
    } catch {
      msg.className = "form-msg err"; msg.textContent = "Ihre Anfrage konnte nicht gesendet werden. Bitte schreiben Sie uns direkt an info@saguttarius.com.";
    } finally { form.querySelector("button").disabled = false; }
  });
}
