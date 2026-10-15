# GOAT LEAGUE 2026

Landing estática (HTML + CSS + JS en un solo archivo, sin build). Rediseño visual de la web original manteniendo contenido, estructura y paleta.

## Archivos de imagen esperados (opcionales, junto a `index.html`)

| Archivo | Uso |
| --- | --- |
| `goat-icon.png` | Logo, favicon y marca de agua |
| `hero-goat-league.jpg` | Fondo del hero y vista previa al compartir |
| `goat-awards.jpg` | Foto de la sección Premios |
| `metrikas-logo.png` | Logo de Métrikas |

Si un archivo no está, la página muestra un reemplazo visual y no se rompe.

## Conectar el backend

En el bloque `window.GOAT_CONFIG` al final de `index.html`:

- `venue`: nombre, dirección y link de mapa de la sede (se replica en toda la página).
- `registrationApi`: endpoint `POST` JSON `{ team, manager, phone, categories[], message }`. Si está vacío, el formulario abre WhatsApp con los datos precargados.
- `competitionApi`: endpoint `GET` que recibe `tab` y `category` y devuelve `{ rows: [...] }` para pintar la tabla de posiciones, partidos, equipos, jugadores y goleadores.

## Deploy

Proyecto estático: en Vercel usar Framework Preset "Other", sin build command y sin output directory.
