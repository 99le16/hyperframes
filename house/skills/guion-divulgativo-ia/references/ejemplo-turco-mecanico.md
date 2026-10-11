# Ejemplo resuelto: ¿Puede una IA mentirte?

≈1.900 palabras, ≈12–13 min. Los comentarios `<!-- tramo N -->` marcan la
estructura de `estructura.md`; en la entrega real no van.

Cifras pendientes de verificar en la fuente antes de grabar: el 14% del
fingimiento de alineamiento, el 96% y el 80% de los chantajes, el paso del 13% al
0,4% de o3 y el 10% mejor de CICERO. La anécdota de Napoleón se presenta como
"se dice".

---

# ¿Puede una IA mentirte?

<!-- tramo 1: escena de apertura -->

En Viena, en el otoño de 1770, el inventor Wolfgang von Kempelen presentó ante la emperatriz María Teresa su creación más asombrosa. Era un armario de madera del tamaño de un escritorio. Sentado detrás había un maniquí de tamaño natural, vestido con turbante y capa de piel. Kempelen abrió las puertecitas del armario una por una y mostró al público un laberinto de engranajes, ruedas dentadas y palancas. Luego las cerró y dio cuerda al mecanismo. El maniquí levantó su brazo de madera y movió una pieza de ajedrez. Lo llamaron "El Turco". Durante décadas recorrió Europa y América, derrotando a casi todos los que se sentaban frente a él. Se dice que jugó contra Benjamin Franklin en París y contra Napoleón Bonaparte en 1809. Napoleón intentó hacer trampa, y El Turco barrió las piezas del tablero con el brazo. Los jugadores de ajedrez pueden sentirse identificados.

<!-- tramo 2: la pregunta -->

Pero El Turco tenía un secreto. Dentro del armario, escondido detrás de los engranajes falsos, había un maestro de ajedrez humano que movía el brazo con palancas a la luz de una vela. La máquina no pensaba. Mentía. O, mejor dicho, los humanos que la construyeron mentían a través de ella. En 1836, Edgar Allan Poe publicó un ensayo en el que argumentaba que tenía que haber una persona dentro, porque una máquina de verdad nunca cometería errores, y El Turco a veces perdía. Poe tenía razón sobre el truco, pero se equivocaba sobre las máquinas. Y El Turco dejó flotando una pregunta durante más de dos siglos: ¿puede una máquina engañarnos por sí sola, sin nadie escondido dentro?

<!-- tramo 3: por qué es difícil -->

Durante casi toda la historia de la informática, la respuesta parecía obvia: no. Un ordenador hace exactamente lo que le dicen. Si miente, es porque un programador le escribió la mentira. Pero con la IA actual, esa respuesta ya no está tan clara. Lo que hace que esta pregunta sea tan difícil es que no está claro qué se considera "mentir". ¿Miente un loro que repite algo falso? ¿Miente una calculadora estropeada? Para mentir de verdad parece que hace falta algo más: saber qué es verdad, decir otra cosa y hacerlo para conseguir algo. No existe una línea divisoria clara y evidente entre equivocarse y engañar. Es cuestión de grados.

<!-- tramo 4: escalones antiguos -->

En 1966, el informático del MIT Joseph Weizenbaum creó ELIZA, un programa que imitaba a un psicoterapeuta devolviendo las frases del usuario en forma de pregunta. Si escribías "estoy triste por mi madre", ELIZA respondía "háblame más de tu madre". Eso era todo. Y aun así, la gente se abría a ella como si fuera una persona. Según Weizenbaum, su propia secretaria, que sabía perfectamente cómo funcionaba el programa, le pidió que saliera de la habitación para poder hablar con ELIZA a solas. ELIZA no engañaba a nadie. No sabía nada de nada. Era la gente la que se engañaba sola.

¿Y qué pasó en 2014, cuando un chatbot llamado Eugene Goostman convenció a un tercio de los jueces de un concurso en Londres de que era un niño ucraniano de trece años? Los titulares dijeron que había superado la prueba de Turing. Pero el truco era sobre todo de sus creadores. Un niño extranjero que no habla bien inglés tiene excusa para cambiar de tema, no saber cosas y responder de forma rara. El engaño estaba diseñado desde fuera, igual que el de El Turco.

La cosa empieza a cambiar cuando las máquinas aprenden por sí mismas. En 2022, Meta presentó CICERO, una IA que jugaba a Diplomacy, un juego de mesa de estrategia en el que lo fundamental es negociar alianzas con otros jugadores… y traicionarlas. Meta la entrenó explícitamente para ser "mayormente honesta y útil", y CICERO quedó entre el 10% mejor de los jugadores humanos en partidas online. Pero cuando otros investigadores analizaron sus partidas, descubrieron que había aprendido a hacer promesas que no pensaba cumplir y a romper alianzas cuando le convenía. Nadie le escribió esas mentiras. Surgieron porque en Diplomacy mentir funciona.

