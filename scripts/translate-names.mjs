import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

function toSentenceCase(input) {
  const lower = input.trim().toLowerCase();
  if (!lower) return lower;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function normalize(input) {
  return input.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
}

const phraseReplacements = [
  [/smith machine/gi, 'multipower'],
  [/trap bar|hex bar/gi, 'barra hexagonal'],
  [/ez[- ]?bar/gi, 'barra Z'],
  [/barbell/gi, 'barra'],
  [/dumbbells?|\bdb\b/gi, 'mancuernas'],
  [/kettlebell/gi, 'kettlebell'],
  [/\bband(s)?\b/gi, 'banda elástica'],
  [/\bbanda\b/gi, 'banda elástica'],
  [/\bresistance band(s)?\b/gi, 'banda elástica'],
  [/\bcable(s)?\b/gi, 'polea'],
  [/machine/gi, 'máquina'],
  [/body ?weight/gi, 'peso corporal'],
  [/incline(d)?/gi, 'inclinado'],
  [/decline(d)?/gi, 'declinado'],
  [/flat bench/gi, 'banco plano'],
  [/bench/gi, 'banco'],
  [/stability ball|exercise ball|swiss ball/gi, 'fitball'],
  [/estabilidad pelota/gi, 'fitball'],
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
  [/(?:to\s*)?skull\s*(?:crusher|press)/gi, 'press francés'],

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

  [/\bwith\b/gi, 'con'],
  [/\busing\b/gi, 'con'],
  [/\bon\b/gi, 'en'],
  [/\bto\b/gi, 'a'],
  [/\band\b/gi, 'y'],
  [/\binside\b/gi, 'hacia dentro'],
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

const modifierWords = [
  'inclinado',
  'declinado',
  'sentado',
  'de pie',
  'tumbado',
  'prono',
  'de rodillas',
  'a una mano',
  'a una pierna',
  'alterno',
  'agarre cerrado',
  'agarre ancho',
  'agarre neutro',
  'agarre prono',
  'agarre supino',
  'a la anchura de hombros',
  'en banco',
  'en fitball',
  'sobre fitball',
];

const equipmentPhrases = [
  'banda elástica',
  'mancuernas',
  'barra z',
  'barra hexagonal',
  'barra',
  'kettlebell',
  'polea',
  'máquina',
  'multipower',
  'peso corporal',
  'fitball',
];

function applyReplacements(input) {
  let output = input;
  for (const [pattern, replacement] of phraseReplacements) {
    output = output.replace(pattern, replacement);
  }
  return output;
}

function extractAndRebuild(input) {
  let text = input.trim();

  // Detect equipment phrases (multi-word support)
  let foundEquipment = [];
  for (const phrase of equipmentPhrases) {
    const re = new RegExp(`(^|\b)${phrase.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}(\b|$)`, 'gi');
    if (re.test(text)) {
      foundEquipment.push(phrase);
      text = text.replace(re, ' ').replace(/\s+/g, ' ').trim();
    }
  }

  // Identify movement word (pick the first that appears)
  let movement = '';
  for (const m of movementWords) {
    const re = new RegExp(`(^|\b)${m.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}(\b|$)`, 'i');
    const match = text.match(re);
    if (match) {
      movement = m;
      text = text.replace(re, ' ').replace(/\s+/g, ' ').trim();
      break;
    }
  }

  // Gather modifiers in order of appearance
  const foundModifiers = [];
  for (const mod of modifierWords) {
    const re = new RegExp(`(^|\b)${mod.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}(\b|$)`, 'gi');
    if (re.test(text)) {
      foundModifiers.push(mod);
      text = text.replace(re, ' ').replace(/\s+/g, ' ').trim();
    }
  }

  const residual = text.trim();

  const core = [movement || residual, ...(!movement && residual ? [] : [residual])]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  const withModifiers = [movement || '', ...foundModifiers, residual && movement ? residual : '']
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  const base = (movement ? withModifiers : core).trim();
  const equipmentTail = foundEquipment.length ? ` con ${foundEquipment.join(' y ')}` : '';
  return `${base}${equipmentTail}`.replace(/\s+/g, ' ').trim();
}

function cleanSpanish(input) {
  return input
    .replace(/\bde de\b/g, 'de')
    .replace(/\bcon con\b/g, 'con')
    .replace(/\s+,/g, ',')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s+/g, ' ')
    .trim();
}

export function translateNameToSpanish(name) {
  const normalized = normalize(name);
  const replaced = applyReplacements(normalized);
  const reordered = extractAndRebuild(replaced);
  const cleaned = cleanSpanish(reordered);
  return toSentenceCase(cleaned);
}

async function main() {
  const root = process.cwd();
  const inputPath = path.join(root, 'src', 'data', 'exercises.json');
  const outPath = path.join(root, 'src', 'data', 'exercises.es.json');

  const raw = await readFile(inputPath, 'utf8');
  const data = JSON.parse(raw);

  const translated = data.map((ex) => ({
    ...ex,
    nameEs: translateNameToSpanish(ex.name),
  }));

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(translated, null, 2) + '\n', 'utf8');

  const sample = translated.slice(0, 5).map((e) => ({ id: e.exerciseId, name: e.name, nameEs: e.nameEs }));
  console.table(sample);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});


