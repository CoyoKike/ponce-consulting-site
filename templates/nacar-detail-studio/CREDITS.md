# Credits

## Photos (Pexels License: free to use, no attribution required; credited anyway)
| File | Shows | Source | Photographer (Pexels account) |
|---|---|---|---|
| assets/img/studio*.webp | Detailer rinsing a sports car under strip lights | https://www.pexels.com/photo/6873008/ | Tima Miroshnichenko |
| assets/img/polish*.webp | Polisher on dark paint | https://www.pexels.com/photo/14615262/ | dextarstudio |
| assets/img/polish2*.webp | Detailer polishing a silver car | https://www.pexels.com/photo/14615269/ | dextarstudio |
| assets/img/buff*.webp | Polishing pad on a black panel | https://www.pexels.com/photo/14231684/ | Luke Miller |
| assets/img/beads*.webp | Water beads on blue metallic paint | https://www.pexels.com/photo/28215512/ | Atlantic Opus |
| assets/img/hood*.webp | Dark hood covered in water drops | https://www.pexels.com/photo/29909550/ | Kagan Karatay |
| assets/img/red*.webp | Rain on a red car roof | https://www.pexels.com/photo/32474952/ | Pexels user 236636281 |
| assets/img/white*.webp | White panel with water drops and strip-light reflections | https://www.pexels.com/photo/6873177/ | Tima Miroshnichenko |
| assets/img/coat*.webp | Water beading on dark paint beside a headlight | https://www.pexels.com/photo/17216297/ | Adonyi Foto |
| assets/img/wash*.webp | Detailer wiping foam off a silver car | https://www.pexels.com/photo/6872176/ | Tima Miroshnichenko |
| assets/img/wheel*.webp | Detailer cleaning a wire wheel | https://www.pexels.com/photo/35244783/ | Mike Kutz |

Images were resized and converted to WebP (1600 px and 800 px). One was cropped to remove a third-party business sign.

## 3D
The hero paint panel is generated in code in `js/paint.js`: a curved body panel with a character line, metallic flake and clearcoat (three.js MeshPhysicalMaterial), a procedural swirl-mark clearcoat normal map for the before side, refractive water beads on the coated side, and a studio of hexagon lights and strip softboxes rendered into the reflection cubemap. No downloaded models or HDRIs.

## Code and fonts
- three.js r170 (MIT), GSAP 3.13 + ScrollTrigger (GreenSock standard license, free), Lenis (MIT), all vendored in `assets/vendor`.
- Fonts: Bodoni Moda (OFL), Hanken Grotesk (OFL), from Google Fonts, self-hosted.
