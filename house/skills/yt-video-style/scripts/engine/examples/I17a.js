L.scene();
// one M shot (head centred) — "poder bloquear el precio y ganar dinero. Pero no es lo que te quiero contar en el vídeo de hoy." (future video → no card)
L.big({
  text: "bloquear",
  t: L.at("bloquear") - 0.03,
  out: L.at("ganar") - 0.06,
  size: 290,
  sfx: "click",
  line: L.say("poder", "poder"),
});
L.big({
  text: "ganar dinero",
  t: L.at("ganar") - 0.03,
  out: L.at("pero") + 0.5,
  size: 240,
  keep: true,
  sfx: "swoosh",
});
