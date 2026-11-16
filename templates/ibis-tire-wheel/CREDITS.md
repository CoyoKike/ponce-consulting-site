# Credits

## Photos (Pexels License: free to use, no attribution required; credited anyway)
| File | Shows | Source | Photographer (Pexels account) |
|---|---|---|---|
| assets/img/change*.webp | Technician lifting a tire onto a changer | https://www.pexels.com/photo/6870311/ | Gustavo Fring |
| assets/img/wrench*.webp | Air wrench on a wheel, black and white | https://www.pexels.com/photo/8986133/ | Artem Podrez |
| assets/img/lift*.webp | Technician rolling a tire beside an SUV on a lift | https://www.pexels.com/photo/6870331/ | Gustavo Fring |
| assets/img/kneel*.webp | Mechanic kneeling with an impact wrench | https://www.pexels.com/photo/6870318/ | Gustavo Fring |
| assets/img/align*.webp | Car on an alignment rack | https://www.pexels.com/photo/38324578/ | gunshe |
| assets/img/align2*.webp | Technician adjusting an alignment sensor | https://www.pexels.com/photo/3806280/ | Andrea Piacquadio |
| assets/img/stack*.webp | Stacked tires, tread pattern | https://www.pexels.com/photo/37002235/ | wal_ (172619) |
| assets/img/alloy*.webp | Alloy wheel on a stack of tires | https://www.pexels.com/photo/34357281/ | introspectivedsgn |
| assets/img/wheels*.webp | Wall of alloy wheels | https://www.pexels.com/photo/36202185/ | Austin Briones |
| assets/img/gauge*.webp | Tread depth gauge | https://www.pexels.com/photo/37091334/ | Giovanni Spoletini |
| assets/img/tread*.webp | Tire tread on asphalt | https://www.pexels.com/photo/20303832/ | Mike Bird |
| assets/img/shelf*.webp | Tires on a storage rack | https://www.pexels.com/photo/5640639/ | Tima Miroshnichenko |
| assets/img/mech*.webp | Mechanic changing a wheel | https://www.pexels.com/photo/17600886/ | Frans van Heerden |

Images were resized and converted to WebP (1600 px and 800 px). Two were cropped to remove third-party logos.

## 3D
The hero tire and wheel are modeled in code in `js/wheel.js`: the tread is displaced geometry (four circumferential grooves, directional shoulder blocks, center sipes), sidewall lettering is a generated bump map, and the twin-spoke wheel, drilled rotor and caliper are extruded shapes. The tire wording is invented. Reflections use three.js RoomEnvironment. No downloaded models.

## Code and fonts
- three.js r170 (MIT), GSAP 3.13 + ScrollTrigger (GreenSock standard license, free), Lenis (MIT), all vendored in `assets/vendor`.
- Fonts: Anybody (OFL), Inter Tight (OFL), JetBrains Mono (OFL), from Google Fonts, self-hosted.
