/* Demo data for the Vecina concept site.
   Every listing below is made up: names, phone numbers (617-555-01xx, reserved for fiction) and hours are invented,
   and each point is placed near the centre of a real Boston neighbourhood, not at a real address. */
window.VECINA_PLACES = [
  { n: 'Roxbury', zip: '02119', lat: 42.3245, lng: -71.0855 },
  { n: 'Dorchester', zip: '02124', lat: 42.2970, lng: -71.0640 },
  { n: 'Mattapan', zip: '02126', lat: 42.2690, lng: -71.0930 },
  { n: 'Jamaica Plain', zip: '02130', lat: 42.3100, lng: -71.1140 },
  { n: 'East Boston', zip: '02128', lat: 42.3750, lng: -71.0380 },
  { n: 'South End', zip: '02118', lat: 42.3410, lng: -71.0760 },
  { n: 'Chinatown', zip: '02111', lat: 42.3500, lng: -71.0620 },
  { n: 'Allston', zip: '02134', lat: 42.3530, lng: -71.1320 },
  { n: 'Brighton', zip: '02135', lat: 42.3480, lng: -71.1530 },
  { n: 'Hyde Park', zip: '02136', lat: 42.2560, lng: -71.1240 },
  { n: 'Roslindale', zip: '02131', lat: 42.2870, lng: -71.1270 },
  { n: 'West Roxbury', zip: '02132', lat: 42.2790, lng: -71.1590 },
  { n: 'Charlestown', zip: '02129', lat: 42.3780, lng: -71.0600 },
  { n: 'South Boston', zip: '02127', lat: 42.3350, lng: -71.0480 },
  { n: 'Mission Hill', zip: '02120', lat: 42.3330, lng: -71.1030 },
  { n: 'Back Bay', zip: '02116', lat: 42.3500, lng: -71.0810 }
];

/* c = category: food, health, housing, community, legal, work
   d = days: wk (Mon–Fri), ws (Mon–Sat), tt (Tue and Thu), mw (Mon, Wed, Fri), sa (Saturday), ev (every day)
   l = languages spoken besides English */
