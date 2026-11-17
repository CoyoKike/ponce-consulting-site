# Casa Montalvo · sitio web

Sitio estático: `index.html`, `css/`, `js/`, `assets/` y `listings.json`. No necesita compilación. Suba la carpeta completa a cualquier hosting.

*(English below.)*

## Agregar o editar una casa

Todas las casas de la página salen de **`listings.json`**. Cada casa es un bloque entre `{ }`. Para agregar una, copie un bloque, péguelo después del último (con una coma entre bloques) y cambie los valores:

```json
{
  "id": "casa-del-parque",
  "status": "for-sale",
  "price": 465000,
  "beds": 4,
  "baths": 2.5,
  "sqft": 2210,
  "year": 2016,
  "lot": { "es": "Patio cercado", "en": "Fenced yard" },
  "address": "Harmony",
  "neighborhood": "St. Cloud",
  "title": { "es": "Casa del Parque", "en": "Park House" },
  "summary": { "es": "Una o dos frases en español.", "en": "One or two sentences in English." },
  "features": {
    "es": ["Piscina con tela metálica", "Cerca de la escuela"],
    "en": ["Screened pool", "Near the school"]
  },
  "photos": ["assets/img/parque-1.webp", "assets/img/parque-2.webp", "assets/img/parque-3.webp"],
  "thumb": "assets/img/parque-1.webp"
}
```

| Campo | Qué hace |
|---|---|
| `id` | Nombre corto sin espacios. Es el enlace directo a la casa (`#home/casa-del-parque`). No se puede repetir. |
| `status` | Uno de: `for-sale` (En venta), `new` (Recién listada), `coming-soon` (Muy pronto), `pending` (Bajo contrato), `sold` (Vendida), `for-rent` (En alquiler). La etiqueta sale en español o inglés sola. Las vendidas no muestran el botón de visita. |
| `price` | Solo números, sin `$` ni comas. |
| `beds`, `baths`, `sqft` | Números. Use `2.5` para dos baños y medio. Si quita un campo, no se muestra. |
| `year`, `lot` | Opcionales; se ven en el detalle de la casa. |
| `title`, `summary`, `lot` | Texto en los dos idiomas: `{ "es": "...", "en": "..." }`. |
| `features` | Lista corta por idioma, en el detalle. |
| `photos` | La galería, en orden. La primera es la foto de la tarjeta. |
| `thumb` | Opcional: copia pequeña de la primera foto para que la tarjeta cargue más rápido. |

**Fotos:** guárdelas en `assets/img/`. Horizontales de unos 1600 px de ancho, en `.webp` o `.jpg`, menos de 300 KB cada una. Si guarda también una copia pequeña con `-s` al final (por ejemplo `parque-1-s.webp`, unos 760 px), la galería la usa para las miniaturas.

**Orden:** las casas salen en el mismo orden del archivo.

**Revise antes de subir:** una coma de más o de menos rompe el archivo. Pegue el archivo en cualquier validador de JSON antes de subirlo.

**Vista previa en su computadora:** las casas se cargan desde el archivo, así que abra el sitio con un servidor local (por ejemplo `npx serve` en esta carpeta) o súbalo. Si abre `index.html` con doble clic, la página se ve pero sin las casas.

## Cambiar otros textos

El texto de `index.html` está en español y el inglés va al lado, en `data-en`:

```html
<h3 data-en="Your first home">Su primera casa</h3>
```

Cambie los dos. El sitio abre en español la primera vez y recuerda el idioma que eligió cada visitante.

## El formulario

El formulario revisa los campos y muestra un mensaje de gracias, pero todavía no envía nada. Conéctelo a su CRM o a un servicio de formularios (Formspree, Netlify Forms, HubSpot) poniendo la dirección en el `action` de la etiqueta `<form>` y quitando `data-lead`.

## Sus fotos

- **Sobre nosotras:** cambie `assets/img/e-party.webp` por una foto suya (mismo nombre, o cambie el `src` en `index.html`).
- **Casa abierta del inicio:** el recuadro "Casa abierta" está en `index.html` (busque `openhouse`). El botón abre la casa con el `id` que ponga en `data-open`.

---

## English

All homes come from `listings.json` (see the table above: `es`/`en` pairs for text, numbers without `$` or commas, photos in `assets/img/`). Page text is Spanish in the markup with English in `data-en` attributes. The form shows a thank-you message but does not send; add your form service's URL as the `<form action>` and remove `data-lead`. Preview through a local server (`npx serve`) or after uploading, since the homes load from the JSON file.
