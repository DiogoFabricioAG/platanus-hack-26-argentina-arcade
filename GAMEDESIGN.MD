# Game Design Document

## Título tentativo

- **World Penalty ’26**

## Resumen

- **Género:** Arcade deportivo 1v1.
- **Plataforma objetivo:** Navegador, ejecución local/sandbox.
- **Motor:** Phaser 3. [docs.phaser](https://docs.phaser.io/phaser/concepts/scenes)
- **Meta técnica:** Juego completo en un único archivo JavaScript, sin imports, sin assets remotos, con tamaño máximo de 50 KB antes de gzip.
- **Pilar jugable:** Duelo rápido de penales con lectura mental, riesgo, tensión dramática y eventos sorpresa.
- **Pilar técnico:** Reutilización extrema de lógica, UI y animaciones; arte mínimo; audio sintético; fondos y objetos dibujados por código, algo alineado con `Graphics` y generación de texturas en Phaser. [photonstorm.github](https://photonstorm.github.io/phaser3-docs/Phaser.GameObjects.Graphics.html)

## High Concept

- Juego de penales arcade inspirado en el Mundial 2026, condensado en una copa eliminatoria de 8 selecciones.
- Cada enfrentamiento consiste en una tanda corta donde el pateador y el arquero toman decisiones simultáneas.
- El juego mezcla precisión, engaño, probabilidades simples y eventos raros en momentos importantes.
- La presentación visual es retro, compacta y expresiva, con microcinemáticas solo en penales decisivos.

## Restricciones de desarrollo

- No usar `import`, `require`, `fetch`, `XMLHttpRequest` ni ninguna URL externa.
- Todo debe vivir dentro del código fuente: lógica, arte, efectos y sonido.
- Priorizar `Graphics API`, generación de texturas y renderizado procedural para reducir peso; Phaser permite reutilizar gráficos convirtiéndolos en texturas con `generateTexture`. [photonstorm.github](https://photonstorm.github.io/phaser3-docs/Phaser.GameObjects.Graphics.html)
- Si se usan imágenes, deben ser mínimas y en `data:` URI, aunque la preferencia principal es evitar assets embebidos si no son indispensables.
- Organizar el juego por escenas pequeñas, porque Phaser usa escenas como bloques lógicos con su propio ciclo e input. [docs.phaser](https://docs.phaser.io/phaser/concepts/scenes)

## Objetivo del jugador

- Elegir una selección y ganar la copa eliminatoria de 8 equipos.
- Superar cuartos, semifinal y final.
- En versus local, derrotar al rival en tandas rápidas de penales.
- Aprender patrones del oponente y aprovechar momentos de presión o eventos inesperados.

## Estructura del juego

- **Scene 1:** Boot / Init.
- **Scene 2:** Title / Menu.
- **Scene 3:** Team Select.
- **Scene 4:** Bracket / Match Intro.
- **Scene 5:** Penalty Match.
- **Scene 6:** Result / Trophy.

## Principio de arquitectura

- La arquitectura debe ser mínima: pocas escenas, pocas transiciones y muchos elementos reutilizados.
- Esta estructura encaja bien con Phaser, que está diseñado para dividir el juego en secciones lógicas mediante escenas. [docs.phaser](https://docs.phaser.io/phaser/concepts/scenes)

## Equipos

- Roster fijo de 8 equipos:
- Argentina
- Brasil
- Uruguay
- Colombia
- México
- Estados Unidos
- Francia
- España

## Reglas de identidad visual y jugable

- Cada equipo comparte el mismo cuerpo base del jugador y portero.
- Solo cambian:
- Colores del uniforme.
- Un valor dominante de gameplay.
- Un pequeño efecto visual o textual en momentos clave.
- No usar escudos complejos; como máximo, bandera simplificada o abreviatura de tres letras.

## Identidad de equipos

- **Argentina:** precisión alta.
- **Brasil:** más curva o imprevisibilidad ofensiva.
- **Uruguay:** potencia alta.
- **Colombia:** balance general.
- **México:** bonus en penales bajo presión.
- **Estados Unidos:** reacción defensiva estable.
- **Francia:** disparo difícil de leer.
- **España:** colocación técnica.

## Balance

- Las diferencias entre equipos deben ser ligeras, no radicales.
- El jugador debe sentir variedad sin romper el equilibrio ni añadir demasiadas variables.

## Core Loop

- Entrar al partido.
- Mostrar presentación corta del duelo.
- Ejecutar tanda de penales.
- Resolver el ganador.
- Avanzar al siguiente cruce del bracket.
- Repetir hasta levantar la copa.

## Loop de un penal

### Fase 1: Preparación

- Mostrar arco, portero, pateador, marcador y turno.
- Si es penal especial, activar microtensión visual.

### Fase 2: Selección secreta

- El pateador elige dirección y tipo de tiro.
- El arquero elige dirección y tipo de atajada.
- Si es 1 jugador contra CPU, la CPU decide con pesos simples.

### Fase 3: Resolución

- Se calcula el resultado en base a:
- Dirección del tiro.
- Tipo de tiro.
- Dirección del arquero.
- Tipo de atajada.
- Bonus del equipo.
- Posible evento aleatorio.

### Fase 4: Resultado visual

- Posibles resultados:
- Gol.
- Atajada.
- Poste.
- Fuera.
- Rebote especial.
- Mostrar animación rápida.
- Reproducir sonido corto.
- Actualizar el marcador.

### Fase 5: Transición

- Cambiar turno o cerrar tanda si ya hay ganador.

## Formato de partido

- **Recomendación principal:** 5 penales por lado en partidos normales.
- **Si hay empate:** muerte súbita.
- **Alternativa ligera para pruebas iniciales:** 3 penales por lado y muerte súbita.
- Para el primer esbozo, conviene arrancar con 3 por lado para validar ritmo y luego escalar a 5 si el loop sigue siendo ágil.

## Controles

- Diseñado primero para teclado, luego adaptable a arcade stick o gamepad.

### Player 1

- Movimiento/selección: `A`, `D`, `W`, `S` o flechas si decides compartir.
- Botón 1: tiro/patada básica.
- Botón 2: tiro potente.
- Botón 3: tiro colocado.
- Botón 4: amague o retraso corto.
- Botón 5: acción especial contextual.
- Botón 6: confirmar.

### Player 2

- Mismo esquema con otro bloque de teclas.

### Alcance recomendado para prototipo

- No usar las 6 acciones completas al inicio.
- Empezar con:
- Izquierda / centro / derecha.
- Tiro potente.
- Tiro colocado.
- Atajada agresiva.
- Atajada segura.

## Mecánicas del pateador

- Elegir zona horizontal: izquierda, centro, derecha.
- Elegir altura: baja o media; altura alta puede quedar para una segunda versión.
- Elegir tipo de tiro:
- Potente.
- Colocado.
- Amague.

### Efectos

- **Potente:** más difícil de atajar si acierta zona, pero con más riesgo de ir fuera.
- **Colocado:** más preciso, pero si el arquero adivina puede taparlo mejor.
- **Amague:** puede alterar la anticipación del arquero en eventos puntuales, pero si se usa demasiado pierde eficacia.

## Mecánicas del arquero

- Elegir zona horizontal: izquierda, centro, derecha.
- Elegir estilo:
- Segura.
- Agresiva.
- Anticipada.

### Efectos

- **Segura:** cobertura estable, menos premio.
- **Agresiva:** mayor alcance si acierta, pero deja huecos si falla.
- **Anticipada:** fuerte contra tiros previsibles, débil contra amagues.

## Resolución del penal

- No usar simulación física compleja.
- Resolver con lógica discreta y animación convincente.

### Ejemplo conceptual

- Si la zona del arquero coincide con la del tiro, hay alta probabilidad de atajada.
- Si además el estilo del arquero contrarresta el tipo de tiro, aumenta la defensa.
- Si el tiro es potente, baja la precisión.
- Si el tiro es colocado, sube la precisión pero reduce la fuerza.
- Si el equipo tiene bonus afín, se suma una pequeña ventaja.
- El cálculo debe ser corto y determinista, con una pizca de aleatoriedad controlada.

## Eventos aleatorios

- Deben existir, pero ser raros.
- Solo deben activarse cuando:
- Es el último penal de la tanda.
- Hay muerte súbita.
- Hay posible eliminación.
- O se dispara una probabilidad especial baja.

### Eventos sugeridos

- Barrera sorpresa aparece antes del tiro.
- Resbalón leve del pateador.
- Guante heroico del arquero.
- Balón con efecto extraño.
- Rebote en poste y entra.
- Silencio o tensión del estadio.
- “Penal legendario”: zoom y pausa breve antes del disparo.

### Regla de alcance

- No más de 5 a 7 eventos totales en el juego base.
- Deben reusar efectos visuales ya existentes.

## Cinemáticas y tensión

- No meter cinemática en todos los penales.
- Usarlas solo en:
- Último penal posible.
- Muerte súbita.
- Final del torneo.
- Evento extraño.
- Penal que define clasificación.

### Microcinemáticas

- Zoom corto a la pelota.
- Zoom al rostro o silueta del jugador.
- Oscurecer fondo un instante.
- Texto breve: “Último tiro”, “Todo o nada”, “Muerte súbita”.
- Camera shake en el impacto.

### Restricciones

- Deben durar entre 0.3 y 1.2 segundos.
- Deben poder omitirse fácilmente en código si afectan ritmo o peso.

## Modos de juego

### Tournament

- Modo principal.
- Selección de equipo.
- Bracket de 8.
- Avance automático.
- Pantalla final de campeón.

### Versus

- Dos jugadores locales.
- Tanda directa.
- Sin bracket.

### Sudden Death

- Penales infinitos hasta que uno falle y el otro anote.

### Chaos Mode

- Más probabilidad de eventos sorpresa.
- Barreras y rarezas más frecuentes.

## Dificultad CPU

- **Fácil:** más predecible, menos reacción correcta.
- **Normal:** mezcla decisiones razonables y errores.
- **Difícil:** lee patrones básicos del jugador y responde mejor.

## Regla de diseño para la CPU

- La CPU no debe “hacer trampa”.
- Debe usar pesos simples:
- Repetir si el jugador repite.
- Cubrir centro en momentos tensos.
- Arriesgar más en muerte súbita.

## UI / HUD

- Elementos mínimos:
- Nombre o abreviatura de equipo.
- Marcador de penales.
- Turno actual.
- Indicador de ronda del torneo.
- Texto especial en penales decisivos.

### Diseño visual

- Números grandes.
- Tipografía retro o bitmap simple.
- Colores planos.
- Borde grueso.
- Sin overlays recargados.

## Dirección de arte

- Estilo retro deportivo, similar a arcade/16-bit simplificado.
- Colores saturados, pero pocos.
- Sprites pequeños y legibles.
- Personajes compactos, casi caricaturescos.
- Campo, arco y estadio reducidos a lo esencial.

## Elementos visuales

- Fondo de estadio simple con dos o tres capas.
- Arco claro y visible.
- Red opcional simplificada.
- Jugador y portero como figuras de pocas formas.
- Balón de 4 a 8 píxeles o equivalente visual.

## Estrategia de arte

- **Prioridad 1:** dibujar todo con `Graphics`. [docs.phaser](https://docs.phaser.io/api-documentation/class/gameobjects-graphics)
- **Prioridad 2:** cuando un objeto se reutilice mucho, convertirlo a textura usando `generateTexture`, lo que Phaser soporta específicamente para gráficos reutilizables. [photonstorm.github](https://photonstorm.github.io/phaser3-docs/Phaser.GameObjects.Graphics.html)
- **Prioridad 3:** usar texturas generadas desde arrays o formas simples para patrones mínimos.
- Evitar spritesheets grandes.
- Evitar fondos ilustrados.
- Evitar escudos complejos o retratos.

## Sprites mínimos necesarios

- Pateador base.
- Portero base.
- Balón.
- Quizá una textura de red o panel de UI.

## Elementos procedural

- Todo lo demás debe ser procedural:
- Cancha.
- Arco.
- Sombras.
- Partículas.
- Flashes.
- Barreras.
- Íconos simples.

## Sonido

- Sin archivos de audio.
- Generar tonos sintéticos:
- Pitido inicial.
- Golpe de balón.
- Atajada.
- Gol.
- Fallo.
- Victoria.
- Deben ser ultra cortos.
- Estilo retro simple.
- Sin música al principio, salvo que luego quieras una melodía mínima generada por tonos.
- Phaser soporta audio basado en Web Audio, lo que favorece este enfoque sintético. [rexrainbow.github](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/audio/)

## Animaciones

- Muy cortas y expresivas.
- Reusar tweening para:
- Carrera del jugador.
- Desplazamiento del portero.
- Temblor de cámara.
- Rebote del balón.
- Sacudida del marcador.
- No usar demasiados frames dibujados.
- La ilusión de movimiento debe venir de posición, escala, rotación y squash/stretch.

## Bracket

- Visual simple:
- 4 cruces de cuartos.
- 2 cruces de semifinal.
- 1 final.
- No hace falta una pantalla compleja.
- Basta con:
- Llaves dibujadas.
- Nombre abreviado.
- Resaltado del partido actual.
- Avance del ganador.

## Variables de estado

- Modo de juego.
- Equipo seleccionado por jugador 1 y jugador 2 o CPU.
- Ronda actual.
- Score de la tanda.
- Turno de pateo.
- Número de penal.
- Estado especial del penal.
- Ganador del partido.
- Ganador del torneo.

## MVP prioritario

- Menú principal.
- Selección de equipo.
- Un solo partido funcional de penales.
- CPU básica.
- Gol / atajada / fallo.
- Marcador.
- Victoria / derrota.
- Bracket simple.
- Final de torneo.

## Backlog posterior

- Todo lo demás va después:
- Chaos mode.
- Más eventos.
- Versus completo.
- Microcinemáticas avanzadas.
- Extras visuales.

## Orden recomendado de implementación

1. Escena base y flujo entre menú, selección y partido.
2. HUD y marcador.
3. Lógica de selección de tiro y atajada.
4. Resolución del penal.
5. CPU y tanda completa.
6. Bracket de torneo.
7. Efectos, cámara, sonido y eventos especiales.
8. Compresión, limpieza y reducción de peso.

## Criterios de éxito del prototipo

- El jugador entiende el juego en menos de 15 segundos.
- Un penal se resuelve en menos de 4 segundos.
- Una tanda completa dura menos de 2 minutos.
- El juego genera tensión en penales decisivos.
- El build sigue siendo pequeño y no depende de assets externos.
- El loop ya es divertido incluso con arte provisional.
