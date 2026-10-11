/* oxlint-disable */ // house/: example and engine code kept as shipped in production
// Tanda 10 modules (hooks / bodies / CTA), each written in its own piece-local time (0 = first frame of the piece).
// A reel = list of pieces; reel.js sets E.setOff(piece.t0) before calling M[id]().
(function () {
  const E = window.E,
    D = E.D;
  const { L, F, W, H, tl, el, px, cue, behind, front, txt, line, stroke, cutout, matte } = E;
  const {
    Y,
    cam,
    big,
    side,
    clockBeat,
    navyList,
    paper,
    phone,
    question,
    offerWall,
    OFFICE,
    ws,
    cover,
  } = D;
  const t = (w, after = 0) => E.at(w, after);
  const te = (w, after = 0) => E.at(w, after, "e");
  const REMOTE = (t0) => ({
    src: "cuts/remote.png",
    t: t0,
    V: { x: 300, y: 1010, w: 480 },
    S: { x: 410, y: 520, w: 270 },
    H: { x: 830, y: 520, w: 290 },
  });
  const LBL = (a, b) => [
    [a, "100% remoto", { V: [150, 1000], S: [200, 540], H: [600, 540] }],
    [b, "tu horario", { V: [780, 1060], S: [700, 580], H: [1150, 580] }],
  ];
  const PROP = (src, tt, V, S, H, extra) =>
    Object.assign({ src: `cuts/${src}.png`, t: tt, V, S, H }, extra || {});
  const arrowDown = (tt, out) =>
    stroke(front, {
      t: tt,
      dur: 0.3,
      out,
      color: Y,
      w: 12,
      lift: false,
      d: L(
        "M 900 1420 C 940 1560, 930 1680, 880 1800 M 880 1800 L 850 1730 M 880 1800 L 935 1745",
        "M 930 700 C 960 800, 955 900, 920 1000 M 920 1000 L 893 940 M 920 1000 L 965 955",
        "M 1660 640 C 1700 760, 1695 880, 1660 1000 M 1660 1000 L 1632 940 M 1660 1000 L 1705 955",
      ),
    });
  const M = (window.M = {});

  // ════════════════ AD3 EU — hooks A / C (B is the delivered v6) ════════════════
  M.EU3_HA = (P) => {
    // "No necesitas estudiar cuatro años para conseguir un trabajo con estas condiciones: trabajo 100% en remoto, un sueldo de más de 3.000 € al mes y con el horario que tú elijas."
    cam(0, 1.0);
    big({
      t: 0.04,
      out: t("cuatro"),
      text: "No necesitas",
      small: "estudiar",
      side: "below",
      smallAfter: 0,
    });
    cam(t("cuatro"), 1.15);
    big({ t: t("cuatro"), out: t("para"), text: "4 años", sfx: "click", coverTo: te("años") });
    cam(t("para"), 1.02);
    const p0 = t("Trabajo");
    paper({
      t0: p0,
      t1: P.dur,
      clip: "unfold_remote",
      pre: ["Trabajo 100% en"],
      bigw: { text: "remoto", t: t("remoto", p0) },
      post: [
        "un sueldo de más de",
        { hl: "+3.000 €/MES", at: t("3.000", p0) },
        "al mes y con el horario",
        "que tú elijas.",
      ],
      person: REMOTE(p0 + 1.3),
      labels: LBL(p0 + 1.7, t("horario", p0)),
    });
  };
  M.EU3_HC = (P) => {
    // "Si has estudiado una carrera o cualquier grado, acceder a estas condiciones de trabajo te va a resultar mucho más sencillo de lo que piensas. Hablo de trabajo 100% en remoto, sueldos de más de 3.000 € al mes y flexibilidad completa en tu horario."
    cam(0, 1.0);
    big({
      t: t("carrera"),
      out: t("acceder"),
      text: "carrera",
      small: "Si has estudiado una",
      smallAfter: 0,
    });
    cam(t("acceder"), 1.12);
    cam(t("mucho"), 1.22);
    big({
      t: t("más"),
      out: t("Hablo"),
      text: "más sencillo",
      sfx: "click",
      coverTo: te("sencillo"),
    });
    const p0 = t("Hablo");
    paper({
      t0: p0,
      t1: P.dur,
      clip: "unfold_remote",
      pre: ["Hablo de trabajo 100% en"],
      bigw: { text: "remoto", t: t("remoto", p0) },
      post: [
        "sueldos de más de",
        { hl: "+3.000 €/MES", at: t("3.000", p0) },
        "al mes y flexibilidad",
        "completa en tu horario.",
      ],
      person: REMOTE(p0 + 1.3),
      labels: LBL(p0 + 1.7, t("horario", p0)),
    });
  };

  // ════════════════ AD1 EU — hooks ════════════════
  M.AD1EU_HA = (P) => {
    // "Hay cientos de ofertas de trabajo ahora mismo, pagando más de 3.000 € al mes con teletrabajo y flexibilidad total, pero casi nadie sabe lo sencillo que es acceder a ellas."
    cam(0, 1.0);
    big({
      t: t("cientos"),
      out: t("pagando"),
      text: "cientos",
      small: "Hay",
      smallAfter: 0,
      coverTo: te("cientos"),
    });
    const p0 = t("pagando");
    paper({
      t0: p0,
      t1: t("pero"),
      clip: "unfold_remote",
      pre: ["pagando más de"],
      bigw: { text: "3.000 €", t: t("3.000€", p0) },
      post: [
        "al mes con",
        { hl: "TELETRABAJO", at: t("teletrabajo", p0) },
        "y flexibilidad total,",
      ],
      person: REMOTE(p0 + 1.3),
      props: [
        PROP(
          "euros",
          t("3.000€", p0),
          { x: 690, y: 1230, w: 300 },
          { x: 740, y: 780, w: 220 },
          { x: 1220, y: 760, w: 240 },
          { rot: 12 },
        ),
      ],
    });
    cam(t("pero"), 1.12);
    big({
      t: t("casi"),
      out: t("sabe"),
      text: "casi nadie",
      small: "pero",
      smallAfter: t("pero") - 0.1,
      coverTo: te("nadie"),
    });
    side({ t: t("sencillo"), out: P.dur, text: "sencillo", sfx: "click" });
  };
  M.AD1EU_HB = (P) => {
    // selfie: "Estas son las condiciones de trabajo que podrías tener si haces lo que te voy a contar ahora. Un sueldo por encima de la media, teletrabajando desde tu casa o desde donde tú quieras, y con la tranquilidad de estar en una profesión con la que tienes un 100% de empleabilidad."
    cam(0, 1.0);
    big({
      t: t("condiciones"),
      out: t("si"),
      text: "condiciones",
      small: "Estas son las",
      smallAfter: 0,
      coverTo: te("condiciones"),
    });
    cam(t("si"), 1.15);
    const p0 = t("Un");
    paper({
      t0: p0,
      t1: t("y", p0),
      clip: "unfold_remote",
      pre: ["Un sueldo por encima", "de la media,"],
      bigw: { text: "teletrabajando", t: t("teletrabajando", p0) },
      post: ["desde tu casa o desde", { hl: "DONDE TÚ QUIERAS", at: t("donde", p0) }],
      person: REMOTE(p0 + 1.3),
      labels: LBL(p0 + 1.7, t("quieras,", p0)),
    });
    cam(t("y", p0), 1.0);
    cam(t("un", p0 + 6), 1.15);
    big({
      t: t("100%"),
      out: P.dur,
      text: "100%",
      small: "de empleabilidad.",
      smallAfter: t("100%"),
      side: "below",
      sfx: "click",
    });
  };
  M.AD1EU_HC = (P) => {
    // standing, grey screen: "Mira estas ofertas. Cientos de empresas en Europa están buscando desesperadamente perfiles para este puesto y no lo encuentran. Y por eso estas son las condiciones que ofrecen. Trabajo remoto, salarios mucho más altos que la media y flexibilidad horaria."
    cam(0, 1.0);
    offerWall({
      t0: 0,
      t1: t("Cientos"),
      cards: [
        { t: 0.05, title: "Oferta de empleo", salary: "+3.000 €/mes", chips: ["Remoto", "Europa"] },
        {
          t: t("estas"),
          title: "Se busca perfil",
          salary: "Jornada flexible",
          chips: ["Teletrabajo", "Indefinido"],
        },
        {
          t: t("ofertas."),
          title: "Vacante urgente",
          salary: "Sin cubrir",
          chips: ["Europa", "Remoto"],
        },
      ],
    });
    cam(t("Cientos"), 1.12);
    big({
      t: t("Cientos"),
      out: t("desesperadamente"),
      text: "cientos",
      small: "de empresas en Europa",
      smallAfter: t("Cientos"),
      side: "below",
    });
    cam(t("desesperadamente"), 1.22);
    big({
      t: t("desesperadamente"),
      out: t("para"),
      text: "desesperadamente",
      sfx: "click",
      coverTo: te("desesperadamente"),
    });
    cam(t("para"), 1.02);
    const p0 = t("Y", 7);
    paper({
      t0: p0,
      t1: P.dur,
      clip: "unfold_remote",
      pre: ["Y por eso estas son las"],
      bigw: { text: "condiciones", t: t("condiciones", p0) },
      post: [
        "que ofrecen. Trabajo remoto,",
        "salarios mucho más altos",
        "que la media y",
        { hl: "FLEXIBILIDAD HORARIA", at: t("flexibilidad", p0) },
      ],
      person: REMOTE(p0 + 1.3),
      props: [
        PROP(
          "euros",
          t("salarios", p0),
          { x: 690, y: 1230, w: 300 },
          { x: 740, y: 780, w: 220 },
          { x: 1220, y: 760, w: 240 },
          { rot: 12 },
        ),
      ],
    });
  };

  // ════════════════ AD1 EU — body ════════════════
  M.AD1EU_B1 = (P) => {
    // desk: "Esta profesión la puedes aprender sin necesidad de tirarte años estudiando, sin dejar tu trabajo actual y en menos de un año. De hecho, lo único que te hace falta es tener claro que tu empleo actual no es donde quieres pasar el resto de tu vida."
    cam(0, 1.0);
    big({
      t: t("aprender"),
      out: t("sin"),
      text: "aprender",
      small: "Esta profesión la puedes",
      smallAfter: 0,
    });
    side({
      t: t("tirarte"),
      out: t("sin", 4),
      text: "años<br>estudiando",
      small: "sin necesidad de",
      smallAfter: t("sin") - 0.05,
      coverTo: te("estudiando,"),
    });
    cam(t("sin", 4), 1.16);
    big({
      t: t("trabajo"),
      out: t("y", 5),
      text: "tu trabajo",
      small: "sin dejar",
      smallAfter: t("sin", 4) - 0.05,
      coverTo: te("actual"),
    });
    cam(t("y", 5), 1.0);
    clockBeat({
      t: t("y", 5),
      out: t("De"),
      pre: "y en menos de",
      preAfter: t("y", 5) - 0.05,
      num: "1",
      tNum: t("un", 6),
      unit: "año",
      tUnit: t("año."),
    });
    const p0 = t("De");
    paper({
      t0: p0,
      t1: P.dur,
      clip: "tear_office",
      pre: ["De hecho, lo único", "que te hace falta es"],
      bigw: { text: "tener claro", t: t("tener", p0) },
      post: [
        "que tu empleo actual",
        "no es donde quieres pasar",
        { hl: "EL RESTO DE TU VIDA", at: t("el", p0 + 4) },
      ],
      group: Object.assign({ t: t("empleo", p0), tLab: t("quieres", p0) }, OFFICE, {
        people: OFFICE.people.map((q, i) =>
          q.concat([["otro lunes", "mismo sueldo", "sin crecer", "¿toda la vida?"][i]]),
        ),
      }),
    });
  };
  M.AD1EU_B2 = (P) => {
    // desk: "Si no se te pone la piel de gallina al pensar en repetir exactamente el mismo día hasta tu jubilación, pasa este vídeo. Pero si valoras decidir tu horario y no te asusta el cambio, tengas la edad que tengas, esto es para ti."
    cam(0, 1.0);
    big({
      t: t("piel"),
      out: t("al"),
      text: "piel de gallina",
      small: "Si no se te pone la",
      smallAfter: 0,
      coverTo: te("gallina"),
    });
    cam(t("al"), 1.14);
    big({
      t: t("mismo"),
      out: t("hasta"),
      text: "el mismo día",
      small: "repetir exactamente",
      smallAfter: t("repetir") - 0.05,
      coverTo: te("día"),
    });
    cam(t("hasta"), 1.26);
    big({
      t: t("jubilación,"),
      out: t("pasa"),
      text: "jubilación",
      small: "hasta tu",
      smallAfter: t("hasta") - 0.05,
      sfx: "click",
    });
    side({
      t: t("pasa"),
      out: t("Pero"),
      text: "pasa este<br>vídeo",
      dir: -1,
      coverTo: te("vídeo."),
    });
    navyList({
      t0: t("Pero"),
      t1: t("esto", 10),
      title: [[{ t: "Pero si", at: t("Pero") + 0.05 }]],
      items: [
        { t: t("valoras"), text: "Valoras decidir<br>tu horario", prop: "stopwatch", mark: "ok" },
        { t: t("no", 8.8), text: "No te asusta<br>el cambio", prop: "ladder", mark: "ok" },
        { t: t("tengas"), text: "Tengas la edad<br>que tengas", prop: "cake", mark: "ok" },
      ],
    });
    cam(t("esto", 10), 1.12);
    big({
      t: t("para", 11),
      out: P.dur,
      text: "para ti",
      small: "esto es",
      smallAfter: t("esto", 10) - 0.05,
      sfx: "click",
    });
  };

  // ════════════════ shared CTA (AD2 EU/LATAM unified, sofá) ════════════════
  M.AD2_CTA = (P) => {
    // "Te he grabado un vídeo de 15 minutos donde te cuento cómo se consigue esto paso a paso sin necesidad de carrera universitaria ni de experiencia previa. Haz clic aquí abajo, déjame tu correo y míralo ahora."
    const end = t("Haz");
    phone({
      t0: 0,
      t1: end,
      camAt: t("vídeo"),
      screen: "¿cómo se<br>consigue?",
      titles: [
        [
          0,
          t("donde"),
          [[{ t: "Te he grabado un vídeo", at: 0.02 }], [{ hl: "DE 15 MINUTOS", at: t("15") }]],
        ],
        [
          t("donde"),
          t("esto"),
          [[{ t: "donde te cuento", at: t("donde") }], [{ hl: "CÓMO SE CONSIGUE", at: t("cómo") }]],
        ],
        [
          t("esto"),
          t("sin"),
          [[{ t: "esto", at: t("esto") }], [{ hl: "PASO A PASO", at: t("paso") }]],
        ],
        [
          t("sin"),
          t("ni"),
          [
            [{ t: "sin necesidad de", at: t("sin") }],
            [{ hl: "CARRERA UNIVERSITARIA", at: t("carrera") }],
          ],
        ],
        [
          t("ni"),
          end,
          [[{ t: "ni de", at: t("ni") }], [{ hl: "EXPERIENCIA PREVIA", at: t("experiencia") }]],
        ],
      ],
      props: [
        {
          src: "cuts/clapper.png",
          t: t("vídeo"),
          V: { x: 70, y: 820, w: 250, rot: -12 },
          S: { x: 90, y: 420, w: 180, rot: -12 },
          H: { x: 1010, y: 560, w: 200, rot: -12 },
        },
        {
          src: "cuts/stopwatch.png",
          t: t("15"),
          V: { x: 735, y: 760, w: 250, rot: 12 },
          S: { x: 790, y: 330, w: 180, rot: 12 },
          H: { x: 1660, y: 300, w: 200, rot: 12 },
        },
      ],
    });
    cam(end, 1.0);
    big({
      t: t("aquí"),
      out: t("déjame"),
      text: "aquí abajo",
      small: "Haz clic",
      smallAfter: end - 0.05,
      coverTo: te("abajo,"),
    });
    arrowDown(t("aquí") + 0.06, P.dur);
    cam(t("déjame"), 1.16);
    big({ t: t("míralo"), out: P.dur, text: "míralo ahora", sfx: "click" });
  };

  // ════════════════ AD4 VA — question-box hooks (sofá) ════════════════
  const qHook = (P, parts, bigs) => {
    cam(0, 1.0);
    parts.forEach(([a, b, q], i) => {
      question({ t0: a, t1: b, q, after: a - 0.05, header: "Tu pregunta" });
      if (i) cam(a, [1.0, 1.12, 1.04][i % 3]);
    });
    bigs.forEach((o) => big(o));
  };
  M.AD4_HA = (P) =>
    qHook(
      P,
      [
        [
          0,
          t("¿Es"),
          "Veo gente trabajando desde casa mientras yo pierdo unas 10 horas al día entre jornada y trayecto.",
        ],
        [t("¿Es"), t("desde", 8), "¿Es posible conseguir un trabajo en remoto empezando"],
      ],
      [
        { t: t("10"), out: t("entre"), text: "10 horas", sfx: "click" },
        { t: t("desde", 8), out: P.dur, text: "desde cero", sfx: "click", coverTo: P.dur },
      ],
    );
  M.AD4_HB = (P) =>
    qHook(
      P,
      [
        [0, t("pero"), "Siempre me ha llamado la atención trabajar desde mi casa o viajando,"],
        [
          t("pero"),
          t("¿Existe"),
          "pero siento que no tengo ni el tiempo ni los conocimientos para poder empezar.",
        ],
        [t("¿Existe"), t("desde", 9), "¿Existe alguna profesión que me permita hacerlo"],
      ],
      [
        { t: t("tiempo"), out: t("ni", 5.2), text: "ni tiempo" },
        { t: t("conocimientos"), out: t("para", 6), text: "ni conocimientos" },
        { t: t("desde", 9), out: P.dur, text: "desde cero", sfx: "click", coverTo: P.dur },
      ],
    );
  M.AD4_HC = (P) =>
    qHook(
      P,
      [
        [
          0,
          t("simplemente"),
          "Busco una forma de trabajar en remoto pero no quiero meterme en cosas raras,",
        ],
        [
          t("simplemente"),
          t("¿Hay"),
          "simplemente un trabajo que me dé estabilidad y más tiempo para mi familia.",
        ],
        [t("¿Hay"), t("desde", 8.8), "¿Hay alguna posibilidad si parto absolutamente"],
      ],
      [
        { t: t("estabilidad"), out: t("y", 5.5), text: "estabilidad" },
        { t: t("familia."), out: t("¿Hay"), text: "familia" },
        { t: t("desde", 8.8), out: P.dur, text: "desde cero", sfx: "click", coverTo: P.dur },
      ],
    );

  // ════════════════ AD4 VA — body (EU €, LATAM $) ════════════════
  const ad4Body = (P, cur) => {
    const eu = cur === "eu";
    cam(0, 1.0);
    big({
      t: t("sí"),
      out: t("antes"),
      text: "sí rotundo",
      small: "Mi respuesta aquí es un",
      smallAfter: 0,
      sfx: "click",
      coverTo: te("rotundo") + 0.1,
    });
    navyList({
      t0: t("antes") - 0.1,
      t1: t("En", 9),
      title: [
        [{ t: "Antes de meterte en", at: t("antes") }],
        [{ t: "te recomiendo:", at: t("recomiendo") }],
      ],
      items: [
        { t: t("marketing,"), text: "Marketing", prop: "megaphone", mark: "x" },
        { t: t("ventas"), text: "Ventas", prop: "register", mark: "x" },
        { t: t("montar"), text: "Montar un<br>negocio", prop: "shop", mark: "x" },
        {
          t: t("trabajo", 7),
          text: "Un trabajo en<br>el sector<br><b>tecnológico</b>",
          prop: "laptop",
          mark: "ok",
        },
      ],
    });
    cam(t("En", 9), 1.0);
    big({
      t: t("teletrabajar"),
      out: t("desde", 10),
      text: "teletrabajar",
      small: "En él vas a poder",
      smallAfter: t("En", 9) - 0.05,
    });
    cam(t("desde", 10), 1.2);
    big({ t: t("desde", 10), out: t("los", 12), text: "desde casa", coverTo: te("casa,") });
    const p0 = t("los", 12);
    paper({
      t0: p0,
      t1: t("Esto", 18),
      clip: "unfold_remote",
      pre: ["los sueldos rondan", "aproximadamente los"],
      bigw: { text: eu ? "3.000 €" : "2.000 $", t: t(eu ? "3.000" : "2.000", p0), sfx: "click" },
      post: [
        eu ? "euros al mes y la demanda" : "dólares y la demanda",
        "es tan alta que nunca",
        { hl: "TE VA A FALTAR EL EMPLEO", at: t("va", p0 + 3) },
      ],
      person: REMOTE(p0 + 1.3),
      props: [
        PROP(
          eu ? "euros" : "dollars",
          t(eu ? "3.000" : "2.000", p0),
          { x: 690, y: 1230, w: 300 },
          { x: 740, y: 780, w: 220 },
          { x: 1220, y: 760, w: 240 },
          { rot: 12 },
        ),
      ],
    });
    const e0 = t("Esto", 18);
    cam(e0, 1.0);
    side({
      t: t("reservado"),
      out: t("para", e0),
      text: "reservado",
      small: "Esto antes estaba",
      smallAfter: e0 - 0.05,
      coverTo: te("reservado"),
    });
    cam(t("para", e0), 1.14);
    big({
      t: t("título,"),
      out: t("pero", e0 + 2),
      text: "título",
      small: eu ? "para gente que tuviera un" : "para gente con",
      smallAfter: t("para", e0) - 0.05,
      sfx: "click",
    });
    cam(t("pero", e0 + 2), 1.0);
    clockBeat({
      t: t("pero", e0 + 2),
      out: t("tan", e0 + 4),
      pre: "en menos de",
      preAfter: t("acceder", e0),
      num: "1",
      tNum: t("un", t("menos", e0)),
      unit: "año",
      tUnit: t("año", t("menos", e0)),
    });
    cam(t("tan", e0 + 4), 1.16);
    big({
      t: t("paso", e0 + 4),
      out: P.dur,
      text: "paso a paso",
      small: eu ? "si tan solo sigue un" : "tan solo siguiendo un",
      smallAfter: t("año", t("menos", e0)) + 0.05,
      sfx: "click",
      coverTo: te("paso", t("a", t("paso", e0 + 4))),
    });
  };
  M.AD4_BEU = (P) => ad4Body(P, "eu");
  M.AD4_BLA = (P) => ad4Body(P, "la");

  // ════════════════ AD1 LATAM ════════════════
  M.AD1LA_H = (P) => {
    // "Una de cada tres personas en Latinoamérica emigra para buscar un mejor futuro. Las otras dos deciden quedarse con los suyos, aunque eso conlleve renunciar a su crecimiento."
    cam(0, 1.0);
    big({
      t: 0.04,
      out: t("emigra"),
      text: "1 de cada 3",
      small: "personas en Latinoamérica",
      smallAfter: t("personas") - 0.05,
      side: "below",
      sfx: "click",
    });
    const p0 = t("emigra");
    const s = paper({
      t0: p0,
      t1: t("aunque"),
      bigw: { text: "emigra", t: p0 + 0.02 },
      post: [
        "para buscar un mejor futuro.",
        "Las otras dos deciden",
        { hl: "QUEDARSE CON LOS SUYOS", at: t("quedarse", p0) },
      ],
      props: [
        PROP(
          "plane",
          p0 + 0.25,
          { x: 620, y: 600, w: 420 },
          { x: 700, y: 360, w: 300 },
          { x: 1380, y: 330, w: 420 },
          { anim: "pop", shadow: false },
        ),
      ],
    });
    const gp = L(
      { k: 0.62, x: 60, y: 1210 },
      { k: 0.38, x: 140, y: 690 },
      { k: 0.4, x: 520, y: 660 },
    );
    const pair = cutout(s, {
      src: "cuts/la_pair.png",
      t: t("Las", p0),
      x: gp.x,
      y: gp.y,
      w: 522 * gp.k * 1.2,
      outline: Y,
      ow: L(6, 4, 4),
      anim: "drop",
      z: 3,
    });
    const go = cutout(s, {
      src: "cuts/la_go.png",
      t: p0 + 0.5,
      x: gp.x + 522 * gp.k * 1.25,
      y: gp.y + 20 * gp.k,
      w: 524 * gp.k * 1.2,
      outline: Y,
      ow: L(6, 4, 4),
      anim: "drop",
      z: 3,
    });
    tl.to(go, { x: L(260, 160, 260), duration: 2.2, ease: "power1.in" }, t("Las", p0) + 0.3);
    const lab = (tt, text, x, y) =>
      txt(s, {
        t: tt,
        text,
        x,
        y,
        cls: "lbl",
        size: 30,
        color: "#1a1a1a",
        css: {
          fontSize: L("30px", "22px", "24px"),
          background: "#fff",
          padding: "2px 8px",
          zIndex: 6,
        },
      });
    lab(p0 + 0.6, "se va", gp.x + 522 * gp.k * 1.6, gp.y - L(40, 30, 30));
    lab(t("quedarse", p0), "se quedan", gp.x + 522 * gp.k * 0.25, gp.y - L(40, 30, 30));
    cam(t("aunque"), 1.12);
    big({
      t: t("renunciar"),
      out: t("su"),
      text: "renunciar",
      small: "aunque eso conlleve",
      smallAfter: t("aunque") - 0.05,
    });
    cam(t("su"), 1.24);
    big({
      t: t("crecimiento."),
      out: P.dur,
      text: "crecimiento",
      small: "a su",
      smallAfter: t("a", t("renunciar")),
      sfx: "click",
    });
  };
  M.AD1LA_B = (P) => {
    // "Pero hay un pequeño grupo de gente que decide quedarse en su país gracias a una profesión que les permite trabajar en remoto para empresas extranjeras, ganando más de 2.000 dólares al mes y con la libertad de horarios que siempre han querido. Se trata de una profesión tecnológica que puedes aprender sin salir de tu país, sin pisar la universidad y sin dejar tu trabajo actual mientras te formas para ella."
    cam(0, 1.0);
    big({
      t: t("pequeño"),
      out: t("decide"),
      text: "pequeño grupo",
      small: "Pero hay un",
      smallAfter: 0,
      coverTo: te("grupo"),
    });
    cam(t("decide"), 1.2);
    big({
      t: t("quedarse"),
      out: t("gracias"),
      text: "quedarse",
      small: "que decide",
      smallAfter: t("decide") - 0.5,
    });
    cam(t("gracias"), 1.0);
    const p0 = t("trabajar");
    paper({
      t0: p0,
      t1: t("Se"),
      clip: "unfold_remote",
      pre: ["trabajar en remoto para", "empresas extranjeras, ganando más de"],
      bigw: { text: "2.000 $", t: t("2.000", p0), sfx: "click" },
      post: [
        "dólares al mes y con la",
        { hl: "LIBERTAD DE HORARIOS", at: t("libertad", p0) },
        "que siempre han querido.",
      ],
      person: REMOTE(p0 + 1.3),
      props: [
        PROP(
          "dollars",
          t("2.000", p0),
          { x: 690, y: 1230, w: 300 },
          { x: 740, y: 780, w: 220 },
          { x: 1220, y: 760, w: 240 },
          { rot: 12 },
        ),
        PROP(
          "globe",
          p0 + 1.5,
          { x: 40, y: 1250, w: 230 },
          { x: 60, y: 760, w: 170 },
          { x: 520, y: 700, w: 200 },
          { rot: -8 },
        ),
      ],
    });
    const n0 = t("Se");
    navyList({
      t0: n0,
      t1: P.dur,
      title: [
        [{ t: "Se trata de una profesión", at: n0 + 0.02 }],
        [
          { hl: "TECNOLÓGICA", at: t("tecnológica", n0) },
          { t: " que puedes aprender", at: t("que", t("tecnológica", n0)) },
        ],
      ],
      items: [
        { t: t("sin", n0), text: "Sin salir<br>de tu país", prop: "passport", mark: "ok" },
        { t: t("pisar", n0), text: "Sin pisar la<br>universidad", prop: "gradcap", mark: "ok" },
        {
          t: t("dejar", n0),
          text: "Sin dejar tu trabajo<br>mientras te formas",
          prop: "suitcase",
          mark: "ok",
          propW: 0.38,
        },
      ],
    });
  };
  M.AD1LA_B2 = (P) => {
    // "De hecho, lo único que necesitas para acceder a ella en menos de un año es dejar de pensar que solamente existen esas dos opciones que te han hecho creer toda la vida."
    cam(0, 1.0);
    clockBeat({
      t: t("en"),
      out: t("es"),
      pre: "en menos de",
      preAfter: t("en") - 0.05,
      num: "1",
      tNum: t("un"),
      unit: "año",
      tUnit: t("año"),
    });
    cam(t("es"), 1.12);
    big({
      t: t("dos"),
      out: t("que", t("dos")),
      text: "dos opciones",
      small: "solamente existen esas",
      smallAfter: t("solamente") - 0.05,
      coverTo: te("opciones"),
    });
    cam(t("que", t("dos")), 1.22);
    big({
      t: t("toda"),
      out: P.dur,
      text: "toda la vida",
      small: "te han hecho creer",
      smallAfter: t("te", t("dos")) - 0.05,
      sfx: "click",
    });
  };

  // ════════════════ AD3 LATAM ════════════════
  M.AD3LA_H = (P) => {
    // standing grey screen: "Esto que ves aquí no es una oferta de Estados Unidos para alguien de allí, es para alguien que vive en Latinoamérica y busca ganar en dólares trabajando en remoto."
    cam(0, 1.0);
    offerWall({
      t0: 0,
      t1: t("es", 4),
      cards: [
        { t: 0.05, title: "Oferta de empleo", salary: "Pago en USD", chips: ["EE. UU.", "Remoto"] },
        {
          t: t("oferta"),
          title: "Se busca perfil",
          salary: "Horario flexible",
          chips: ["Remoto", "LATAM"],
        },
        { t: t("Unidos"), title: "Vacante abierta", salary: "Pago en USD", chips: ["Desde casa"] },
      ],
    });
    cam(t("es", 4), 1.14);
    big({
      t: t("Latinoamérica"),
      out: t("busca"),
      text: "Latinoamérica",
      small: "para alguien que vive en",
      smallAfter: t("es", 4),
      coverTo: te("Latinoamérica"),
    });
    cam(t("busca"), 1.26);
    big({
      t: t("dólares"),
      out: t("trabajando"),
      text: "en dólares",
      small: "busca ganar",
      smallAfter: t("busca") - 0.05,
      sfx: "click",
    });
    cam(t("trabajando"), 1.0);
  };
  M.AD3LA_B1 = (P) => {
    // desk: "Muchos creen que para ganar en moneda fuerte hay que hacer las maletas y emigrar. Y la realidad es que las empresas de Estados Unidos y de Europa están contratando en Latinoamérica para una profesión tecnológica que paga entre 2 y 3 mil dólares al mes."
    cam(0, 1.0);
    big({
      t: t("moneda"),
      out: t("hay"),
      text: "moneda fuerte",
      small: "para ganar en",
      smallAfter: t("para") - 0.05,
      coverTo: te("fuerte"),
    });
    cam(t("hay"), 1.18);
    side({
      t: t("maletas"),
      out: t("emigrar."),
      text: "hacer las<br>maletas",
      coverTo: te("maletas"),
    });
    cam(t("emigrar."), 1.26);
    big({ t: t("emigrar."), out: t("Y"), text: "emigrar", sfx: "click" });
    const p0 = t("Y");
    paper({
      t0: p0,
      t1: P.dur,
      clip: "unfold_remote",
      pre: ["Y la realidad es que las empresas", "de Estados Unidos y de Europa están"],
      bigw: { text: "contratando", t: t("contratando", p0) },
      post: [
        "en Latinoamérica para una",
        "profesión tecnológica que paga",
        { hl: "ENTRE 2 Y 3 MIL $/MES", at: t("2", p0) },
      ],
      person: REMOTE(p0 + 1.3),
      props: [
        PROP(
          "globe",
          t("Latinoamérica", p0),
          { x: 40, y: 1250, w: 230 },
          { x: 60, y: 760, w: 170 },
          { x: 520, y: 700, w: 200 },
          { rot: -8 },
        ),
        PROP(
          "dollars",
          t("2", p0),
          { x: 690, y: 1230, w: 300 },
          { x: 740, y: 780, w: 220 },
          { x: 1220, y: 760, w: 240 },
          { rot: 12 },
        ),
      ],
    });
  };
  // ════════════════ AD3 EU — body (ported verbatim from the approved EU AD3 Hook B v6/v7 spec; its own HB-reel times) ════════════════
  M.EU3_BODY = (P) => {
    E.setOff(E.getOff() - 11.56);
    const sfx = { V: "", S: "_s", H: "_h" }[F],
      INK = "#1f1f1f";
    const full = (s, src) =>
      (el("img", "abs", s, { left: 0, top: 0, width: px(W), height: px(H) }).src = src);
    const { shot, pills, type, card, scene, clock } = E;
    const SM = { cls: "hvs shadowed" };
    const smallAt = (o) =>
      Object.assign(
        {
          x: L(o.vx ?? 540, 540, o.hx ?? 430),
          y: L(o.vy, o.sy ?? 22, o.hy ?? 250),
          size: L(o.vs ?? 62, 44, 54),
          anchor: "c",
        },
        SM,
      );
    const bigAt = (o) => ({
      x: L(o.vx ?? 540, 540, o.hx ?? 430),
      y: L(o.vy, o.sy ?? 72, o.hy ?? 310),
      size: L(o.vs, o.ss, o.hs),
      anchor: "c",
    });
    D.cover(11.56, 43.16);
    // ═════════ F · 11.56–13.24 body: "Soy Bienvenido Sáez y llevo" ═════════
    shot(11.56, 1.0);
    pills(11.56, 13.24);

    // ═════════ G · 13.24–15.62  "más de 17 años formando a profesionales" ═════════
    shot(13.24, 1.3, { dx: L(150, 140, 0) });
    matte(13.24, 15.62);
    line(front, {
      words: ws("más de", 13.2),
      size: L(50, 42, 54),
      x: L(50, 40, 140),
      y: L(470, 200, 300),
      cls: "hvs shadowed",
      out: 14.4,
    });
    txt(behind, {
      t: 13.6,
      out: 14.4,
      sfx: "click",
      text: "17<br>años",
      size: L(190, 150, 230),
      x: L(40, 30, 130),
      y: L(530, 250, 360),
      color: Y,
      anim: "pop",
    });
    shot(14.4, 1.3, { dx: L(-20, -20, 0) });
    line(front, {
      words: ws("formando a", 14.3),
      size: L(54, 42, 54),
      x: L(W / 2, W / 2, 430),
      y: L(150, 20, 270),
      anchor: "c",
      cls: "hvs shadowed",
      out: 15.62,
    });
    txt(behind, {
      t: 15.04,
      out: 15.62,
      sfx: "swoosh",
      text: "profesionales",
      size: L(165, 125, 120),
      x: L(W / 2, W / 2, 430),
      y: L(215, 70, 335),
      anchor: "c",
      color: Y,
      anim: "pop",
    });

    // ═════════ H · 15.62–18.82 pills ═════════
    shot(15.62, 1.0);
    pills(15.62, 18.82);
    shot(17.7, 1.15);

    // ═════════ I · 18.82–26.30 navy notepad scene ═════════
    {
      const s = scene(18.82, 26.3, { bg: `gen/bg_navy${sfx}.png`, sfx: "whoosh" });
      type(s, {
        x: L(70, 50, 230),
        y: L(280, 90, 90),
        size: L(80, 60, 84),
        cps: 28,
        lines: [
          [{ t: "A las empresas hoy", at: 18.86 }],
          [
            { t: "no le ", at: 19.78 },
            { hl: "IMPORTAN", at: 20.3 },
          ],
        ],
      });
      cutout(s, {
        src: "cuts/tower1.png",
        t: 19.05,
        x: L(-170, -110, -90),
        y: L(1040, 600, 330),
        w: L(470, 320, 400),
        anim: "rise",
        z: 1,
        gray: true,
      });
      cutout(s, {
        src: "cuts/tower2.png",
        t: 19.35,
        x: L(790, 850, 1650),
        y: L(960, 560, 290),
        w: L(430, 300, 380),
        anim: "rise",
        z: 1,
        gray: true,
      });
      const cw = L(390, 300, 440),
        ch = L(340, 260, 370),
        cy = L(640, 380, 410),
        nd = { numsize: L(84, 62, 84), numdy: L(92, 70, 92) };
      const x1 = L(110, 40, 230),
        x2 = L(580, 390, 740),
        x3 = L(300, 740, 1250),
        y3 = L(1170, cy, cy),
        w3 = L(480, cw, cw),
        h3 = L(400, ch, ch);
      card(
        s,
        Object.assign(
          {
            t: 21.02,
            x: x1,
            y: cy,
            w: cw,
            h: ch,
            rot: -2,
            text: "¿Tu edad?",
            size: L(52, 40, 50),
            num: "#1",
          },
          nd,
        ),
      );
      cutout(s, {
        src: "cuts/cake.png",
        t: 21.15,
        x: x1 + cw - L(120, 90, 110),
        y: cy - L(50, 40, 50),
        w: L(170, 125, 160),
        z: 4,
        rot: 8,
      });
      const m1 = cy + ch / 2,
        m2 = cy + ch / 2;
      stroke(s, {
        t: 21.4,
        dur: 0.25,
        z: 6,
        color: "#d11",
        w: L(9, 7, 8),
        d: `M ${x1 + 0.14 * cw} ${m1 + 5} C ${x1 + 0.38 * cw} ${m1 - 20}, ${x1 + 0.64 * cw} ${m1 + 20}, ${x1 + 0.87 * cw} ${m1 - 10}`,
      });
      card(
        s,
        Object.assign(
          {
            t: 21.98,
            x: x2,
            y: cy,
            w: cw,
            h: ch,
            rot: 2,
            text: "¿Título<br>universitario?",
            size: L(46, 34, 44),
            num: "#2",
          },
          nd,
        ),
      );
      cutout(s, {
        src: "cuts/gradcap.png",
        t: 22.12,
        x: x2 + cw - L(140, 110, 130),
        y: cy - L(65, 50, 60),
        w: L(190, 140, 180),
        z: 4,
        rot: -10,
      });
      stroke(s, {
        t: 22.5,
        dur: 0.3,
        z: 6,
        color: "#d11",
        w: L(9, 7, 8),
        d: `M ${x2 + 0.12 * cw} ${m2 - 25} C ${x2 + 0.36 * cw} ${m2 - 45}, ${x2 + 0.66 * cw} ${m2 - 5}, ${x2 + 0.9 * cw} ${m2 - 35} M ${x2 + 0.16 * cw} ${m2 + 40} C ${x2 + 0.4 * cw} ${m2 + 20}, ${x2 + 0.66 * cw} ${m2 + 55}, ${x2 + 0.88 * cw} ${m2 + 30}`,
      });
      card(
        s,
        Object.assign(
          {
            t: 23.22,
            x: x3,
            y: y3,
            w: w3,
            h: h3,
            rot: -1,
            text: 'Solamente buscan<br>gente que sepa<br><b style="font-weight:700">hacer el trabajo</b>',
            size: L(44, 28, 40),
            num: "#3",
          },
          nd,
        ),
      );
      cutout(s, {
        src: "cuts/toolbox.png",
        t: 23.45,
        x: L(x3 + w3 - 140, x3 + 40, x3 + w3 - 150),
        y: y3 + h3 - L(140, 40, 120),
        w: L(230, 150, 210),
        z: 4,
        rot: 6,
      });
      const uy = y3 + h3 * L(0.835, 0.79, 0.79);
      stroke(s, {
        t: 25.18,
        dur: 0.35,
        z: 6,
        color: Y,
        w: L(10, 8, 9),
        d: `M ${x3 + 0.2 * w3} ${uy} C ${x3 + 0.36 * w3} ${uy + 18}, ${x3 + 0.55 * w3} ${uy + 10}, ${x3 + 0.82 * w3} ${uy - 5}`,
      });
    }

    // ═════════ J · 26.30–31.58 "… 0% de tasa de paro y una demanda que no para de crecer" ═════════
    shot(26.3, 1.0);
    pills(26.3, 27.5);
    shot(27.5, L(1.12, 1.0, 1.12));
    matte(27.5, 31.58);
    txt(
      behind,
      Object.assign(
        { t: 27.5, out: 29.24, text: "0%", color: Y, anim: "pop", sfx: "click" },
        bigAt({ vy: 170, vs: 430, ss: 260, hs: 380, hy: 250 }),
      ),
    );
    line(
      front,
      Object.assign(
        { words: ws("de tasa de paro", 28.0), out: 29.24 },
        smallAt({ vy: 525, sy: 22, hy: 590 }),
      ),
    );
    shot(29.24, L(1.22, 1.06, 1.22));
    line(
      front,
      Object.assign(
        { words: ws("y una demanda que no para de", 29.2), out: 31.58 },
        smallAt({ vy: 160, vs: 54, sy: 22, hy: 250 }),
      ),
    );
    txt(
      behind,
      Object.assign(
        { t: 31.02, out: 31.58, text: "crecer", color: Y, anim: "pop", sfx: "swoosh" },
        bigAt({ vy: 220, vs: 300, ss: 210, hs: 220 }),
      ),
    );
    stroke(front, {
      t: 31.1,
      dur: 0.25,
      out: 31.58,
      color: Y,
      w: 12,
      d: L(
        "M 930 520 L 1010 260 M 1010 260 L 950 300 M 1010 260 L 1030 330",
        "M 900 300 L 960 100 M 960 100 L 915 135 M 960 100 L 978 155",
        "M 700 300 L 760 110 M 760 110 L 718 140 M 760 110 L 775 165",
      ),
    });

    // ═════════ K · 31.58–36.00 pills ═════════
    shot(31.58, 1.0);
    pills(31.58, 33.82);
    shot(33.82, 1.16);
    pills(33.82, 36.0);

    // ═════════ L · 36.00–43.16 office tear ═════════
    {
      const s = scene(36.0, 43.16, { color: "#cfcfcf", sfx: "paper" });
      full(s, `seed/tear_office${sfx}_last.png`);
      D.mediaPut("tear_office", s, 36.0);
      const cx = W / 2,
        G = "#303030";
      line(s, {
        words: ws("Lo único que necesitas", 35.9),
        size: L(56, 44, 48),
        x: cx,
        y: L(190, 90, 90),
        anchor: "c",
        color: G,
      });
      line(s, {
        words: ws("es tener la", 37.5),
        size: L(56, 44, 48),
        x: cx,
        y: L(252, 140, 142),
        anchor: "c",
        color: G,
      });
      txt(s, {
        t: 38.32,
        sfx: "swoosh",
        text: "certeza",
        size: L(250, 180, 200),
        x: cx,
        y: L(300, 175, 180),
        anchor: "c",
        color: INK,
        anim: "pop",
      });
      line(s, {
        words: ws("de que tu trabajo actual", 38.8),
        size: L(52, 40, 44),
        x: cx,
        y: L(530, 335, 355),
        anchor: "c",
        color: G,
      });
      line(s, {
        words: ws("no es donde quieres pasar", 40.3),
        size: L(52, 40, 44),
        x: cx,
        y: L(590, 382, 405),
        anchor: "c",
        color: G,
      });
      type(s, {
        x: cx,
        anchor: "c",
        y: L(655, 430, 455),
        size: L(70, 52, 58),
        lines: [[{ hl: "LOS PRÓXIMOS 10 AÑOS", at: 41.52 }]],
      });
      const K = L(0.78, 0.5, 0.55),
        FEET = L(1880, 1070, 1070),
        X0 = L(0, 540 - (1071 * 0.5) / 0.78 / 2, 960 - (1071 * 0.55) / 0.78 / 2);
      const P = [
        ["office_0", [16, 20, 343, 977], 0, [[200, 118]], "otro lunes"],
        [
          "office_1",
          [345, 16, 929, 992],
          215,
          [
            [495, 150],
            [745, 138],
          ],
          "mismo sueldo",
        ],
        ["office_2", [931, 94, 1165, 973], 640, [[1035, 160]], "sin crecer"],
        ["office_3", [1169, 44, 1529, 978], 790, [[1335, 118]], "¿10 años más?"],
      ];
      const bw = (92 * K) / 0.78,
        bh = (26 * K) / 0.78;
      P.forEach(([f, b, xv, eyes, lab], i) => {
        const x = X0 + (xv * K) / 0.78,
          w = (b[2] - b[0]) * K,
          h = (b[3] - b[1]) * K,
          y = FEET - h,
          t = 38.9 + i * 0.12;
        const g = el("div", "abs", s, {
          left: px(x),
          top: px(y),
          width: px(w),
          height: px(h),
          zIndex: 3 + (i % 2),
          transformOrigin: "50% 100%",
        });
        const im = el("img", "", g, {
          width: "100%",
          display: "block",
          filter: E.outlineF(Y, L(5, 3.5, 4)),
        });
        im.src = `cuts/${f}.png`;
        eyes.forEach(([ex, ey]) =>
          el("div", "abs", g, {
            left: px((ex - b[0]) * K - bw / 2),
            top: px((ey - b[1]) * K - bh / 2),
            width: px(bw),
            height: px(bh),
            background: Y,
          }),
        );
        tl.set(g, { autoAlpha: 0 }, -0);
        tl.set(g, { autoAlpha: 1 }, t);
        tl.fromTo(
          g,
          { y: -220, scale: 1.1 },
          { y: 0, scale: 1, duration: 0.34, ease: "bounce.out", immediateRender: false },
          t,
        );
        cue(t + 0.02, "pop", 0.7);
        txt(s, {
          t: 40.0 + i * 0.25,
          text: lab,
          x: x + w / 2,
          y: y - L(34, 26, 28),
          anchor: "c",
          cls: "lbl",
          size: 24,
          color: "#1a1a1a",
          css: { fontSize: L("24px", "18px", "20px"), zIndex: 6 },
        });
      });
    }
  };
  // ════════════════ AD3 EU — CTA (approved v6/v7 layout; HB-reel times) ════════════════
  M.EU3_CTA = (P) => {
    E.setOff(E.getOff() - 43.16);
    const { shot, pills } = E;
    D.phone({
      t0: 43.16,
      t1: 51.5,
      camAt: 48.54,
      screen: "¿qué<br>profesión?",
      arrowAt: 50.6,
      titles: [
        [
          43.16,
          45.06,
          [[{ t: "Para que veas", at: 43.16 }], [{ hl: "QUÉ PROFESIÓN ES", at: 44.1 }]],
        ],
        [45.06, 46.12, [[{ t: "por qué es tan", at: 45.06 }], [{ hl: "DEMANDADA", at: 45.66 }]]],
        [
          46.12,
          48.36,
          [[{ t: "y cómo puedes acceder", at: 46.12 }], [{ hl: "PASO A PASO", at: 47.42 }]],
        ],
        [
          48.36,
          49.72,
          [[{ t: "te he grabado un", at: 48.36 }], [{ hl: "VÍDEO GRATUITO", at: 48.86 }]],
        ],
        [49.72, 51.5, [[{ t: "de tan solo", at: 49.72 }], [{ hl: "15 MINUTOS", at: 50.38 }]]],
      ],
      props: [
        {
          src: "cuts/stopwatch.png",
          t: 50.38,
          V: { x: 735, y: 760, w: 250, rot: 12 },
          S: { x: 790, y: 330, w: 180, rot: 12 },
          H: { x: 1660, y: 300, w: 200, rot: 12 },
        },
        {
          src: "cuts/clapper.png",
          t: 48.86,
          V: { x: 70, y: 820, w: 250, rot: -12 },
          S: { x: 90, y: 420, w: 180, rot: -12 },
          H: { x: 1010, y: 560, w: 200, rot: -12 },
        },
      ],
    });
    D.cover(51.5, 55.64);
    const SM = { cls: "hvs shadowed" };
    const bigAt = (o) => ({
      x: L(o.vx ?? 540, 540, o.hx ?? 430),
      y: L(o.vy, o.sy ?? 72, o.hy ?? 310),
      size: L(o.vs, o.ss, o.hs),
      anchor: "c",
    });
    // ═════════ N · 51.50–55.64 CTA camera ═════════
    shot(51.5, 1.0);
    pills(51.5, 52.64);
    matte(52.64, 53.34);
    txt(
      behind,
      Object.assign(
        { t: 52.64, out: 53.34, text: "aquí abajo", color: Y, anim: "pop", sfx: "click" },
        bigAt({ vy: 240, vs: 175, ss: 140, hs: 150, sy: 40, hy: 300 }),
      ),
    );
    stroke(front, {
      t: 52.7,
      dur: 0.3,
      out: 55.64,
      color: Y,
      w: 12,
      lift: false,
      d: L(
        "M 900 1420 C 940 1560, 930 1680, 880 1800 M 880 1800 L 850 1730 M 880 1800 L 935 1745",
        "M 930 700 C 960 800, 955 900, 920 1000 M 920 1000 L 893 940 M 920 1000 L 965 955",
        "M 1660 640 C 1700 760, 1695 880, 1660 1000 M 1660 1000 L 1632 940 M 1660 1000 L 1705 955",
      ),
    });
    shot(53.34, 1.16);
    pills(53.34, 54.78);
    shot(54.78, 1.05);
    matte(54.78, 55.64);
    txt(
      behind,
      Object.assign(
        { t: 54.78, out: 55.64, text: "ahora mismo", color: Y, anim: "pop", sfx: "swoosh" },
        bigAt({ vy: 220, vs: 160, ss: 130, hs: 120, hx: 400, sy: 40, hy: 300 }),
      ),
    );
  };
})();
