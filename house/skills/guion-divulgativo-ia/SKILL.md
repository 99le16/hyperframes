---
name: guion-divulgativo-ia
description: Escribe guiones de YouTube divulgativos en español sobre IA con un estilo narrativo fijo. Arrancan con una escena histórica que la gente conoce (un invento, un personaje, una anécdota), plantean una pregunta abierta sobre las máquinas y suben por una escalera de ejemplos, de lo antiguo y tonto a los estudios de IA más recientes con fecha y cifra. Matizan con "para ser claros", cierran con "fíjate en la tendencia" volviendo al personaje del principio y terminan con una llamada a la acción. Úsala SIEMPRE que el usuario pida un guión, un texto para narrar o una idea de vídeo "con este estilo", "tipo documental", "que se pueda hacer viral en YouTube", que relacione algo conocido con la IA, o que diga "otro guión como el de Babbage/Lovelace" o "como el del Turco". Solo escribe el texto. No graba, no monta y no genera voz; eso lo hacen /talking-head-edit o /faceless-explainer.
---

# guion-divulgativo-ia

Un guión de 10 a 15 minutos para narrar a cámara o en off. Es de los que
enganchan con historia, se ganan la confianza con datos concretos y dejan al
espectador con una idea que puede repetir en una cena. El molde viene de un
guión de referencia sobre Babbage, Lovelace y si la IA puede tener ideas
originales. El ejemplo resuelto del repo usa ese molde con otro tema: El Turco
de ajedrez y si la IA puede mentir (`references/ejemplo-turco-mecanico.md`).

La regla que decide si el guión funciona: **cada párrafo va un paso más allá
que el anterior en la misma pregunta.** Si un ejemplo no sube la apuesta, sobra.

## Elegir el tema

El tema es una pareja: **algo que la gente ya conoce + una pregunta sobre la IA
que parece tener una respuesta obvia y no la tiene.**

- Lo conocido tiene que ser una **escena**, no un concepto: un lugar, un año, una
  persona haciendo algo con las manos. "En Viena, en 1770…" y no "La historia
  del engaño…".
- La pregunta tiene que admitir **grados**: ¿puede una IA mentir, tener ideas
  originales, entender un chiste, tener memoria, soñar, hacer trampas? Si la
  respuesta es un simple sí o no, no aguanta 12 minutos.
- Tiene que existir una **escalera real** de al menos 6 escalones fechados, desde
  un ejemplo histórico o tonto hasta artículos de 2024–2026. Si no la
  encuentras, el tema no vale. Cambia de tema en vez de rellenar.

Semillas probadas y pendientes: `references/temas.md`.

## La estructura

Los porcentajes son del total de palabras. Detalle y frases modelo de cada
tramo: `references/estructura.md`.

| #   | Tramo                     | %     | Qué hace                                                                                                                                                                                                                                               |
| --- | ------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Escena de apertura**    | 8–10  | Ciudad y década, el inventor trabajando, detalles físicos (latón, vapor, vela, turbante). Un giro que lo conecta con el futuro. Un chiste seco de una línea.                                                                                           |
| 2   | **La pregunta**           | 5     | La pregunta sale de la historia, a veces en boca del propio personaje. Se formula como pregunta directa, entre signos.                                                                                                                                 |
| 3   | **Por qué es difícil**    | 5     | "No está claro qué se considera…". "Es fácil que la gente cambie las reglas del juego". "Es cuestión de grados".                                                                                                                                       |
| 4   | **Escalones antiguos**    | 15    | 2 o 3 ejemplos del siglo XX. Cada uno se desmonta: "pero eso se logró simplemente…".                                                                                                                                                                   |
| 5   | **Escalones modernos**    | 35–40 | Estudios con mes, año, institución, modelo y cifra. Uno por párrafo. Cada uno lleva su "para ser claros" o "ahora bien".                                                                                                                               |
| 6   | **El porqué**             | 8     | Mecanismo sencillo: preentrenamiento y luego refuerzo. Una analogía cotidiana (el satélite y la física, el niño que dice "no he sido yo").                                                                                                             |
| 7   | **Recapitulación y giro** | 10    | "Así pues, tenemos pruebas de que…". La objeción del escéptico. "Lo que importa aquí no es si… Lo que sucede es que…". Se repasa la escalera en una frase por escalón.                                                                                 |
| 8   | **Vuelta al personaje**   | 5     | "Imaginen cómo reaccionaría X ante…". Una ironía histórica que cierre el círculo.                                                                                                                                                                      |
| 9   | **Cierre**                | 5     | "Es natural que la gente quiera cambiar las reglas del juego", la objeción entre comillas, "fíjate en la tendencia", "esta no es una conversación nueva", "ciertamente nosotros tampoco tendremos la última palabra". Se remata con una frase rotunda. |
| 10  | **Llamada a la acción**   | 3     | Recurso o canal, lista de reproducción. Por defecto es el canal ConquerAI; nunca uses el nombre del presentador.                                                                                                                                       |

## La voz

Reglas completas y ejemplos en `references/voz.md`. Las que más se notan si
faltan:

