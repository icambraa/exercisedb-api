import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

type Exercise = {
  exerciseId: string;
  name: string;
  gifUrl: string;
  targetMuscles: string[];
  bodyParts: string[];
  equipments: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
  nameEs?: string;
};

function toSentenceCase(input: string): string {
  const lower = input.trim().toLowerCase();
  if (!lower) return lower;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function normalize(input: string): string {
  return input
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Ordered replacements: longest phrases first to avoid partial clobbering
const phraseReplacements: Array<[RegExp, string]> = [
  // positions / benches / general
  [/smith machine/gi, 'multipower'],
  [/trap bar|hex bar/gi, 'barra hexagonal'],
  [/ez[- ]?bar/gi, 'barra Z'],
  [/barbell/gi, 'barra'],
  [/dumbbells?|db\b/gi, 'mancuernas'],
  [/kettlebell/gi, 'kettlebell'],
  [/band(s)?/gi, 'banda elástica'],
  [/resistance band(s)?/gi, 'banda elástica'],
  [/cable(s)?/gi, 'polea'],
  [/machine/gi, 'máquina'],
  [/body ?weight/gi, 'peso corporal'],
  [/incline(d)?/gi, 'inclinado'],
  [/decline(d)?/gi, 'declinado'],
  [/flat bench/gi, 'banco plano'],
  [/bench/gi, 'banco'],
  [/stability ball|exercise ball|swiss ball/gi, 'fitball'],
  [/on ball/gi, 'en fitball'],
  [/on bench/gi, 'en banco'],
  [/seated/gi, 'sentado'],
  [/standing/gi, 'de pie'],
  [/lying|supine/gi, 'tumbado'],
  [/prone/gi, 'prono'],
  [/kneeling/gi, 'de rodillas'],
  [/one[- ]?arm|single[- ]?arm/gi, 'a una mano'],
  [/one[- ]?leg|single[- ]?leg/gi, 'a una pierna'],
  [/alternating/gi, 'alterno'],
  [/close[- ]?grip/gi, 'agarre cerrado'],
  [/wide[- ]?grip/gi, 'agarre ancho'],
  [/shoulder[- ]?width/gi, 'a la anchura de hombros'],
  [/neutral[- ]?grip/gi, 'agarre neutro'],
  [/overhand|pronated/gi, 'agarre prono'],
  [/underhand|supinated/gi, 'agarre supino'],

  // movements
  [/push[- ]?up(s)?/gi, 'flexiones'],
  [/pull[- ]?up(s)?/gi, 'dominadas'],
  [/chin[- ]?up(s)?/gi, 'dominadas supinas'],
  [/dip(s)?/gi, 'fondos'],
  [/bench press/gi, 'press de banca'],
  [/shoulder press|overhead press|military press/gi, 'press militar'],
  [/incline press/gi, 'press inclinado'],
  [/decline press/gi, 'press declinado'],
  [/chest press/gi, 'press de pecho'],
  [/press/gi, 'press'],
  [/squat(s)?/gi, 'sentadilla'],
  [/deadlift(s)?/gi, 'peso muerto'],
  [/romanian deadlift|rdl/gi, 'peso muerto rumano'],
  [/hip thrust/gi, 'empuje de cadera'],
  [/glute bridge/gi, 'puente de glúteos'],
  [/lunge(s)?/gi, 'zancadas'],
  [/split squat/gi, 'sentadilla búlgara'],
  [/step[- ]?up(s)?/gi, 'subidas al cajón'],
  [/row(s)?/gi, 'remo'],
  [/pulldown(s)?/gi, 'jalón'],
  [/pullover/gi, 'pull-over'],
  [/flye?s?/gi, 'aperturas'],
  [/crossover/gi, 'cruce'],
  [/curl(s)?/gi, 'curl'],
  [/extension(s)?/gi, 'extensión'],
  [/raise(s)?/gi, 'elevación'],
  [/lateral raise(s)?/gi, 'elevaciones laterales'],
  [/front raise(s)?/gi, 'elevaciones frontales'],
  [/rear delt/gi, 'deltoide posterior'],
  [/shrug(s)?/gi, 'encogimientos'],
  [/calf raise(s)?/gi, 'elevaciones de gemelos'],
  [/leg curl(s)?/gi, 'curl femoral'],
  [/leg extension(s)?/gi, 'extensión de cuádriceps'],
  [/crunch(es)?/gi, 'crunch'],
  [/sit[- ]?up(s)?/gi, 'abdominales'],
  [/plank/gi, 'plancha'],
  [/adduction/gi, 'aducción'],
  [/abduction/gi, 'abducción'],

  // connectors / misc
  [/with/gi, 'con'],
  [/using/gi, 'con'],
  [/on/gi, 'en'],
  [/to/gi, 'a'],
  [/and/gi, 'y'],
  [/inside/gi, 'hacia dentro'],
];

const equipmentWords = [
  'mancuernas',
  'barra',
  'barra z',
  'barra hexagonal',
  'kettlebell',
  'banda elástica',
  'polea',
  'máquina',
  'multipower',
  'peso corporal',
];

const movementWords = [
  'press',
  'sentadilla',
  'peso muerto',
  'zancadas',
  'remo',
  'jalón',
  'pull-over',
  'aperturas',
  'cruce',
  'curl',
  'extensión',
  'elevación',
  'elevaciones laterales',
  'elevaciones frontales',
  'deltoide posterior',
  'encogimientos',
  'elevaciones de gemelos',
  'curl femoral',
  'extensión de cuádriceps',
  'crunch',
  'abdominales',
  'plancha',
  'aducción',
  'abducción',
  'dominadas',
  'dominadas supinas',
  'fondos',
  'empuje de cadera',
  'puente de glúteos',
  'subidas al cajón',
];

function applyReplacements(input: string): string {
  let output = input;
  for (const [pattern, replacement] of phraseReplacements) {
    output = output.replace(pattern, replacement);
  }
  return output;
}

function restructureEquipmentPosition(input: string): string {
  const words = input.split(/\s+/);
  const lower = words.map((w) => w.toLowerCase());

  const equipIndex = lower.findIndex((w) => equipmentWords.includes(w));
  const movementIndex = lower.findIndex((w) => movementWords.includes(w));

  if (equipIndex !== -1 && movementIndex !== -1 && equipIndex < movementIndex) {
    const equipment = words[equipIndex];
    const removed = words.filter((_, i) => i !== equipIndex);
    const before = removed.slice(0, movementIndex - 1).join(' ').trim();
    const after = removed.slice(movementIndex).join(' ').trim();
    const movement = removed[movementIndex - 1];
    const base = [movement, before, after].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    return `${base} con ${equipment}`.replace(/\s+/g, ' ').trim();
  }

  return input;
}

function cleanSpanish(input: string): string {
  return input
    .replace(/\bde de\b/g, 'de')
    .replace(/\bcon con\b/g, 'con')
    .replace(/\s+,/g, ',')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s+/g, ' ')
    .trim();
}

export function translateNameToSpanish(name: string): string {
  const normalized = normalize(name);
  const replaced = applyReplacements(normalized);
  const reordered = restructureEquipmentPosition(replaced);
  const cleaned = cleanSpanish(reordered);
  return toSentenceCase(cleaned);
}

async function main() {
  const root = process.cwd();
  const inputPath = path.join(root, 'src', 'data', 'exercises.json');
  const outPath = path.join(root, 'src', 'data', 'exercises.es.json');

  const raw = await readFile(inputPath, 'utf8');
  const data: Exercise[] = JSON.parse(raw);

  const translated = data.map((ex) => ({
    ...ex,
    nameEs: translateNameToSpanish(ex.name),
  }));

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(translated, null, 2) + '\n', 'utf8');

  // Simple sample log
  const sample = translated.slice(0, 5).map((e) => ({ id: e.exerciseId, name: e.name, nameEs: e.nameEs }));
  // eslint-disable-next-line no-console
  console.table(sample);
}

// Run if invoked directly
// biome-ignore lint/nursery/noConsole: script utility
main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});


