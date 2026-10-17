# GOAT UI Kit

Botones con relieve, tarjetas de vidrio, chips, campos y animaciones (aparición, imán, inclinación, reflejo de luz, contadores y barra de progreso) listos para copiar a otra web. Es la misma capa visual de GOAT LEAGUE, sin nada del torneo.

## Qué trae
| Archivo | Para qué |
|---|---|
| `kit.css` | Estilos y variables de marca (edita solo `:root`) |
| `kit.js` | Efectos por atributos HTML |
| `motion.js` | Librería Motion (bundle propio de 7,8 KB comprimido: `scroll`, `inView`, `stagger` y animación ligera) |
| `fonts/` | Barlow Condensed ExtraBold Italic y Outfit (alojadas, sin Google Fonts) |
| `grain.svg` | Grano fino opcional |
| `demo.html` | Página de ejemplo con todos los componentes |

## Opción A: sitio HTML sin build (la más rápida)
1. Copia la carpeta `ui-kit` al sitio.
2. En el `<head>`: `<link rel="stylesheet" href="/ui-kit/kit.css">`
3. Antes de `</body>`: `<script src="/ui-kit/motion.js"></script>` y `<script src="/ui-kit/kit.js"></script>`
4. Añade `class="k-body"` al `<body>` y usa las clases de abajo.
5. Ajusta las rutas de `fonts/` y `grain.svg` dentro de `kit.css` si no quedan en la misma carpeta.

## Opción B: proyecto con npm (Next.js, React, Vite)
```bash
npm install motion
npx motion-ai
```
- `npm install motion` instala la librería. En JS puro: `import { animate, scroll, inView, stagger } from "motion"`. En React: `import { motion } from "motion/react"`.
- `npx motion-ai` instala las skills de Motion y configura sus servidores MCP para tu agente de IA (Claude Code, Codex, Cursor, etc.). No cambia tu código ni tus dependencias; solo mejora lo que el agente sabe de animación. Ejecútalo una vez en tu máquina.
- Aun así puedes usar `kit.css` en cualquier proyecto; `kit.js` es solo para sitios sin React.

## Clases
- Botones: `.k-btn`, `.k-btn--ghost`, `.k-btn--dark`, `.k-btn--round`, `.k-btn--whatsapp`
- Tarjetas: `.k-glass` (vidrio), `.k-cream` (crema), `.k-card-accent` (acento), `.k-gold` (oro)
- Otros: `.k-chip`, `.k-chip--accent`, `.k-field`, `.k-display` (titulares), `.k-accent`, `.k-progress`, `.k-grain`

## Efectos (atributos)
- `data-k-reveal`: aparece al entrar en pantalla, escalonado entre hermanos.
- `data-k-magnetic`: el botón sigue al cursor y vuelve con rebote.
- `data-k-tilt="6"`: inclinación 3D (grados máximos).
- `data-k-spotlight`: reflejo de luz que sigue al cursor (con `.k-glass`).
- `data-k-count="180"`: contador animado.
- `<div class="k-progress"></div>`: barra de progreso de scroll.

## Cambiar la marca
Edita las variables al inicio de `kit.css`: `--k-ink` (fondo oscuro), `--k-bone` (claro), `--k-accent` y `--k-accent-ink` (color de acción y su texto), `--k-brand`, `--k-gold`, `--k-radius`, `--k-display`, `--k-body`.
Consejo: usa el color de acción solo en botones y en el dato principal; si todo resalta, nada resalta.

## Notas técnicas
- Respeta `prefers-reduced-motion`: sin animaciones para quien lo pida.
- Funciona sin Motion (si no cargas `motion.js`, los efectos usan CSS básico).
- Si el sitio tiene CSP estricta, sirve `motion.js`, `kit.js`, las fuentes y las imágenes desde el mismo dominio (`'self'`) y no uses scripts en línea.
- `color-mix()` requiere navegadores de 2023 en adelante.

## Texto para pegar en otro chat con Claude
```
Quiero aplicar mi UI Kit a esta web. Adjunto/pego kit.css, kit.js y motion.js (y la carpeta fonts).
Reglas: no cambies la lógica ni los textos; usa las clases k-btn, k-glass, k-cream, k-chip y k-field;
usa el color de acción solo en botones y datos clave; cambia solo las variables :root de kit.css para mi paleta
(mis colores: <escribe aquí>). Añade data-k-reveal a las secciones, data-k-magnetic a los botones principales y
data-k-spotlight + data-k-tilt a las tarjetas de vidrio. Mantén accesibilidad (reduced-motion, contraste, foco visible),
mobile primero, sin desborde horizontal. Si la web tiene CSP, sirve todo desde el mismo dominio.
Antes de entregar, revisa en escritorio y móvil con capturas.
```
