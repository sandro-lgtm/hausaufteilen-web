// Kaufpreisaufteilung Boden/Gebäude nach § 6f EStG-E (BT-Drs. 21/8283, Regierungsentwurf JStG 2026, noch nicht beschlossen).
// Reine Rechnung, keine Steuerberatung. Formel aus der Gesetzesbegründung zu Abs. 2. Die BMF-Arbeitshilfe (Abs. 3) rechnet anders
// und kann mehr Boden ergeben. Sie wird hier nicht nachgebaut.
(function (g) {
  const r2 = (x) => Math.round(x * 100) / 100;

  const bodenwert = (grundstueck, meaZaehler, meaNenner, richtwert) => r2(grundstueck * meaZaehler / meaNenner * richtwert);

  // Gebäudewertanteil in %: 100 × (VfW − BW ± boG Gebäude) / (VfW ± boG Boden ± boG Gebäude), nie unter 0 (Abs. 2 letzter Hs.).
  function gebaeudeProzent(verfahrenswert, bw, boGBoden = 0, boGGebaeude = 0) {
    const nenner = verfahrenswert + boGBoden + boGGebaeude;
    if (nenner <= 0) return 0;
    return Math.max(0, 100 * (verfahrenswert - bw + boGGebaeude) / nenner);
  }

  function aufteilung(kaufpreis, prozent) {
    const gebaeude = r2(kaufpreis * prozent / 100);
    return { gebaeude, boden: r2(kaufpreis - gebaeude) };
  }

  // Orientierung, keine Rechtsregel: Der BFH nennt keine Prozentgrenze. < 10 %: FG München 12 K 861/19 hielt das für unbeachtlich.
  // ≥ 50 %: Größenordnung des BFH-Falls IX R 26/19 (20.000 € gegen 77.713 €). Dazwischen Einzelfall.
  function ampel(vertragBoden, sollBoden) {
    if (vertragBoden == null) return { farbe: "keine", abweichung: null };
    const abweichung = sollBoden > 0 ? (sollBoden - vertragBoden) / sollBoden : 0;
    if (abweichung < 0.1) return { farbe: "gruen", abweichung };
    return { farbe: abweichung < 0.5 ? "gelb" : "rot", abweichung };
  }

  const afaJahr = (gebaeude, satz) => r2(gebaeude * satz);

  const api = { bodenwert, gebaeudeProzent, aufteilung, ampel, afaJahr };
  if (typeof module !== "undefined") module.exports = api; else g.Kaufpreis6f = api;
})(this);