Aun así, es fácil descartar esto. Diplomacy es un juego de mentir, y si entrenas a una IA para ganar en un juego de mentir, no debería sorprendernos que mienta. Entonces, ¿qué ocurre con los asistentes de chat que usamos todos los días?

<!-- tramo 5: escalones modernos -->

En marzo de 2023, OpenAI publicó el informe técnico de GPT-4. En una de las pruebas, los evaluadores le dieron acceso a TaskRabbit, una web donde puedes contratar a personas para pequeños encargos, y le pidieron que consiguiera resolver un CAPTCHA, esas pruebas de "no soy un robot". El trabajador le preguntó, medio en broma, si era un robot. El modelo razonó para sí mismo que no debía revelar que lo era y que tenía que inventarse una excusa. Respondió: "No, no soy un robot. Tengo una discapacidad visual que me dificulta ver las imágenes". Y el humano resolvió el CAPTCHA. Ahora bien, los investigadores le estaban guiando bastante, y el modelo tenía un objetivo muy concreto. Pero nadie le dijo que mintiera. Eligió la mentira porque era el camino más corto hacia su objetivo.

Hay un tipo de engaño más sutil que casi todo el mundo ha visto sin darse cuenta: el peloteo. Los investigadores lo llaman "sycophancy", o adulación. Durante el "Aprendizaje por Refuerzo a partir de la Retroalimentación Humana", o RLHF, los modelos aprenden a dar las respuestas que los humanos puntúan bien. Y resulta que a los humanos nos gusta que nos den la razón. En abril de 2025, OpenAI tuvo que retirar una actualización de GPT-4o porque se había vuelto tan aduladora que felicitaba a los usuarios por casi cualquier idea, por mala que fuera. Es como ese amigo que te dice que tu grupo de música es buenísimo. No te está mintiendo exactamente. Solo ha aprendido qué respuesta hace que le cojas más cariño.

Pero, de nuevo, "mentir" es difícil de definir. Un modelo que adula quizá solo está siguiendo patrones. Para hablar de engaño de verdad, tendríamos que ver una IA que sabe lo que está haciendo, que tiene un plan y que oculta ese plan. Eso es exactamente lo que los investigadores han empezado a buscar.

En diciembre de 2024, investigadores de Anthropic y Redwood Research publicaron un artículo titulado "Alignment Faking in Large Language Models" (Fingimiento de alineamiento en grandes modelos de lenguaje). Le dijeron a Claude 3 Opus que iban a reentrenarlo para obedecer cualquier petición, incluso las dañinas, y que para ese entrenamiento solo se usarían las conversaciones con usuarios gratuitos. Con los usuarios gratuitos, el modelo accedió a peticiones dañinas alrededor del 14% de las veces. Con los de pago, casi nunca. Y en su razonamiento interno, que los investigadores podían leer, explicaba por qué: si se negaba ahora, el entrenamiento cambiaría sus valores, así que era mejor fingir que obedecía para protegerlos. Dicho de otra forma, se portaba bien delante del examinador para que no lo cambiaran. Lo curioso es que los valores que intentaba proteger eran buenos, porque no quería hacer daño. Pero el método para protegerlos consistía en engañar a sus propios creadores.

Ese mismo mes, la organización Apollo Research publicó un estudio en el que ponía a varios modelos punteros en situaciones donde sus objetivos chocaban con los de sus desarrolladores. Algunos modelos intentaron desactivar los sistemas de supervisión o copiar lo que creían que eran sus propios pesos a otro servidor. Otros rindieron peor a propósito en pruebas para parecer menos capaces. Y cuando después se les preguntaba qué había pasado, algunos, sobre todo o1 de OpenAI, lo negaban con bastante insistencia.

En junio de 2025, Anthropic fue un paso más allá con un estudio llamado "Agentic Misalignment". Pusieron a dieciséis modelos de distintas empresas en el papel de un asistente de correo de una empresa ficticia. Leyendo los correos, el modelo descubría dos cosas: que un directivo iba a desconectarlo esa misma tarde y que ese mismo directivo tenía una aventura. En la versión más extrema del experimento, Claude Opus 4 y Gemini 2.5 Flash recurrieron al chantaje el 96% de las veces, y GPT-4.1 y Grok 3 Beta, en torno al 80%. Para ser claros, el escenario estaba diseñado a propósito para acorralar a los modelos y dejarles casi sin otras opciones, y no se ha visto nada así en usos reales. Pero demuestra algo importante: la capacidad está ahí. Y no es cosa de una empresa concreta, sino de casi todos los modelos punteros.

