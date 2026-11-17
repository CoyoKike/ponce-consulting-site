# Altura · Inés Calderón · Downtown condos

A static site: `index.html`, `css/`, `js/`, `assets/` and `listings.json`. No build step. Upload the folder to any web host.

## Add or edit a residence

Every residence on the page comes from **`listings.json`**: the cards in the Residences section, the glass panels that float around the tower in the 3D header (the first six), the detail view, and the "Residence" menu in the contact form.

Each residence is one block between `{ }`. To add one, copy an existing block, paste it after the last one (with a comma between blocks) and change the values.

```json
{
  "id": "riverline-2207",
  "status": "for-sale",
  "price": 1295000,
  "beds": 2,
  "baths": 2.5,
  "sqft": 1650,
  "floor": 22,
  "floors": 40,
  "hoa": 1180,
  "year": 2023,
  "address": "Residence 2207",
  "neighborhood": "Water Street",
  "building": { "en": "Riverline Residences, 2023", "es": "Riverline Residences, 2023" },
  "parking": { "en": "1 assigned space", "es": "1 espacio asignado" },
  "pets": { "en": "2 pets", "es": "2 mascotas" },
  "rentals": { "en": "Minimum 6-month lease", "es": "Alquiler mínimo de 6 meses" },
  "milestone": { "en": "Not due until 2053", "es": "No corresponde hasta 2053" },
  "title": { "en": "Riverline 2207", "es": "Riverline 2207" },
  "summary": { "en": "One or two sentences in English.", "es": "Una o dos frases en español." },
  "features": {
    "en": ["Corner unit", "River view"],
    "es": ["Unidad en esquina", "Vista al río"]
  },
  "photos": ["assets/img/riverline-2207-1.webp", "assets/img/riverline-2207-2.webp", "assets/img/riverline-2207-3.webp"],
  "thumb": "assets/img/riverline-2207-1-s.webp"
}
```

| Field | What it does |
|---|---|
| `id` | Short name, no spaces, unique. Used in the link to the residence (`#home/riverline-2207`). |
| `status` | `for-sale`, `new`, `coming-soon`, `pending`, `sold` or `for-rent`. The label is translated automatically. Sold residences hide the "Book a showing" button. |
| `price`, `hoa` | Numbers only, no `$` or commas. `hoa` is the monthly fee. |
| `beds`, `baths`, `sqft` | Numbers. `2.5` means two and a half baths. |
| `floor`, `floors` | The unit's floor and the building's height. Shown on the card and in the detail view. |
| `building`, `parking`, `pets`, `rentals`, `milestone` | Optional facts in both languages. Leave any out to hide that row. |
| `title`, `summary` | Text in both languages: `{ "en": "...", "es": "..." }`. |
| `features` | Short list per language for the detail view. |
| `photos` | The gallery, in order. The first photo is the card image. |
| `thumb` | Smaller copy of the first photo (about 760 px wide). Used on the card and on the 3D panel, so it loads fast. |

**Photos:** put them in `assets/img/`. About 1600 px wide, `.webp` or `.jpg`, under 300 KB each. A small copy with `-s` before the extension (for example `riverline-2207-1-s.webp`) is used for gallery thumbnails.

**Order:** residences appear in file order. The first six also become the floating panels in the header, so put your best six first.

**Check your edit:** a missing comma breaks the whole file. Paste it into any JSON checker before uploading.

**Preview locally:** the residences load from the file, so open the site through a local server (for example `npx serve` in this folder) or upload it. Double-clicking `index.html` shows the page without them.

## Change other text

All text in `index.html` carries its Spanish next to it in `data-es`:

```html
<h3 data-es="Si compra">If you are buying</h3>
```

Edit both. Visitors' language choice is remembered on their device.

## The contact form

The form checks the fields and shows a thank-you message, but does not send anything yet. Point it at your CRM or a form service (Formspree, Netlify Forms, HubSpot) by adding its `action` URL to the `<form>` tag and removing `data-lead`.

## Your photo

The About section uses an architecture photo. Replace `assets/img/e-glass.webp` with your own portrait (same name, or change the `src` in `index.html`).
