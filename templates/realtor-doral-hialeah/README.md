# Casa Solana Realty

A static site: `index.html`, `css/`, `js/`, `assets/` and `listings.json`. No build step. Upload the folder to any web host.

## Add or edit a listing

Every home on the page comes from **`listings.json`**. Each home is one block between `{ }`. To add one, copy a block, paste it after the last one (with a comma between blocks) and change the values.

```json
{
  "id": "flamingo-way-house",
  "status": "for-sale",
  "agent": "yanelis",
  "price": 610000,
  "beds": 3,
  "baths": 2,
  "sqft": 1720,
  "year": 1961,
  "address": "West 68th Street",
  "neighborhood": "Hialeah",
  "map": [30, -48],
  "title": { "en": "Corner House on 68th", "es": "Casa de esquina en la 68" },
  "summary": { "en": "One or two sentences in English.", "es": "Una o dos frases en español." },
  "features": {
    "en": ["New impact windows", "Fenced yard"],
    "es": ["Ventanas de impacto nuevas", "Patio cercado"]
  },
  "photos": ["assets/img/flamingo-1.webp", "assets/img/flamingo-2.webp"],
  "thumb": "assets/img/flamingo-1.webp"
}
```

| Field | What it does |
|---|---|
| `id` | Short name, no spaces, unique. Used in the link to the home (`#home/flamingo-way-house`). |
| `status` | `for-sale`, `new`, `coming-soon`, `pending`, `sold` or `for-rent`. The label appears in English or Spanish automatically. For `for-rent`, the price shows "/mo". Sold homes hide the "Book a showing" button. |
| `agent` | The agent's `id` from the team list (`marisela`, `andres`, `yanelis`, `daniel`). Their name and color show on the card, the home's detail view and the 3D map. |
| `price` | Numbers only, no `$` or commas. |
| `beds`, `baths`, `sqft` | Numbers. `2.5` for two and a half baths. Leave a field out to hide it. |
| `year`, `lot` | Optional, shown in the detail view. `lot` takes both languages. |
| `map` | Optional `[x, z]` spot on the 3D map, where a dot in the agent's color appears. Rough guide: Miami Lakes `[-30, -52]`, Hialeah `[30, -40]`, Miami Springs `[48, 8]`, Doral `[-25, 0]`, Westchester `[-20, 52]`. Leave it out and the home just won't appear on the map. |
| `title`, `summary` | Text in both languages: `{ "en": "...", "es": "..." }`. |
| `features` | A short list per language. |
| `photos` | The gallery, in order. The first photo is the card image; the second appears when someone hovers the card. |
| `thumb` | Optional smaller copy of the first photo for the card. |

**Photos:** put them in `assets/img/`. About 1600 px wide, `.webp` or `.jpg`, under 300 KB each. A small copy named like `flamingo-1-s.webp` (about 760 px) is used for gallery thumbnails if it exists.

**Check your edit:** a missing comma breaks the file. Paste it into any JSON checker before uploading.

**Preview on your computer:** the listings load from the file, so open the site through a local server (for example `npx serve` in this folder) or upload it. Double-clicking `index.html` shows the page without the homes.

## The team

The agents live at the top of **`js/site.js`**, in the `agents` list. Each agent has:

- `id` (used by listings), `name`, `initials`, `color` (their color on the map, cards and profile)
- `role`, `focus`, `bio`, `langs`: in both languages
- `areas`, `phone`, `tel` (phone in `+1305...` form for the call and WhatsApp links), `email`
- `regions`: which map tiles light up for them (`lakes`, `hialeah`, `springs`, `doral`, `west`)
- `pin`: where their pin drops on the 3D map, `[x, z]`

**Headshots:** each card shows the agent's initials on their color until you add a photo. Save a portrait (3:4, about 900 x 1200 px) to `assets/img/team/`, then set `photo: 'assets/img/team/marisela.webp'` for that agent. The card and profile switch to the photo automatically.

## Other text

Every piece of text in `index.html` has its Spanish next to it in a `data-es` attribute:

```html
<h3 data-es="Para compradores">For buyers</h3>
```

Edit both. The visitor's language choice is remembered on their device. To open the site in Spanish by default, change `defaultLang:'en'` to `defaultLang:'es'` near the top of `index.html`.

## The contact form

The form checks the fields and shows a thank-you message, but does not send anything yet. Connect it to your CRM or a form service (Formspree, Netlify Forms, HubSpot, Follow Up Boss) by adding its `action` URL to the `<form>` tag and removing `data-lead`.
