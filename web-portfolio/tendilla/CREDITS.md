# Credits

Lumen Cardiology is a design study. The practice name, the address and the phone number (555 range) are fictional.

## 3D model (CC BY 4.0)

The heart and its vessels come from the Human Reference Atlas (HuBMAP), licensed under Creative Commons Attribution 4.0 (https://creativecommons.org/licenses/by/4.0/).

| Part used | Source | Creators |
|---|---|---|
| Heart chambers (left and right atrium, left and right ventricle) | 3D Reference Organ for Heart, Male, v1.3, https://lod.humanatlas.io/ref-organ/heart-male/v1.3 | Kristen Browne |
| Aorta, pulmonary trunk and arteries, pulmonary veins, venae cavae, cardiac veins, coronary arteries (left main, LAD and diagonals, left marginal, right coronary, right marginal, posterior descending) | 3D Reference Organ for Blood Vasculature, Male, v1.3, https://lod.humanatlas.io/ref-organ/blood-vasculature-male/v1.3 | Kristen Browne, Heidi Schlehlein |

Changes made: the parts listed above were taken from the two models and merged into one file (`assets/models/heart.glb`), recentred and scaled, the coronary arteries thickened by about 0.8 mm so they read at small sizes, colours replaced, and the geometry quantized to make the file smaller. `assets/models/paths.json` holds the centre lines of the coronary arteries, measured from the same model; the centre line of the ascending aorta is measured in the browser from the atlas aorta itself.

Why this model: it is a full anatomical heart with its aorta, pulmonary trunk and arteries, veins and the named coronary branches the ride follows, under a licence that allows reuse with credit and a direct download (no account). It was kept for v4; what changed is how it is lit, how it beats and how the camera travels through it.

Drawn in code on top of the atlas model (no other 3D files): the heartbeat (ventricles squeeze and twist, atria contract first, arteries swell with each pulse), the tissue look, the inside of the vessels for the ride (tubes built along the measured centre lines, sized from the atlas vessel walls, with real openings where branches leave), the aortic valve, blood cells and plasma, the narrowing and the stent with its balloon at the cath stop.

## Photos (Unsplash License)

All photos were toned to one monochrome palette for this site.

| File | Source |
|---|---|
| consult | https://unsplash.com/photos/lDH1fxwguxw |
| monitor | https://unsplash.com/photos/0lrJo37r6Nk |
| treadmill | https://unsplash.com/photos/_cUZkx0wTyM |
| theatre | https://unsplash.com/photos/j55TmqkzQ4k |
| plate | https://unsplash.com/photos/mmnKI8kMxpc |

## Map

The Contact section embeds a live Google Map (standard embed, no API key). Map data © Google.

## Type and code

Instrument Serif, Inter Tight and JetBrains Mono (SIL Open Font License, via Google Fonts). three.js (MIT), GSAP and ScrollTrigger (GSAP standard license), Lenis (MIT).