window.VECINA_LISTINGS = [
  { id: 1,  name: 'Larkspur Table Pantry', c: 'food', p: 'Roxbury', dx: .004, dy: -.003, d: 'tt', h: '10:00–14:00', l: ['es', 'ht'], walk: true },
  { id: 2,  name: 'Harvest Ring Community Fridge', c: 'food', p: 'Dorchester', dx: -.003, dy: .004, d: 'ev', h: '8:00–20:00', l: ['es', 'vi'], walk: true },
  { id: 3,  name: 'Bluefield Family Health', c: 'health', p: 'Dorchester', dx: .006, dy: -.002, d: 'wk', h: '8:30–17:00', l: ['es', 'vi', 'ht'] },
  { id: 4,  name: 'Wren Hill Community Lunch Club', c: 'community', p: 'Mattapan', dx: .002, dy: .003, d: 'wk', h: '11:30–13:30', l: ['ht'] },
  { id: 5,  name: 'Cedar Lantern Housing Desk', c: 'housing', p: 'Mattapan', dx: -.004, dy: -.002, d: 'mw', h: '9:00–16:00', l: ['ht', 'es'] },
  { id: 6,  name: 'Pondside Legal Clinic', c: 'legal', p: 'Jamaica Plain', dx: .003, dy: .002, d: 'tt', h: '17:30–19:30', l: ['es'] },
  { id: 7,  name: 'Greenhouse Job Lab', c: 'work', p: 'Jamaica Plain', dx: -.005, dy: -.003, d: 'wk', h: '9:00–17:00', l: ['es'] },
  { id: 8,  name: 'Harborlight Food Share', c: 'food', p: 'East Boston', dx: .002, dy: -.004, d: 'sa', h: '9:00–12:00', l: ['es', 'pt'], walk: true },
  { id: 9,  name: 'Tidewater Neighborhood Clinic', c: 'health', p: 'East Boston', dx: -.004, dy: .003, d: 'ws', h: '8:00–18:00', l: ['es', 'pt', 'ar'] },
  { id: 10, name: 'Copper Kettle Family Meals', c: 'community', p: 'South End', dx: .003, dy: .002, d: 'wk', h: '11:00–14:00', l: ['es', 'zh'] },
  { id: 11, name: 'Brickrow Tenant Help', c: 'housing', p: 'South End', dx: -.003, dy: -.003, d: 'wk', h: '10:00–18:00', l: ['es'] },
  { id: 12, name: 'Jade Lane Wellness Center', c: 'health', p: 'Chinatown', dx: .001, dy: .002, d: 'ws', h: '9:00–17:30', l: ['zh', 'vi'] },
  { id: 13, name: 'Lantern Court Family Center', c: 'community', p: 'Chinatown', dx: -.002, dy: -.002, d: 'wk', h: '9:00–16:00', l: ['zh'] },
  { id: 14, name: 'Riverbend Pantry Collective', c: 'food', p: 'Allston', dx: .003, dy: -.002, d: 'mw', h: '15:00–19:00', l: ['es', 'pt', 'zh'], walk: true },
  { id: 15, name: 'Northgate Career Studio', c: 'work', p: 'Allston', dx: -.004, dy: .002, d: 'wk', h: '9:00–17:00', l: ['pt'] },
  { id: 16, name: 'Hollis Park Legal Aid Night', c: 'legal', p: 'Brighton', dx: .002, dy: .003, d: 'tt', h: '18:00–20:00', l: ['es', 'ru'] },
  { id: 17, name: 'Sparrow House Shelter Line', c: 'housing', p: 'Brighton', dx: -.003, dy: -.002, d: 'ev', h: '0:00–24:00', l: ['es', 'ru', 'pt'] },
  { id: 18, name: 'Millbrook Community Kitchen', c: 'food', p: 'Hyde Park', dx: .004, dy: .002, d: 'wk', h: '12:00–14:00', l: ['ht', 'es'], walk: true },
  { id: 19, name: 'Stonebridge Neighborhood Rides', c: 'community', p: 'Hyde Park', dx: -.003, dy: -.003, d: 'wk', h: '8:00–15:00', l: ['ht'] },
  { id: 20, name: 'Arborway Health Partners', c: 'health', p: 'Roslindale', dx: .002, dy: -.002, d: 'wk', h: '8:00–19:00', l: ['es', 'el'] },
  { id: 21, name: 'Juniper Square Job Center', c: 'work', p: 'Roslindale', dx: -.003, dy: .003, d: 'mw', h: '10:00–15:00', l: ['es'] },
  { id: 22, name: 'Westgate Youth and Family Hub', c: 'community', p: 'West Roxbury', dx: .003, dy: .002, d: 'wk', h: '9:00–17:00', l: ['ga'] },
  { id: 23, name: 'Navy Yard Food Bench', c: 'food', p: 'Charlestown', dx: .002, dy: -.002, d: 'tt', h: '14:00–18:00', l: ['es'], walk: true },
  { id: 24, name: 'Ropewalk Housing Counsel', c: 'housing', p: 'Charlestown', dx: -.003, dy: .002, d: 'wk', h: '9:00–17:00', l: ['es'] },
  { id: 25, name: 'Seawall Family Clinic', c: 'health', p: 'South Boston', dx: .003, dy: .002, d: 'ws', h: '8:00–20:00', l: ['es', 'pl'] },
  { id: 26, name: 'Channel Street Career Hub', c: 'work', p: 'South Boston', dx: -.004, dy: -.002, d: 'wk', h: '9:00–17:00', l: ['es'] },
  { id: 27, name: 'Parker Hill Pantry', c: 'food', p: 'Mission Hill', dx: .002, dy: .002, d: 'sa', h: '10:00–13:00', l: ['es'], walk: true },
  { id: 28, name: 'Hilltop Benefits Help', c: 'legal', p: 'Mission Hill', dx: -.002, dy: -.003, d: 'wk', h: '10:00–16:00', l: ['es', 'ht'] },
  { id: 29, name: 'Fenway Bridge Community Center', c: 'community', p: 'Back Bay', dx: -.003, dy: .002, d: 'wk', h: '8:30–16:30', l: ['es', 'zh'] },
  { id: 30, name: 'Copley Workforce Corner', c: 'work', p: 'Back Bay', dx: .003, dy: -.002, d: 'wk', h: '9:00–17:00', l: ['es'] },
  { id: 31, name: 'Highland Light Housing Office', c: 'housing', p: 'Roxbury', dx: -.004, dy: .003, d: 'wk', h: '9:00–17:00', l: ['es', 'so'] },
  { id: 32, name: 'Orchard Commons Legal Help', c: 'legal', p: 'Roxbury', dx: .001, dy: .006, d: 'mw', h: '13:00–17:00', l: ['es', 'kea'] },
  { id: 33, name: 'Fields Corner Community Café', c: 'community', p: 'Dorchester', dx: .001, dy: -.006, d: 'wk', h: '10:00–14:00', l: ['vi', 'kea'] },
  { id: 34, name: 'Blue Hill Health Station', c: 'health', p: 'Mattapan', dx: .005, dy: .001, d: 'ws', h: '9:00–18:00', l: ['ht', 'es'] },
  { id: 35, name: 'Centre Street Free Market', c: 'food', p: 'West Roxbury', dx: -.003, dy: -.002, d: 'sa', h: '9:00–11:00', l: [], walk: true },
  { id: 36, name: 'Eastside Tenants Together', c: 'housing', p: 'East Boston', dx: .001, dy: .005, d: 'tt', h: '17:00–20:00', l: ['es', 'pt'] }
];