- **Frases cortas después de frases largas.** Una frase de 30 palabras con
  detalle técnico y, justo después: "Eso era todo." / "Es cuestión de grados." /
  "Mentía."
- **Un chiste seco cada 400–600 palabras**, siempre con la misma plantilla:
  "Los programadores pueden sentirse identificados." Úsala dos veces como
  máximo por guión, con variantes ("Los jugadores de ajedrez…").
- **Preguntas retóricas como bisagra** entre bloques: "¿Y qué pasó en 1997,
  cuando…?", "Entonces, ¿qué ocurre con…?".
- **Desmontar antes de subir.** Cada ejemplo se concede y luego se rebaja: "Es un
  dato nuevo, sin duda, pero no una idea original." / "Aun así, es fácil
  descartar esto."
- **Honestidad explícita.** "Para ser claros…", "Ahora bien…", "no se ha visto
  nada así en usos reales". El guión gana credibilidad porque admite los
  límites de sus propias pruebas.
- **Muletillas que se repiten:** "cambiar las reglas del juego", "es cuestión de
  grados", "fíjate en la tendencia". Aparecen al principio y vuelven al final;
  así el guión se siente cerrado.
- **Títulos de artículos** en inglés entre comillas, con la traducción entre
  paréntesis la primera vez.
- Se tutea al espectador ("Puedes abrir tu asistente de chat favorito"), con
  algún "imaginen" suelto en el cierre.

## Datos: nada sin fuente

Cada escalón moderno lleva **mes y año, quién lo publicó, qué modelo y una cifra**.
Esa precisión es lo que diferencia este estilo de un vídeo de opinión, y es
también donde más fácil resulta equivocarse.

1. Antes de escribir un escalón moderno, busca el artículo o la entrada de blog
   original (WebSearch/WebFetch) y comprueba **las cifras exactas** en la fuente.
   La memoria del modelo no cuenta como fuente.
2. Anota cada cifra y su URL en la tabla de fuentes del final (ver _Entrega_).
3. Las anécdotas históricas dudosas (Napoleón y El Turco, la secretaria de
   Weizenbaum) se introducen con "se dice que" o "según X".
4. Si no puedes verificar un dato, quítalo o márcalo con `[VERIFICAR]`. Nunca lo
   redondees para que suene mejor.

## Errores del guión de referencia que no se copian

El guión original era una traducción automática y arrastra errores. No los
imites:

- "máster en Derecho" o "expertos en derecho" por **LLM**. Escribe "modelo de
  lenguaje" o "LLM".
- "estudiantes de Derecho" por "LLMs" (el artículo de los loros estocásticos).
- "modelo de lenguaje natural (LLM)". Lo correcto es "gran modelo de lenguaje".
- Frases partidas ("Luego, utilizando una herramienta llamada…, que Claude no
  se había aprendido…") y comparaciones incompletas ("es más fácil saber si un
  vídeo es bueno crear uno"). Relee buscando frases sin verbo principal.
- Espacios sueltos antes de signos ("¿ Pueden", "tablero ,").

## Longitud

Narración en español: unas **150 palabras por minuto**.

| Objetivo                         | Palabras                                  |
| -------------------------------- | ----------------------------------------- |
| Referencia (≈15 min)             | ~2.250                                    |
| "Un poco más corto" (≈12–13 min) | 1.800–1.950                               |
| Versión media (≈8 min)           | ~1.200: 4 escalones modernos, sin tramo 6 |

Cuenta las palabras antes de entregar (`wc -w`) y ajusta quitando escalones
enteros, nunca recortando el desmontaje de cada uno.

## Entrega

1. El guión como texto corrido, con un `# Título` en forma de pregunta y sin
   encabezados de sección. Se narra seguido.
2. Debajo, tras un `---`, una nota breve con el recuento de palabras, la
   duración estimada y la estructura en una línea.
3. Una **tabla de fuentes**: afirmación, cifra, URL y estado (verificado o
   `[VERIFICAR]`).
4. Si el usuario lo pide o el guión va a un proyecto, guárdalo en
   `projects/<slug>/guion.md`.

## Lista de comprobación

- [ ] La apertura es una escena (lugar, año, persona, objetos), no un concepto.
- [ ] La pregunta aparece formulada literalmente antes del 15% del texto.
- [ ] Hay al menos 6 escalones y cada uno sube respecto al anterior.
- [ ] Cada escalón moderno tiene fecha, autor, modelo, cifra y un "para ser claros".
- [ ] El cierre vuelve al personaje de la apertura.
- [ ] "Cambiar las reglas del juego" o "cuestión de grados" aparece al principio y al final.
- [ ] Ni "máster en Derecho" ni errores de traducción.
- [ ] Recuento de palabras dentro del objetivo.
- [ ] Todas las cifras están en la tabla de fuentes, verificadas o marcadas.

## Referencias

- `references/estructura.md`: cada tramo con frases modelo y la función de cada una.
- `references/voz.md`: ritmo, muletillas, plantillas de chiste y de desmontaje.
- `references/temas.md`: parejas de lo conocido + pregunta de IA, con escalera esbozada.
- `references/ejemplo-turco-mecanico.md`: guión completo resuelto (≈1.900 palabras) con cada tramo anotado.
