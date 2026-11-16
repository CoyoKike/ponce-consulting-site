// Marejada Studio · the weekly schedule.
// To change the week, edit WEEK below: one line per class.
//   [ start time (24h), class type, coach, level, minutes, spots left ]
// Class types and coaches are listed once at the top so names stay the same everywhere.

export const TYPES = {
  strength: { en: 'Strength', es: 'Fuerza' },
  reformer: { en: 'Reformer', es: 'Reformer' },
  ride:     { en: 'Ride',     es: 'Ciclo' },
  mobility: { en: 'Mobility', es: 'Movilidad' },
};

export const TITLES = {
  'strength-lower': { type: 'strength', en: 'Strength · Lower',      es: 'Fuerza · Tren inferior' },
  'strength-upper': { type: 'strength', en: 'Strength · Upper',      es: 'Fuerza · Tren superior' },
  'strength-full':  { type: 'strength', en: 'Strength · Full Body',  es: 'Fuerza · Cuerpo completo' },
  'reformer-flow':  { type: 'reformer', en: 'Reformer Flow',         es: 'Reformer Flow' },
  'reformer-burn':  { type: 'reformer', en: 'Reformer Burn',         es: 'Reformer Intenso' },
  'ride-45':        { type: 'ride',     en: 'Ride 45',               es: 'Ciclo 45' },
  'ride-climb':     { type: 'ride',     en: 'Ride · The Climb',      es: 'Ciclo · La Subida' },
  'ride-long':      { type: 'ride',     en: 'Sunday Long Ride',      es: 'Ciclo Largo de Domingo' },
  'mobility-reset': { type: 'mobility', en: 'Mobility Reset',        es: 'Movilidad Reset' },
};

export const COACHES = { ines: 'Inés', dario: 'Darío', tamsin: 'Tamsin', mateo: 'Mateo' };

export const LEVELS = {
  all:  { en: 'All levels',  es: 'Todos los niveles' },
  open: { en: 'Open',        es: 'Abierta' },
  push: { en: 'Push',        es: 'Exigente' },
};

// 1 = Monday … 7 = Sunday
export const WEEK = {
  1: [
    ['05:45', 'strength-lower', 'ines',   'all',  50, 3],
    ['07:00', 'ride-45',        'dario',  'open', 45, 6],
    ['09:30', 'reformer-flow',  'tamsin', 'all',  50, 2],
    ['12:15', 'mobility-reset', 'mateo',  'all',  40, 9],
    ['17:30', 'strength-full',  'ines',   'open', 50, 4],
    ['18:45', 'ride-climb',     'dario',  'push', 45, 1],
  ],
  2: [
    ['05:45', 'ride-climb',     'dario',  'push', 45, 5],
    ['07:00', 'reformer-burn',  'tamsin', 'push', 50, 0],
    ['12:15', 'strength-upper', 'mateo',  'open', 50, 7],
    ['17:30', 'reformer-flow',  'tamsin', 'all',  50, 3],
    ['18:45', 'strength-lower', 'ines',   'open', 50, 6],
  ],
  3: [
    ['05:45', 'strength-full',  'ines',   'open', 50, 2],
    ['07:00', 'ride-45',        'dario',  'open', 45, 8],
    ['09:30', 'mobility-reset', 'mateo',  'all',  40, 10],
    ['12:15', 'reformer-flow',  'tamsin', 'all',  50, 4],
    ['17:30', 'ride-climb',     'dario',  'push', 45, 2],
    ['18:45', 'reformer-burn',  'tamsin', 'push', 50, 5],
  ],
  4: [
    ['05:45', 'reformer-burn',  'tamsin', 'push', 50, 1],
    ['07:00', 'strength-upper', 'ines',   'open', 50, 6],
    ['12:15', 'ride-45',        'dario',  'open', 45, 9],
    ['17:30', 'strength-lower', 'ines',   'push', 50, 0],
    ['18:45', 'mobility-reset', 'mateo',  'all',  40, 11],
  ],
  5: [
    ['05:45', 'ride-45',        'dario',  'open', 45, 7],
    ['07:00', 'strength-full',  'mateo',  'all',  50, 5],
    ['09:30', 'reformer-flow',  'tamsin', 'all',  50, 3],
    ['17:30', 'ride-climb',     'dario',  'push', 45, 4],
  ],
  6: [
    ['07:30', 'strength-full',  'ines',   'open', 50, 2],
    ['08:45', 'ride-climb',     'dario',  'push', 45, 0],
    ['10:00', 'reformer-flow',  'tamsin', 'all',  50, 4],
    ['11:15', 'mobility-reset', 'mateo',  'all',  40, 8],
  ],
  7: [
    ['08:30', 'ride-long',      'dario',  'open', 60, 5],
    ['10:00', 'mobility-reset', 'mateo',  'all',  40, 12],
  ],
};

export const CAPACITY = 14;
