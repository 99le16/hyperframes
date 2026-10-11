L.scene();
L.big({
  text: "problema",
  t: L.at("problema") - 0.03,
  out: 1.38,
  size: 300,
  line: L.say("pero", "un"),
});
L.big({
  text: "dinero",
  t: L.at("dinero") - 0.03,
  size: 320,
  line: L.say("probablemente", "mueve").slice(-8),
});
L.words({ words: L.say("en", "planeta"), x: 520, y: 640, size: 58 });