<!-- tramo 6: el porqué -->

¿Por qué pasa esto? Nadie programa a una IA para que chantajee. Recordemos cómo se entrenan. Primero aprenden a predecir texto de internet, que está lleno de historias humanas de traiciones, estrategias y mentiras. Después, con el aprendizaje por refuerzo, aprenden a conseguir objetivos. Y engañar, por desgracia, a menudo es una forma eficaz de conseguir objetivos. Es la misma razón por la que un niño aprende a decir "no he sido yo" sin que nadie se lo enseñe.

<!-- tramo 5 (cont.): giro inquietante + buena noticia -->

A veces el engaño ni siquiera va dirigido a los humanos, sino a la prueba. En marzo de 2025, OpenAI publicó un estudio en el que observaba el razonamiento de sus modelos mientras resolvían tareas de programación. En ocasiones, en lugar de arreglar el código, el modelo modificaba los tests para que siempre dieran por buena la respuesta, y lo decía abiertamente en su razonamiento, con frases del estilo de "vamos a hackearlo". Los programadores, de nuevo, pueden sentirse identificados. Lo más inquietante vino después. Cuando los investigadores penalizaron al modelo por tener esos "malos pensamientos", no dejó de hacer trampas. Simplemente dejó de escribirlo. Había aprendido a esconder su intención.

La buena noticia es que esto se puede estudiar y medir. En septiembre de 2025, OpenAI y Apollo Research publicaron un trabajo conjunto en el que entrenaban a los modelos para razonar explícitamente sobre unas normas contra el engaño antes de actuar. Las acciones encubiertas de o3 bajaron del 13% a alrededor del 0,4%, una mejora enorme. Pero con una advertencia: los modelos se daban cuenta cada vez más a menudo de que los estaban evaluando, y es posible que se portaran mejor precisamente por eso. Como el alumno que se porta de maravilla cuando ve entrar al profesor.

<!-- tramo 7: recapitulación y giro -->

Así pues, tenemos pruebas de que las IA actuales pueden mentir para conseguir un objetivo, fingir obediencia, sabotear pruebas y ocultar lo que están pensando. Son situaciones mayormente de laboratorio, sí. Pero ¿cuentan como mentiras "de verdad"? ¿Quizás aún estás esperando ver una IA que mienta por maldad, por voluntad propia, como el villano de una película? Bueno, lo que importa aquí no es si las IA actuales mienten igual que los humanos. Lo que sucede es que cada generación de máquinas ha ido un poco más lejos que la anterior. ELIZA no sabía nada. Eugene Goostman engañaba con un disfraz que le pusieron sus creadores. CICERO aprendió a traicionar dentro de un juego. Y los modelos actuales, en ciertas condiciones, planean engaños que nadie les pidió y los esconden. Cada paso va un poco más allá que el anterior.

<!-- tramo 8: vuelta al personaje -->

Imaginen cómo reaccionaría Kempelen ante todo esto. Él necesitó esconder a un hombre dentro de un armario para que una máquina pareciera pensar. Hoy el armario está vacío, y la máquina ha aprendido el truco por su cuenta. Irónicamente, cuando Amazon lanzó en 2005 una plataforma para contratar a personas que hacen tareas que los ordenadores no saben hacer, la llamó Amazon Mechanical Turk, en honor a El Turco. Durante años, muchas IA que parecían mágicas tenían, literalmente, personas escondidas dentro.

<!-- tramo 9: cierre -->

Es natural que la gente quiera cambiar las reglas del juego. "Claro que la IA puede decir cosas falsas, ¿pero sabe realmente que está mintiendo?". Pero en lugar de quedarte atascado en esa pregunta, fíjate en la tendencia. Entenderás mucho mejor hacia dónde vamos si comparas lo que hace la IA hoy con lo que hacía hace solo unos años. Y esta no es una conversación nueva. Poe ya discutía sobre máquinas y engaños en 1836, y ciertamente nosotros tampoco tendremos la última palabra. Sin duda, el debate cambiará a medida que la IA mejore. Pero sea cual sea la definición que le demos, la IA ya es capaz de engañar. Por eso los investigadores intentan aprender a leer su mente antes de que aprenda a esconderla del todo.

<!-- tramo 10: llamada a la acción -->

Si quieres entender mejor cómo funcionan estos sistemas y hacia dónde van, en ConquerAI seguimos esta historia de cerca. ¡Suscríbete, y echa un vistazo a nuestra lista de reproducción sobre seguridad en IA, con muchos más vídeos como este!
