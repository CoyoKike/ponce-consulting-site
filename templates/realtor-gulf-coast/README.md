# Marsh & Ibarra · Gulf Coast Homes

A static site: `index.html`, `css/`, `js/`, `assets/` and `listings.json`. No build step. Upload the whole folder to any web host.

## Add or edit a home

Every home on the page comes from **`listings.json`**. Each home is one block between `{ }`. To add one, copy a block, paste it after the last one (with a comma between blocks) and change the values.

```json
{
  "id": "gulf-view-405",
  "status": "for-sale",
  "price": 1290000,
  "beds": 2,
  "baths": 2,
  "sqft": 1640,
  "year": 2004,
  "lot": { "en": "4th floor, Gulf view", "es": "Piso 4, vista al Golfo" },
  "address": "Gulf Shore Drive, Unit 405",
  "neighborhood": "Marco Island",
  "title": { "en": "Gulf View 405", "es": "Vista al Golfo 405" },
  "summary": { "en": "One or two sentences in English.", "es": "Una o dos frases en español." },
  "season": { "en": "Leasing: 30-day minimum.", "es": "Alquiler: mínimo 30 días." },
  "features": {
    "en": ["Updated kitchen", "Heated pool"],
    "es": ["Cocina renovada", "Piscina climatizada"]
  },
  "photos": ["assets/img/gulf-view-1.webp", "assets/img/gulf-view-2.webp"],
  "thumb": "assets/img/gulf-view-1.webp"
}
```

| Field | What it does |
|---|---|
| `id` | A short name with no spaces, unique. It becomes the home's link: `#home/gulf-view-405`. |
| `status` | `for-sale`, `new`, `coming-soon`, `pending`, `sold` or `for-rent`. The label appears in English or Spanish on its own. Sold homes hide the "Book a showing" button. |
| `price` | Numbers only, no `$` or commas. For rentals, the monthly rent. |
| `beds`, `baths`, `sqft` | Numbers. `3.5` means three and a half baths. Leave a field out to hide it. |
| `season` | Optional. Rental rules or seasonal notes, shown on the card and in the detail view. |
| `title`, `summary`, `lot`, `season` | Text in both languages: `{ "en": "...", "es": "..." }`. |
| `features` | A short list in each language for the detail view. |
| `photos` | The gallery in order. The first photo is the card image; the second appears when a visitor hovers the card. |
| `thumb` | Optional smaller copy of the first photo for faster cards. |

**Photos:** save them in `assets/img/`. Landscape, about 1600 px wide, `.webp` or `.jpg` under 300 KB. A small copy named `name-s.webp` (about 760 px wide) is used for gallery thumbnails if present.

**Check before uploading:** a missing comma breaks the file. Paste it into any online JSON checker first.

**Preview on your computer:** homes load from the file, so run a local server in this folder (for example `npx serve`) or upload the site. Double-clicking `index.html` shows the page without the homes.

## Change other text

Every piece of text in `index.html` carries its Spanish version beside it:

```html
<h3 data-es="Para compradores">For buyers</h3>
```

Edit both. Each visitor's language choice is remembered on their device.

## The contact form

The form checks the fields and shows a thank-you message, but does not send anything yet. To receive requests, point the `<form>` at your CRM or a form service (Formspree, Netlify Forms, HubSpot) with an `action` URL and remove `data-lead`.

## Your photos

The About section uses two agent cards without portraits. To add headshots, place them in `assets/img/` and add an `<img>` at the top of each `.person` card.
