// Wohnfläche nach WoFlV und was die richtige Fläche für Miete und Nebenkosten bedeutet.
// Regelwerk aus § 4 WoFlV und BGH-Rechtsprechung, keine Rechtsberatung. Offen: Balkon über 25 % nur mit Begründung (Lage, Nutzwert).
(function (g) {
  const r2 = (x) => Math.round(x * 100) / 100;

  // § 4 WoFlV: lichte Höhe ≥ 2 m voll, 1–2 m halb, < 1 m nichts; Balkon/Terrasse/Loggia i. d. R. 1/4 (höchstens 1/2);
  // unbeheizter Wintergarten halb. § 2 Abs. 3: Keller, Abstellraum außerhalb, Garage zählen nicht.
  const FAKTOR = { voll: 1, halb: 0.5, null: 0, balkon: 0.25, balkon50: 0.5, wintergarten: 0.5, keller: 0 };
  const flaeche = (teile) => r2(teile.reduce((s, t) => s + (+t.m2 || 0) * (FAKTOR[t.art] ?? 0), 0));

  // Abweichung in Prozent der Vertragsfläche. Ab mehr als 10 % weniger: Mangel, Minderung im gleichen Verhältnis (BGH VIII ZR 295/03).
  const abweichung = (vertrag, echt) => r2(((echt - vertrag) / vertrag) * 100);

  // § 558: maßgeblich ist die tatsächliche Fläche (BGH VIII ZR 266/14), die Kappungsgrenze gilt trotzdem.
  // Ergebnis: höchste zulässige Miete auf Basis Vertragsfläche vs. echter Fläche und der Unterschied je Monat.
  function mieterhoehung({ ist, vertrag, echt, msp, kappung = 0.15 }) {
    const grenze = (m2) => r2(Math.max(ist, Math.min(ist * (1 + kappung), msp * m2)));
    const alt = grenze(vertrag), neu = grenze(echt);
    return { alt, neu, mehr: r2(neu - alt) };
  }

  // Minderung für den Mieter: nur, wenn die echte Fläche mehr als 10 % unter der Vertragsfläche liegt.
  function minderung({ miete, vertrag, echt }) {
    const a = abweichung(vertrag, echt);
    return a < -10 ? r2((miete * -a) / 100) : 0;
  }

  const api = { FAKTOR, flaeche, abweichung, mieterhoehung, minderung };
  if (typeof module !== "undefined") module.exports = api; else g.Wohnflaeche = api;
})(this);
