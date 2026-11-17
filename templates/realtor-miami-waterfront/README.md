# Camila Arrieta · Waterfront Residences

A static site: `index.html`, `css/`, `js/`, `assets/` and `listings.json`. No build step. Upload the folder to any web host.

## Add or edit a listing

All homes on the page come from **`listings.json`**. Each home is one block between `{ }`. To add a home, copy an existing block, paste it after the last one (put a comma between blocks), and change the values.

```json
{
  "id": "bay-point-house",
  "status": "for-sale",
  "price": 6250000,
  "beds": 5,
  "baths": 4.5,
  "sqft": 4980,
  "year": 2015,
  "lot": { "en": "90 ft of bay frontage", "es": "90 pies frente a la bahía" },
  "address": "Bay Point Drive",
  "neighborhood": "Miami",
  "title": { "en": "Bay Point House", "es": "Casa Bay Point" },
  "summary": { "en": "One or two sentences in English.", "es": "Una o dos frases en español." },
  "features": {
    "en": ["Dock with lift", "Pool and spa"],
    "es": ["Muelle con elevador", "Piscina y spa"]
  },
  "photos": ["assets/img/bay-point-1.webp", "assets/img/bay-point-2.webp", "assets/img/bay-point-3.webp"],
  "thumb": "assets/img/bay-point-1.webp"
}
```

| Field | What it does |
|---|---|
| `id` | A short name with no spaces. Used in the link to the home (`#home/bay-point-house`). Must be unique. |
| `status` | One of `for-sale`, `new`, `coming-soon`, `pending`, `sold`, `for-rent`. The label shows in English or Spanish automatically. Sold homes hide the "Book a showing" button. |
| `price` | Numbers only, no `$` or commas. |
| `beds`, `baths`, `sqft` | Numbers. Use `4.5` for four and a half baths. Leave a field out to hide it. |
| `year`, `lot` | Optional extras shown in the home's detail view. |
| `title`, `summary`, `lot` | Text in both languages: `{ "en": "...", "es": "..." }`. |
| `features` | A short list per language, shown in the detail view. |
| `photos` | The gallery, in order. The first photo is the card image. |
| `thumb` | Optional smaller copy of the first photo for the card (loads faster). |

**Photos:** put them in `assets/img/`. Landscape photos about 1600 px wide look best; save as `.webp` or `.jpg` under 300 KB each. If you also save a small copy named like `bay-point-1-s.webp` (about 760 px wide), the gallery uses it for the thumbnails.

**Order:** homes show in the same order as the file. The page lays them out in a magazine rhythm, large then small.

**Check your edit:** a missing comma breaks the file. Paste the whole file into any JSON checker before uploading.

**Preview on your computer:** the listings load from the file, so open the site through a local server (for example `npx serve` in this folder) or upload it. Double-clicking `index.html` will show the page without the homes.

## Change other text

Every piece of text in `index.html` has its Spanish next to it in a `data-es` attribute:

```html
<h3 data-es="Para compradores">For buyers</h3>
```

Edit both. The visitor's language choice is remembered on their device.

## The contact form

The form checks the fields and shows a thank-you message, but does not send anything yet. Connect it to your CRM or a form service (Formspree, Netlify Forms, HubSpot) by adding its `action` URL to the `<form>` tag and removing `data-lead`.

## Your photo

The About section uses a photo from the water. Replace `assets/img/e-yacht.webp` with your own portrait or a photo of you on the boat (same name, or update the `src` in `index.html`).
