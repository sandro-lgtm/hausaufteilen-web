// Mieterwunsch gegen Mieterhöhung (§ 557 Abs. 1 BGB): Vermieter zahlt die Maßnahme, Mieter zahlt sie über einen
// vereinbarten Aufschlag zurück. Reine Rechnung, keine Rechtsberatung. Kern aus ideen-werkstatt/gegenleistung (29.10.2026),
// korrigiert 31.10.2026: einvernehmliche Erhöhung wegen Modernisierung bis zur Höhe des § 559 startet die Fristen des § 558
// NICHT neu und zählt nicht zur Kappungsgrenze (BGH VIII ZR 285/06, VIII ZR 287/06).
(function (g) {
  const r2 = (x) => Math.round(x * 100) / 100;

  // Monatlicher Aufschlag, der die Kosten in `jahre` Jahren zum Jahreszins `zins` zurückzahlt (Annuität).
  function aufschlag(kosten, jahre, zins = 0) {
    const n = jahre * 12, r = zins / 12;
    return r2(r === 0 ? kosten / n : kosten * r / (1 - Math.pow(1 + r, -n)));
  }

  // § 5 WiStG: mehr als 20 % über der ortsüblichen Vergleichsmiete ist insoweit unwirksam, auch bei Vereinbarung.
  // Vorsichtige Lesart: Merkmal „geringes Angebot“ wird nicht geprüft.
  function maxWiStG(kaltmiete, flaeche, vergleichsmiete) {
    return r2(Math.max(0, 1.2 * vergleichsmiete * flaeche - kaltmiete));
  }

  // Was § 559 einseitig erlaubt hätte: 8 % der Kosten ohne Erhaltungsanteil je Jahr, gedeckelt auf 3 €/m²
  // (2 €/m² bei Miete unter 7 €/m²) in sechs Jahren (§ 559 Abs. 1, 2, 3a). Frühere § 559-Erhöhungen bleiben außen vor.
  function max559(kosten, erhaltungsanteil, kaltmiete, flaeche) {
    const deckel = (kaltmiete / flaeche < 7 ? 2 : 3) * flaeche;
    return r2(Math.min(kosten * (1 - erhaltungsanteil) * 0.08 / 12, deckel));
  }

  const plusMonate = (s, n) => {
    const [j, m, t] = s.split("-").map(Number), d = new Date(Date.UTC(j, m - 1 + n, t));
    return d.toISOString().slice(0, 10);
  };

  // Folge für die nächste Erhöhung nach § 558. Fristfrei nur bei Modernisierung UND Aufschlag ≤ § 559-Betrag;
  // darüber ist die Rechtslage nicht geklärt → vorsichtig: Frist startet neu, Erhöhung zählt zur Kappungsgrenze.
  function folge558(wirksamAb, { modernisierung = false, monatsAufschlag = 0, grenze559 = 0 } = {}) {
    if (modernisierung && monatsAufschlag <= grenze559 + 0.005) return { fristNeu: false };
    return { fristNeu: true, verlangenAb: plusMonate(wirksamAb, 12), wirksamAb: plusMonate(wirksamAb, 15) };
  }

  const api = { aufschlag, maxWiStG, max559, folge558 };
  if (typeof module !== "undefined") module.exports = api; else g.Gegenleistung = api;
})(this);
