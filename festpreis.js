// Festpreis jetzt oder aufteilen lassen? Sicherer Betrag gegen wahrscheinliches Ergebnis (Anlass: Verwalter-Frage 11.11.2026).
// Modell: Kaufpreise der Wohnungen (nach Vertrieb) gehen an den Eigentümer; die Vergütung eines Dienstleisters ist nicht eingerechnet.
// Aufteilungskosten trägt der Eigentümer zu Beginn, Vertrieb geht vom Kaufpreis ab. Miete der unverkauften Wohnungen bleibt beim Eigentümer.
// Barwert: monatlich abgezinst mit der Rendite, die der Eigentümer sonst erzielen würde. Keine Steuer, keine Rechtsberatung.
(function (g) {
  // Szenarien: Preis wie angesetzt / −7,5 % und 1,5-fache Dauer / −15 % und doppelte Dauer (eigene Annahme, offen gelegt)
  const SZENARIEN = [
    { name: "wie geplant", preis: 1, dauer: 1 },
    { name: "zäher Verkauf", preis: 0.925, dauer: 1.5 },
    { name: "schlechter Markt", preis: 0.85, dauer: 2 },
  ];

  function aufteilen(e, s = SZENARIEN[0]) {
    const { flaeche, etw, kostenM2 = 0, vertrieb = 0.0952, start = 2, dauer = 9, zins = 0, miete = 0 } = e;
    const n = Math.max(1, Math.round(dauer * s.dauer)); // Verkaufsmonate
    const proMonat = (flaeche * etw * s.preis * (1 - vertrieb)) / n;
    const d = (t) => Math.pow(1 + zins, -t / 12);
    let nominal = -flaeche * kostenM2, barwert = nominal;
    for (let t = 1; t <= start + n; t++) {
      const verkauft = t <= start ? 0 : (t - start - 1) / n; // Anteil verkauft zu Monatsbeginn
      let z = miete * (1 - verkauft);
      if (t > start) z += proMonat;
      nominal += z; barwert += z * d(t);
    }
    return { nominal, barwert, monate: start + n };
  }

  // Festpreis: Zahlung nach `faellig` Monaten, bis dahin Miete.
  function festpreis({ preis, faellig = 2, zins = 0, miete = 0 }) {
    let barwert = 0;
    for (let t = 1; t <= faellig; t++) barwert += miete * Math.pow(1 + zins, -t / 12);
    return { nominal: preis + miete * faellig, barwert: barwert + preis * Math.pow(1 + zins, -faellig / 12) };
  }

  // Ab welchem Wohnungspreis (€/m²) bringt das Szenario mindestens so viel Barwert wie der Festpreis?
  function gleichstand(e, f, s = SZENARIEN[1]) {
    const ziel = festpreis({ ...f, zins: e.zins, miete: e.miete }).barwert;
    let lo = 0, hi = 20000;
    if (aufteilen({ ...e, etw: hi }, s).barwert < ziel) return null;
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; aufteilen({ ...e, etw: m }, s).barwert < ziel ? (lo = m) : (hi = m); }
    return Math.round(hi);
  }

  const api = { SZENARIEN, aufteilen, festpreis, gleichstand };
  if (typeof module !== "undefined") module.exports = api; else g.Festpreis = api;
})(this);
