// Energieausweis: Pflicht und Ausweisart vor und ab 01.01.2027 (GModG, BGBl. 2026 I Nr. 226, Art. 2 Nr. 31/32, Art. 9 Abs. 2).
// Regelwerk aus dem Gesetzeswortlaut, keine Rechtsberatung. Offen: wann ein Haus mit kleinem Laden noch „ausschließlich Wohnzwecken“ dient (§ 82 Abs. 1 neu).
(function (g) {
  // § 79 Abs. 4 alt: Baudenkmal von § 80 Abs. 3–7 befreit, ab 2027 gestrichen. § 80 Abs. 3 neu: auch Verlängerung löst die Pflicht aus.
  function pflicht({ anlass, ab2027, gueltig, denkmal }) {
    if (anlass === "keiner" || gueltig) return false;
    if (ab2027) return true;
    return !denkmal && anlass !== "verlaengerung";
  }

  // § 80 Abs. 3 Satz 2–3 GEG (bis 31.12.2026): unter 5 Wohnungen, Bauantrag vor 01.11.1977, WSchV 1977 nicht erreicht → nur Bedarf.
  const artAlt = ({ nutzung, wohnungen, vor1977, wschv77 }) =>
    nutzung === "wohnen" && wohnungen < 5 && vor1977 && !wschv77 ? "bedarf" : "wahl";

  // § 82 Abs. 1 neu: Verbrauch nur bei „ausschließlich Wohnzwecken“; § 80 Abs. 3 Satz 2 neu: Nichtwohngebäude → Bilanzierung.
  const artNeu = ({ nutzung }) => (nutzung === "wohnen" ? "wahl" : "bedarf");

  function empfehlung(e) {
    const alt = artAlt(e), neu = artNeu(e);
    if (e.gueltig) return "reicht";
    if (alt === "wahl" && neu === "bedarf") return "jetzt";
    if (alt === "bedarf" && neu === "wahl") return !e.ab2027 && pflicht(e) ? "bedarf-jetzt" : "warten";
    return "egal";
  }

  const api = { pflicht, artAlt, artNeu, empfehlung };
  if (typeof module !== "undefined") module.exports = api; else g.Energieausweis = api;
})(this);
