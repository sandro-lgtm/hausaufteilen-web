// Eigentümerwechsel-Lotse: Lastenwechsel-Abrechnung + Fristen. Portiert aus ideen-werkstatt/lastenwechsel.py (gleiche Prüfwerte in test.js).
// Daten als "JJJJ-MM-TT"-Strings, gerechnet in UTC, damit keine Zeitzone Tage verschiebt.
(function (g) {
  const D = (s) => { const [j, m, t] = s.split("-").map(Number); return new Date(Date.UTC(j, m - 1, t)); };
  const S = (d) => d.toISOString().slice(0, 10);
  const tageImMonat = (j, m) => new Date(Date.UTC(j, m + 1, 0)).getUTCDate(); // m 0-basiert
  const tageImJahr = (j) => (j % 4 === 0 && j % 100 !== 0) || j % 400 === 0 ? 366 : 365;
  const r2 = (x) => Math.round(x * 100) / 100;
  const monatsende = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), tageImMonat(d.getUTCFullYear(), d.getUTCMonth())));
  const plusTage = (d, n) => new Date(d.getTime() + n * 864e5);
  function plusMonate(d, n) {
    const m = d.getUTCMonth() + n, j = d.getUTCFullYear() + Math.floor(m / 12), mm = ((m % 12) + 12) % 12;
    return new Date(Date.UTC(j, mm, Math.min(d.getUTCDate(), tageImMonat(j, mm))));
  }

  // Anteile ab Besitzübergang (Übergangstag gehört dem Käufer). Positiver Saldo = Käufer zahlt an Verkäufer.
  // o.nkPeriode (vermietetes Haus, Käufer rechnet das laufende NK-Jahr ab, BGH VIII ZR 168/03 / übliche KV-Klausel):
  // Grundsteuer + Prämie laufen als umgelegte Kosten durch die NK-Auskehr (Vorauszahlungen seit Beginn des
  // Abrechnungsjahres minus belegte Kosten) – separat abgerechnet wären sie doppelt (Befund KV WEI4 Ziff. 5.11, 26.10.2026).
  function abrechnung(uebergang, miete, nkVz, grundsteuerJahr, versicherungJahr, o = {}) {
    const u = D(uebergang), j = u.getUTCFullYear(), tm = tageImMonat(j, u.getUTCMonth());
    const kTageMonat = tm - u.getUTCDate() + 1;
    const kTageJahr = Math.round((Date.UTC(j, 11, 31) - u.getTime()) / 864e5) + 1;
    const ty = tageImJahr(j);
    const p = !!o.nkPeriode;
    const mieteAnKaeufer = r2((miete + (p ? 0 : nkVz)) * kTageMonat / tm);
    const gstAnVerkaeufer = p ? 0 : r2(grundsteuerJahr * kTageJahr / ty);   // § 9, § 10 GrStG: Verkäufer schuldet das ganze Jahr
    const versAnVerkaeufer = p ? 0 : r2(versicherungJahr * kTageJahr / ty); // § 95 VVG: Vertrag geht über
    const nkAuskehr = p ? r2((o.vzSeitBeginn || 0) - (o.kostenBezahlt || 0)) : 0; // negativ = Käufer erstattet
    return { kTageMonat, tm, kTageJahr, ty, mieteAnKaeufer, gstAnVerkaeufer, versAnVerkaeufer, nkAuskehr,
      saldoKaeuferZahlt: r2(gstAnVerkaeufer + versAnVerkaeufer - mieteAnKaeufer - nkAuskehr) };
  }

  function fristen(grundbuch, kenntnisMieter, o = {}) {
    const gb = D(grundbuch), k = D(kenntnisMieter), f = {};
    // § 566c BGB: Zahlung an den Alten wirkt bis Ende des Kenntnismonats, nach dem 15. auch für den Folgemonat
    const ende = k.getUTCDate() <= 15 ? monatsende(k) : monatsende(plusMonate(new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), 1)), 1));
    f.mieteAnErwerberAb = S(plusTage(ende, 1));
    f.vermieterAb566 = S(gb);
    f.versicherungKuendigenBis96 = S(plusMonate(gb, 1));
    f.grundsteuerSchuldnerAb = S(new Date(Date.UTC(gb.getUTCFullYear() + 1, 0, 1)));
    // § 577a: Maßgeblich ist das Recht bei Zugang der Kündigung (BGH VIII ZR 247/24 Rn. 17 f.).
    // Endet die Landesverordnung vorher, greift danach nur noch die 3-Jahres-Frist (eigene Auslegung, Stand 09.11.2026).
    if (o.umwandlung) {
      let bis = plusMonate(gb, 12 * (o.sperrfristJahre || 3));
      if (o.sperrfristVoBis) {
        const nachVo = plusTage(D(o.sperrfristVoBis), 1), drei = plusMonate(gb, 36);
        if (nachVo < bis) bis = nachVo > drei ? nachVo : drei;
      }
      f.sperrfristBis577a = S(bis);
    }
    if (o.efhZfh) f.gegNachruestenBis = S(plusMonate(gb, 24));
    // NK-Abrechnung (BGH VIII ZR 168/03): Abrechnungsjahre, die bei Eintragung beendet waren, rechnet der Verkäufer ab,
    // das laufende der Käufer. Frist § 556 Abs. 3 S. 2 BGB: bis Ablauf des 12. Monats nach Ende des Abrechnungsjahres.
    const bm = (o.nkBeginnMonat || 1) - 1;
    const start = new Date(Date.UTC(gb.getUTCFullYear() - (gb.getUTCMonth() < bm ? 1 : 0), bm, 1));
    const nkEnde = plusTage(plusMonate(start, 12), -1), vorEnde = plusTage(start, -1);
    f.nkVerkaeufer = { bis: S(vorEnde), frist: S(monatsende(plusMonate(vorEnde, 12))) };
    f.nkKaeufer = { von: S(start), bis: S(nkEnde), frist: S(monatsende(plusMonate(nkEnde, 12))) };
    return f;
  }

  // § 577a Abs. 2: Jahre laut Landesverordnung, die am Stichtag gilt, sonst 3.
  function sperrfristJahre(land, gemeinde, stichtag, laender) {
    const gm = gemeinde.trim().toLowerCase();
    for (const z of laender) {
      if (z.land !== land || !z.jahre || z.jahre === 3 && !z.gemeinden.length) continue;
      if (z.von && stichtag < z.von || z.bis && stichtag > z.bis) continue;
      const liste = z.gemeinden.map((x) => x.toLowerCase());
      // "Frankfurt" soll "Frankfurt am Main" finden
      if (gm && liste.some((x) => x === gm || x.startsWith(gm + " ") || x.startsWith("gesamtes stadtgebiet")))
        return { jahre: z.jahre, vo: z.vo, bis: z.bis, quelle: z.quelle };
    }
    return { jahre: 3 };
  }

  const api = { abrechnung, fristen, sperrfristJahre };
  if (typeof module !== "undefined") module.exports = api; else g.Lotse = api;
})(this);
