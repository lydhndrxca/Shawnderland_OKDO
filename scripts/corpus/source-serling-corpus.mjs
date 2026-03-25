/**
 * Rod Serling Corpus Sourcer
 *
 * Uses Gemini to recall and reconstruct the complete Serling corpus:
 * - All 156 TZ opening/closing narrations
 * - Detailed episode analyses for all 92 Serling-written TZ episodes
 * - Major interviews (Playboy 1963, Mike Wallace, etc.)
 * - Lecture transcripts (Ithaca College, Antioch College)
 * - Playhouse 90 teleplays, Night Gallery, essays
 *
 * Then chunks, embeds, and generates the decision taxonomy.
 *
 * Usage: node scripts/source-serling-corpus.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CORPUS_RAW = path.join(ROOT, "corpus-raw");
const SERLING_PKG = path.join(ROOT, "packages", "serling", "src");

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("Set GEMINI_API_KEY environment variable");
  process.exit(1);
}

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
const EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004`;

// ─── Rate limiting ───────────────────────────────────────────
let lastCallTime = 0;
const MIN_DELAY = 350;

async function rateLimitedCall(fn) {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < MIN_DELAY) {
    await sleep(MIN_DELAY - elapsed);
  }
  lastCallTime = Date.now();
  return fn();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Gemini helpers ──────────────────────────────────────────
async function callGemini(prompt, maxTokens = 8192, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await rateLimitedCall(() =>
        fetch(GEMINI_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens },
          }),
        })
      );

      if (res.status === 429) {
        console.warn(`  Rate limited, waiting 10s (attempt ${attempt + 1})...`);
        await sleep(10000);
        continue;
      }

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini ${res.status}: ${err.slice(0, 200)}`);
      }

      const json = await res.json();
      return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } catch (e) {
      if (attempt < retries - 1) {
        console.warn(`  Retry ${attempt + 1}: ${e.message}`);
        await sleep(2000 * (attempt + 1));
      } else {
        throw e;
      }
    }
  }
}

async function embedBatch(texts) {
  const url = `${EMBED_URL}:batchEmbedContents?key=${API_KEY}`;
  const requests = texts.map((text) => ({
    model: "models/text-embedding-004",
    content: { parts: [{ text }] },
  }));

  const res = await rateLimitedCall(() =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
    })
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embed error ${res.status}: ${err.slice(0, 200)}`);
  }

  const json = await res.json();
  return json.embeddings.map((e) => e.values);
}

// ─── File helpers ────────────────────────────────────────────
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeIfMissing(filepath, content) {
  if (fs.existsSync(filepath)) {
    console.log(`  [skip] ${path.basename(filepath)} (already exists)`);
    return false;
  }
  fs.writeFileSync(filepath, content, "utf-8");
  return true;
}

// ─── Episode Data ────────────────────────────────────────────
// All 156 TZ episodes with writer attribution
const TZ_EPISODES = [
  // Season 1 (1959-1960)
  { s:1,e:1,  title:"Where Is Everybody?", writer:"Rod Serling", year:1959 },
  { s:1,e:2,  title:"One for the Angels", writer:"Rod Serling", year:1959 },
  { s:1,e:3,  title:"Mr. Denton on Doomsday", writer:"Rod Serling", year:1959 },
  { s:1,e:4,  title:"The Sixteen-Millimeter Shrine", writer:"Rod Serling", year:1959 },
  { s:1,e:5,  title:"Walking Distance", writer:"Rod Serling", year:1959 },
  { s:1,e:6,  title:"Escape Clause", writer:"Rod Serling", year:1959 },
  { s:1,e:7,  title:"The Lonely", writer:"Rod Serling", year:1959 },
  { s:1,e:8,  title:"Time Enough at Last", writer:"Rod Serling", year:1959 },
  { s:1,e:9,  title:"Perchance to Dream", writer:"Charles Beaumont", year:1959 },
  { s:1,e:10, title:"Judgment Night", writer:"Rod Serling", year:1959 },
  { s:1,e:11, title:"And When the Sky Was Opened", writer:"Rod Serling", year:1959 },
  { s:1,e:12, title:"What You Need", writer:"Rod Serling", year:1959 },
  { s:1,e:13, title:"The Four of Us Are Dying", writer:"Rod Serling", year:1959 },
  { s:1,e:14, title:"Third from the Sun", writer:"Rod Serling", year:1960 },
  { s:1,e:15, title:"I Shot an Arrow into the Air", writer:"Rod Serling", year:1960 },
  { s:1,e:16, title:"The Hitch-Hiker", writer:"Rod Serling", year:1960 },
  { s:1,e:17, title:"The Fever", writer:"Rod Serling", year:1960 },
  { s:1,e:18, title:"The Last Flight", writer:"Richard Matheson", year:1960 },
  { s:1,e:19, title:"The Purple Testament", writer:"Rod Serling", year:1960 },
  { s:1,e:20, title:"Elegy", writer:"Charles Beaumont", year:1960 },
  { s:1,e:21, title:"Mirror Image", writer:"Rod Serling", year:1960 },
  { s:1,e:22, title:"The Monsters Are Due on Maple Street", writer:"Rod Serling", year:1960 },
  { s:1,e:23, title:"A World of Difference", writer:"Richard Matheson", year:1960 },
  { s:1,e:24, title:"Long Live Walter Jameson", writer:"Charles Beaumont", year:1960 },
  { s:1,e:25, title:"People Are Alike All Over", writer:"Rod Serling", year:1960 },
  { s:1,e:26, title:"Execution", writer:"Rod Serling", year:1960 },
  { s:1,e:27, title:"The Big Tall Wish", writer:"Rod Serling", year:1960 },
  { s:1,e:28, title:"A Nice Place to Visit", writer:"Charles Beaumont", year:1960 },
  { s:1,e:29, title:"Nightmare as a Child", writer:"Rod Serling", year:1960 },
  { s:1,e:30, title:"A Stop at Willoughby", writer:"Rod Serling", year:1960 },
  { s:1,e:31, title:"The After Hours", writer:"Rod Serling", year:1960 },
  { s:1,e:32, title:"The Mighty Casey", writer:"Rod Serling", year:1960 },
  { s:1,e:33, title:"A World of His Own", writer:"Richard Matheson", year:1960 },
  { s:1,e:34, title:"The Chaser", writer:"Robert Presnell Jr.", year:1960 },
  { s:1,e:35, title:"A Passage for Trumpet", writer:"Rod Serling", year:1960 },
  { s:1,e:36, title:"Mr. Bevis", writer:"Rod Serling", year:1960 },

  // Season 2 (1960-1961)
  { s:2,e:1,  title:"King Nine Will Not Return", writer:"Rod Serling", year:1960 },
  { s:2,e:2,  title:"The Man in the Bottle", writer:"Rod Serling", year:1960 },
  { s:2,e:3,  title:"Nervous Man in a Four Dollar Room", writer:"Rod Serling", year:1960 },
  { s:2,e:4,  title:"A Thing About Machines", writer:"Rod Serling", year:1960 },
  { s:2,e:5,  title:"The Howling Man", writer:"Charles Beaumont", year:1960 },
  { s:2,e:6,  title:"The Eye of the Beholder", writer:"Rod Serling", year:1960 },
  { s:2,e:7,  title:"Nick of Time", writer:"Richard Matheson", year:1960 },
  { s:2,e:8,  title:"The Lateness of the Hour", writer:"Rod Serling", year:1960 },
  { s:2,e:9,  title:"The Trouble with Templeton", writer:"E. Jack Neuman", year:1960 },
  { s:2,e:10, title:"A Most Unusual Camera", writer:"Rod Serling", year:1960 },
  { s:2,e:11, title:"The Night of the Meek", writer:"Rod Serling", year:1960 },
  { s:2,e:12, title:"Dust", writer:"Rod Serling", year:1961 },
  { s:2,e:13, title:"Back There", writer:"Rod Serling", year:1961 },
  { s:2,e:14, title:"The Whole Truth", writer:"Rod Serling", year:1961 },
  { s:2,e:15, title:"The Invaders", writer:"Richard Matheson", year:1961 },
  { s:2,e:16, title:"A Penny for Your Thoughts", writer:"George Clayton Johnson", year:1961 },
  { s:2,e:17, title:"Twenty-Two", writer:"Rod Serling", year:1961 },
  { s:2,e:18, title:"The Odyssey of Flight 33", writer:"Rod Serling", year:1961 },
  { s:2,e:19, title:"Mr. Dingle, the Strong", writer:"Rod Serling", year:1961 },
  { s:2,e:20, title:"Static", writer:"Charles Beaumont", year:1961 },
  { s:2,e:21, title:"The Prime Mover", writer:"Charles Beaumont", year:1961 },
  { s:2,e:22, title:"Long Distance Call", writer:"Charles Beaumont", year:1961 },
  { s:2,e:23, title:"A Hundred Yards over the Rim", writer:"Rod Serling", year:1961 },
  { s:2,e:24, title:"The Rip Van Winkle Caper", writer:"Rod Serling", year:1961 },
  { s:2,e:25, title:"The Silence", writer:"Rod Serling", year:1961 },
  { s:2,e:26, title:"Shadow Play", writer:"Charles Beaumont", year:1961 },
  { s:2,e:27, title:"The Mind and the Matter", writer:"Rod Serling", year:1961 },
  { s:2,e:28, title:"Will the Real Martian Please Stand Up?", writer:"Rod Serling", year:1961 },
  { s:2,e:29, title:"The Obsolete Man", writer:"Rod Serling", year:1961 },

  // Season 3 (1961-1962)
  { s:3,e:1,  title:"Two", writer:"Rod Serling", year:1961 },
  { s:3,e:2,  title:"The Arrival", writer:"Rod Serling", year:1961 },
  { s:3,e:3,  title:"The Shelter", writer:"Rod Serling", year:1961 },
  { s:3,e:4,  title:"The Passersby", writer:"Rod Serling", year:1961 },
  { s:3,e:5,  title:"A Game of Pool", writer:"George Clayton Johnson", year:1961 },
  { s:3,e:6,  title:"The Mirror", writer:"Rod Serling", year:1961 },
  { s:3,e:7,  title:"The Grave", writer:"Rod Serling", year:1961 },
  { s:3,e:8,  title:"It's a Good Life", writer:"Rod Serling", year:1961 },
  { s:3,e:9,  title:"Deaths-Head Revisited", writer:"Rod Serling", year:1961 },
  { s:3,e:10, title:"The Midnight Sun", writer:"Rod Serling", year:1961 },
  { s:3,e:11, title:"Still Valley", writer:"Rod Serling", year:1961 },
  { s:3,e:12, title:"The Jungle", writer:"Charles Beaumont", year:1961 },
  { s:3,e:13, title:"Once Upon a Time", writer:"Richard Matheson", year:1961 },
  { s:3,e:14, title:"Five Characters in Search of an Exit", writer:"Rod Serling", year:1961 },
  { s:3,e:15, title:"A Quality of Mercy", writer:"Rod Serling", year:1961 },
  { s:3,e:16, title:"Nothing in the Dark", writer:"George Clayton Johnson", year:1962 },
  { s:3,e:17, title:"One More Pallbearer", writer:"Rod Serling", year:1962 },
  { s:3,e:18, title:"Dead Man's Shoes", writer:"Charles Beaumont", year:1962 },
  { s:3,e:19, title:"The Hunt", writer:"Earl Hamner Jr.", year:1962 },
  { s:3,e:20, title:"Showdown with Rance McGrew", writer:"Rod Serling", year:1962 },
  { s:3,e:21, title:"Kick the Can", writer:"George Clayton Johnson", year:1962 },
  { s:3,e:22, title:"A Piano in the House", writer:"Earl Hamner Jr.", year:1962 },
  { s:3,e:23, title:"The Last Rites of Jeff Myrtlebank", writer:"Rod Serling", year:1962 },
  { s:3,e:24, title:"To Serve Man", writer:"Rod Serling", year:1962 },
  { s:3,e:25, title:"The Fugitive", writer:"Charles Beaumont", year:1962 },
  { s:3,e:26, title:"Little Girl Lost", writer:"Richard Matheson", year:1962 },
  { s:3,e:27, title:"Person or Persons Unknown", writer:"Charles Beaumont", year:1962 },
  { s:3,e:28, title:"The Little People", writer:"Rod Serling", year:1962 },
  { s:3,e:29, title:"Four O'Clock", writer:"Rod Serling", year:1962 },
  { s:3,e:30, title:"Hocus-Pocus and Frisby", writer:"Rod Serling", year:1962 },
  { s:3,e:31, title:"The Trade-Ins", writer:"Rod Serling", year:1962 },
  { s:3,e:32, title:"The Gift", writer:"Rod Serling", year:1962 },
  { s:3,e:33, title:"The Dummy", writer:"Rod Serling", year:1962 },
  { s:3,e:34, title:"Young Man's Fancy", writer:"Richard Matheson", year:1962 },
  { s:3,e:35, title:"I Sing the Body Electric", writer:"Ray Bradbury", year:1962 },
  { s:3,e:36, title:"Cavender Is Coming", writer:"Rod Serling", year:1962 },
  { s:3,e:37, title:"The Changing of the Guard", writer:"Rod Serling", year:1962 },

  // Season 4 (1963) - Hour-long format
  { s:4,e:1,  title:"In His Image", writer:"Charles Beaumont", year:1963 },
  { s:4,e:2,  title:"The Thirty-Fathom Grave", writer:"Rod Serling", year:1963 },
  { s:4,e:3,  title:"Valley of the Shadow", writer:"Charles Beaumont", year:1963 },
  { s:4,e:4,  title:"He's Alive", writer:"Rod Serling", year:1963 },
  { s:4,e:5,  title:"Mute", writer:"Richard Matheson", year:1963 },
  { s:4,e:6,  title:"Death Ship", writer:"Richard Matheson", year:1963 },
  { s:4,e:7,  title:"Jess-Belle", writer:"Earl Hamner Jr.", year:1963 },
  { s:4,e:8,  title:"Miniature", writer:"Charles Beaumont", year:1963 },
  { s:4,e:9,  title:"Printer's Devil", writer:"Charles Beaumont", year:1963 },
  { s:4,e:10, title:"No Time Like the Past", writer:"Rod Serling", year:1963 },
  { s:4,e:11, title:"The Parallel", writer:"Rod Serling", year:1963 },
  { s:4,e:12, title:"I Dream of Genie", writer:"Rod Serling", year:1963 },
  { s:4,e:13, title:"The New Exhibit", writer:"Jerry Sohl", year:1963 },
  { s:4,e:14, title:"Of Late I Think of Cliffordville", writer:"Rod Serling", year:1963 },
  { s:4,e:15, title:"The Incredible World of Horace Ford", writer:"Reginald Rose", year:1963 },
  { s:4,e:16, title:"On Thursday We Leave for Home", writer:"Rod Serling", year:1963 },
  { s:4,e:17, title:"Passage on the Lady Anne", writer:"Charles Beaumont", year:1963 },
  { s:4,e:18, title:"The Bard", writer:"Rod Serling", year:1963 },

  // Season 5 (1963-1964)
  { s:5,e:1,  title:"In Praise of Pip", writer:"Rod Serling", year:1963 },
  { s:5,e:2,  title:"Steel", writer:"Richard Matheson", year:1963 },
  { s:5,e:3,  title:"Nightmare at 20,000 Feet", writer:"Richard Matheson", year:1963 },
  { s:5,e:4,  title:"A Kind of a Stopwatch", writer:"Rod Serling", year:1963 },
  { s:5,e:5,  title:"The Last Night of a Jockey", writer:"Rod Serling", year:1963 },
  { s:5,e:6,  title:"Living Doll", writer:"Jerry Sohl", year:1963 },
  { s:5,e:7,  title:"The Old Man in the Cave", writer:"Rod Serling", year:1963 },
  { s:5,e:8,  title:"Uncle Simon", writer:"Rod Serling", year:1963 },
  { s:5,e:9,  title:"Probe 7, Over and Out", writer:"Rod Serling", year:1963 },
  { s:5,e:10, title:"The 7th Is Made Up of Phantoms", writer:"Rod Serling", year:1963 },
  { s:5,e:11, title:"A Short Drink from a Certain Fountain", writer:"Rod Serling", year:1963 },
  { s:5,e:12, title:"Ninety Years Without Slumbering", writer:"Richard de Roy", year:1963 },
  { s:5,e:13, title:"Ring-a-Ding Girl", writer:"Earl Hamner Jr.", year:1963 },
  { s:5,e:14, title:"You Drive", writer:"Earl Hamner Jr.", year:1964 },
  { s:5,e:15, title:"The Long Morrow", writer:"Rod Serling", year:1964 },
  { s:5,e:16, title:"The Self-Improvement of Salvadore Ross", writer:"Jerry McNeely", year:1964 },
  { s:5,e:17, title:"Number 12 Looks Just Like You", writer:"Charles Beaumont", year:1964 },
  { s:5,e:18, title:"Black Leather Jackets", writer:"Earl Hamner Jr.", year:1964 },
  { s:5,e:19, title:"Night Call", writer:"Richard Matheson", year:1964 },
  { s:5,e:20, title:"From Agnes - with Love", writer:"Bernard C. Schoenfeld", year:1964 },
  { s:5,e:21, title:"Spur of the Moment", writer:"Richard Matheson", year:1964 },
  { s:5,e:22, title:"An Occurrence at Owl Creek Bridge", writer:"Robert Enrico", year:1964 },
  { s:5,e:23, title:"Queen of the Nile", writer:"Jerry Sohl", year:1964 },
  { s:5,e:24, title:"What's in the Box", writer:"Martin M. Goldsmith", year:1964 },
  { s:5,e:25, title:"The Masks", writer:"Rod Serling", year:1964 },
  { s:5,e:26, title:"I Am the Night - Color Me Black", writer:"Rod Serling", year:1964 },
  { s:5,e:27, title:"Sounds and Silences", writer:"Rod Serling", year:1964 },
  { s:5,e:28, title:"Caesar and Me", writer:"Adele T. Strassfield", year:1964 },
  { s:5,e:29, title:"The Jeopardy Room", writer:"Rod Serling", year:1964 },
  { s:5,e:30, title:"Stopover in a Quiet Town", writer:"Earl Hamner Jr.", year:1964 },
  { s:5,e:31, title:"The Encounter", writer:"Martin M. Goldsmith", year:1964 },
  { s:5,e:32, title:"Mr. Garrity and the Graves", writer:"Rod Serling", year:1964 },
  { s:5,e:33, title:"The Brain Center at Whipple's", writer:"Rod Serling", year:1964 },
  { s:5,e:34, title:"Come Wander with Me", writer:"Anthony Wilson", year:1964 },
  { s:5,e:35, title:"The Fear", writer:"Rod Serling", year:1964 },
  { s:5,e:36, title:"The Bewitchin' Pool", writer:"Earl Hamner Jr.", year:1964 },
];

const SERLING_EPISODES = TZ_EPISODES.filter((ep) => ep.writer === "Rod Serling");

// Other major Serling works
const OTHER_WORKS = [
  { id: "patterns", title: "Patterns", type: "teleplay", year: 1955, show: "Kraft Television Theatre" },
  { id: "requiem-for-a-heavyweight", title: "Requiem for a Heavyweight", type: "teleplay", year: 1956, show: "Playhouse 90" },
  { id: "the-comedian", title: "The Comedian", type: "teleplay", year: 1957, show: "Playhouse 90" },
  { id: "a-town-has-turned-to-dust", title: "A Town Has Turned to Dust", type: "teleplay", year: 1958, show: "Playhouse 90" },
  { id: "the-velvet-alley", title: "The Velvet Alley", type: "teleplay", year: 1959, show: "Playhouse 90" },
  { id: "the-rank-and-file", title: "The Rank and File", type: "teleplay", year: 1959, show: "Playhouse 90" },
  { id: "seven-days-in-may-screenplay", title: "Seven Days in May (screenplay)", type: "screenplay", year: 1964, show: "Film" },
  { id: "planet-of-the-apes-screenplay", title: "Planet of the Apes (screenplay)", type: "screenplay", year: 1968, show: "Film" },
];

const NIGHT_GALLERY_SERLING = [
  { id: "ng-the-cemetery", title: "The Cemetery", year: 1969 },
  { id: "ng-eyes", title: "Eyes", year: 1969 },
  { id: "ng-escape-route", title: "Escape Route", year: 1969 },
  { id: "ng-the-dead-man", title: "The Dead Man", year: 1970 },
  { id: "ng-room-with-a-view", title: "Room with a View", year: 1970 },
  { id: "ng-the-little-black-bag", title: "The Little Black Bag", year: 1970 },
  { id: "ng-the-nature-of-the-enemy", title: "The Nature of the Enemy", year: 1970 },
  { id: "ng-the-house", title: "The House", year: 1970 },
  { id: "ng-certain-shadows-on-the-wall", title: "Certain Shadows on the Wall", year: 1970 },
  { id: "ng-clean-kills-and-other-trophies", title: "Clean Kills and Other Trophies", year: 1970 },
  { id: "ng-they-re-tearing-down-tim-riley-s-bar", title: "They're Tearing Down Tim Riley's Bar", year: 1971 },
  { id: "ng-the-messiah-on-mott-street", title: "The Messiah on Mott Street", year: 1971 },
  { id: "ng-lindemann-s-catch", title: "Lindemann's Catch", year: 1972 },
  { id: "ng-the-caterpillar", title: "The Caterpillar", year: 1972 },
];

const INTERVIEWS = [
  { id: "playboy-1963", title: "Playboy Interview", year: 1963, desc: "Extensive Playboy magazine interview covering his creative philosophy, censorship battles, and the purpose of science fiction" },
  { id: "mike-wallace-1959", title: "Mike Wallace Interview", year: 1959, desc: "Television interview about the state of television, censorship, and why he created The Twilight Zone" },
  { id: "wga-interview-1962", title: "Writers Guild Interview", year: 1962, desc: "Discussion about the craft of teleplay writing, story structure, and the writer's responsibility" },
  { id: "emmy-acceptance-speeches", title: "Emmy Acceptance Speeches (compiled)", year: 1958, desc: "His six Emmy acceptance speeches and surrounding press interviews" },
  { id: "paris-review-style-interview", title: "Writing Process Interview", year: 1963, desc: "In-depth discussion of his actual writing process, daily routine, and revision methods" },
  { id: "censorship-testimony", title: "Censorship and Television Testimony", year: 1962, desc: "His statements and testimony about sponsor censorship of dramatic television" },
];

const LECTURES = [
  { id: "ithaca-college-lectures", title: "Ithaca College Lectures (compiled)", year: 1972, desc: "His lectures on dramatic writing at Ithaca College, covering structure, character, dialogue, and the writer's moral obligation" },
  { id: "antioch-college-commencement", title: "Antioch College Commencement Address", year: 1966, desc: "His commencement address about responsibility, conformity, and the courage to dissent" },
  { id: "writing-for-television", title: "Writing for Television (lecture series)", year: 1970, desc: "Multi-part lecture series on the craft of television writing, from premise to final draft" },
  { id: "the-challenge-of-the-mass-media", title: "The Challenge of the Mass Media", year: 1968, desc: "Lecture on television as a medium, its potential and failures" },
];

// ─── Phase 1: Generate Narrations ────────────────────────────
async function generateNarrations() {
  console.log("\n=== PHASE 1: TZ Narrations ===\n");
  const dir = path.join(CORPUS_RAW, "narrations");
  ensureDir(dir);

  const batchSize = 8;
  for (let i = 0; i < TZ_EPISODES.length; i += batchSize) {
    const batch = TZ_EPISODES.slice(i, i + batchSize);

    const allExist = batch.every((ep) => {
      const fname = `tz-s${String(ep.s).padStart(2,"0")}e${String(ep.e).padStart(2,"0")}-${ep.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}__${ep.year}.txt`;
      return fs.existsSync(path.join(dir, fname));
    });
    if (allExist) {
      console.log(`  [skip] Batch ${i+1}-${Math.min(i+batchSize, TZ_EPISODES.length)} (all exist)`);
      continue;
    }

    const epList = batch
      .map((ep) => `- S${ep.s}E${ep.e}: "${ep.title}" (${ep.year})`)
      .join("\n");

    const prompt = `You are a Twilight Zone scholar. For each of the following episodes, provide the COMPLETE opening narration and closing narration as spoken by Rod Serling. Be as accurate and faithful to the original as possible. These narrations are among the most iconic in television history.

${epList}

For each episode, format as:
=== S[season]E[episode]: "[Title]" ===
OPENING:
[full opening narration]

CLOSING:
[full closing narration]
===

Provide ALL episodes listed. Be complete and accurate.`;

    console.log(`  Generating narrations ${i+1}-${Math.min(i+batchSize, TZ_EPISODES.length)} of ${TZ_EPISODES.length}...`);
    const result = await callGemini(prompt, 8192);

    for (const ep of batch) {
      const epId = `tz-s${String(ep.s).padStart(2,"0")}e${String(ep.e).padStart(2,"0")}`;
      const slug = ep.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
      const fname = `${epId}-${slug}__${ep.year}.txt`;
      const filepath = path.join(dir, fname);

      if (fs.existsSync(filepath)) continue;

      const regex = new RegExp(
        `===\\s*S${ep.s}E${ep.e}[^=]*===([\\s\\S]*?)(?====|$)`,
        "i"
      );
      const match = result.match(regex);
      const content = match
        ? `EPISODE: ${ep.title} (S${ep.s}E${ep.e}, ${ep.year})\nWriter: ${ep.writer}\n\n${match[1].trim()}`
        : `EPISODE: ${ep.title} (S${ep.s}E${ep.e}, ${ep.year})\nWriter: ${ep.writer}\n\n[Narration not extracted - see batch output]`;

      fs.writeFileSync(filepath, content, "utf-8");
    }
    console.log(`  Wrote batch ${i+1}-${Math.min(i+batchSize, TZ_EPISODES.length)}`);
  }

  const count = fs.readdirSync(dir).filter((f) => f.endsWith(".txt")).length;
  console.log(`  Total narration files: ${count}`);
}

// ─── Phase 2: Generate Episode Analyses (Serling-written) ────
async function generateEpisodeAnalyses() {
  console.log("\n=== PHASE 2: Serling Episode Analyses ===\n");
  const dir = path.join(CORPUS_RAW, "scripts");
  ensureDir(dir);

  console.log(`  ${SERLING_EPISODES.length} Serling-written episodes to analyze\n`);

  for (let i = 0; i < SERLING_EPISODES.length; i++) {
    const ep = SERLING_EPISODES[i];
    const epId = `tz-s${String(ep.s).padStart(2,"0")}e${String(ep.e).padStart(2,"0")}`;
    const slug = ep.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
    const fname = `${epId}-${slug}__${ep.year}.txt`;
    const filepath = path.join(dir, fname);

    if (fs.existsSync(filepath)) {
      console.log(`  [skip] ${ep.title}`);
      continue;
    }

    const prompt = `You are a television scholar with deep expertise in Rod Serling's work. Provide a comprehensive analytical reconstruction of The Twilight Zone episode "${ep.title}" (Season ${ep.s}, Episode ${ep.e}, ${ep.year}), written by Rod Serling.

This should be an EXTREMELY detailed, scene-by-scene analytical reconstruction that captures:

1. COMPLETE OPENING — Serling's opening narration and the establishing moments
2. ACT-BY-ACT BREAKDOWN — Every scene in sequence, including:
   - What happens (action, blocking, staging)
   - Key dialogue exchanges (reconstruct the most significant lines as accurately as possible)
   - Character psychology and motivation in each moment
   - Visual composition and atmosphere Serling specified
   - How tension or emotion escalates
3. THE TWIST/INVERSION — The episode's central revelation or turn, exactly how it unfolds
4. CLOSING — The resolution and Serling's closing narration
5. THEMATIC ANALYSIS — What Serling was really saying, the social commentary embedded
6. STRUCTURAL CRAFT — How the episode demonstrates Serling's storytelling techniques
7. KEY DIALOGUE — Reconstruct the most memorable and significant dialogue exchanges
8. STAGE DIRECTIONS — Describe key visual moments as Serling wrote them

Write approximately 2000-3000 words. Be as specific, detailed, and faithful to the original as possible. This is for analytical and educational purposes — capture Serling's creative choices, not just a plot summary.`;

    console.log(`  [${i+1}/${SERLING_EPISODES.length}] ${ep.title}...`);
    const result = await callGemini(prompt, 8192);

    const content = `EPISODE: "${ep.title}"\nSeason ${ep.s}, Episode ${ep.e} (${ep.year})\nWritten by: Rod Serling\n\n${result}`;
    fs.writeFileSync(filepath, content, "utf-8");
  }

  const count = fs.readdirSync(dir).filter((f) => f.endsWith(".txt")).length;
  console.log(`\n  Total script analysis files: ${count}`);
}

// ─── Phase 3: Generate Other Works ───────────────────────────
async function generateOtherWorks() {
  console.log("\n=== PHASE 3: Other Serling Works ===\n");
  const dir = path.join(CORPUS_RAW, "scripts");
  ensureDir(dir);

  for (const work of OTHER_WORKS) {
    const fname = `${work.id}__${work.year}.txt`;
    const filepath = path.join(dir, fname);

    if (fs.existsSync(filepath)) {
      console.log(`  [skip] ${work.title}`);
      continue;
    }

    const prompt = `You are a television and film scholar. Provide a comprehensive analytical reconstruction of Rod Serling's ${work.type} "${work.title}" (${work.year}) for ${work.show}.

Include:
1. Historical context — why Serling wrote this, what was happening in his career
2. Complete scene-by-scene analysis with key dialogue reconstruction
3. Thematic analysis — the social commentary and personal meaning
4. Structural craft — how Serling built the narrative
5. Critical reception and legacy
6. Key dialogue passages reconstructed as accurately as possible

Write approximately 2000-3000 words. Be detailed, specific, and faithful to the original work.`;

    console.log(`  ${work.title}...`);
    const result = await callGemini(prompt, 8192);
    const content = `WORK: "${work.title}" (${work.year})\nType: ${work.type}\nShow: ${work.show}\nWritten by: Rod Serling\n\n${result}`;
    fs.writeFileSync(filepath, content, "utf-8");
  }

  // Night Gallery
  console.log("\n  Night Gallery episodes...\n");
  for (const ep of NIGHT_GALLERY_SERLING) {
    const fname = `${ep.id}__${ep.year}.txt`;
    const filepath = path.join(dir, fname);

    if (fs.existsSync(filepath)) {
      console.log(`  [skip] ${ep.title}`);
      continue;
    }

    const prompt = `You are a television scholar. Provide a comprehensive analytical reconstruction of the Night Gallery episode "${ep.title}" (${ep.year}), written by Rod Serling.

Include:
1. Serling's gallery introduction (how he presented the painting)
2. Complete scene-by-scene analysis with key dialogue
3. How this episode compares to his Twilight Zone work
4. Thematic analysis and what Serling was exploring
5. Structural choices and visual storytelling
6. Key dialogue passages

Write approximately 1500-2000 words.`;

    console.log(`  ${ep.title}...`);
    const result = await callGemini(prompt, 8192);
    const content = `EPISODE: "${ep.title}" — Night Gallery (${ep.year})\nWritten by: Rod Serling\n\n${result}`;
    fs.writeFileSync(filepath, content, "utf-8");
  }
}

// ─── Phase 4: Generate Interviews ────────────────────────────
async function generateInterviews() {
  console.log("\n=== PHASE 4: Interviews ===\n");
  const dir = path.join(CORPUS_RAW, "interviews");
  ensureDir(dir);

  for (const intv of INTERVIEWS) {
    const fname = `${intv.id}__${intv.year}.txt`;
    const filepath = path.join(dir, fname);

    if (fs.existsSync(filepath)) {
      console.log(`  [skip] ${intv.title}`);
      continue;
    }

    const prompt = `You are a journalism and television historian. Provide a comprehensive reconstruction of Rod Serling's "${intv.title}" (${intv.year}).

Context: ${intv.desc}

Reconstruct this interview/document as faithfully as possible, including:
1. The setting and context of when/where it took place
2. Key questions posed and Serling's actual responses (reconstruct his words as accurately as possible)
3. His most memorable quotes and statements from this specific interview
4. The topics covered and his positions on each
5. Any particularly revealing or personal moments
6. How this interview reveals his creative philosophy

Use a Q&A format where appropriate. Include Serling's actual speaking style — his articulateness, his tendency toward precision, his moral seriousness mixed with self-deprecating humor.

Write approximately 2000-3000 words. Be as faithful to the historical record as possible.`;

    console.log(`  ${intv.title}...`);
    const result = await callGemini(prompt, 8192);
    const content = `INTERVIEW: "${intv.title}" (${intv.year})\nSubject: Rod Serling\n${intv.desc}\n\n${result}`;
    fs.writeFileSync(filepath, content, "utf-8");
  }
}

// ─── Phase 5: Generate Lectures ──────────────────────────────
async function generateLectures() {
  console.log("\n=== PHASE 5: Lectures ===\n");
  const dir = path.join(CORPUS_RAW, "lectures");
  ensureDir(dir);

  for (const lec of LECTURES) {
    const fname = `${lec.id}__${lec.year}.txt`;
    const filepath = path.join(dir, fname);

    if (fs.existsSync(filepath)) {
      console.log(`  [skip] ${lec.title}`);
      continue;
    }

    const prompt = `You are an academic historian of American television and literature. Provide a comprehensive reconstruction of Rod Serling's "${lec.title}" (${lec.year}).

Context: ${lec.desc}

Reconstruct this lecture/speech as faithfully as possible:
1. The setting and audience
2. His opening — how he engaged the audience
3. His core arguments and teachings, with his actual words where known
4. Specific examples and anecdotes he used
5. His advice to writers and storytellers
6. His philosophical positions on art, commerce, and responsibility
7. His closing remarks

This should read like a transcript, capturing Serling's speaking voice — articulate, morally serious, with flashes of dry wit. He spoke in complete, measured sentences and was known for his eloquence.

Write approximately 2000-3000 words.`;

    console.log(`  ${lec.title}...`);
    const result = await callGemini(prompt, 8192);
    const content = `LECTURE: "${lec.title}" (${lec.year})\nSpeaker: Rod Serling\n${lec.desc}\n\n${result}`;
    fs.writeFileSync(filepath, content, "utf-8");
  }
}

// ─── Phase 6: Generate Essays ────────────────────────────────
async function generateEssays() {
  console.log("\n=== PHASE 6: Essays & Published Writings ===\n");
  const dir = path.join(CORPUS_RAW, "essays");
  ensureDir(dir);

  const essays = [
    { id: "the-time-element", title: "The Time Element - Pilot Development Notes", year: 1957, desc: "Serling's notes and reflections on developing the original TZ pilot" },
    { id: "requiem-for-television", title: "Requiem for a Heavyweight - The Writing Process", year: 1957, desc: "Serling's account of writing his most acclaimed teleplay" },
    { id: "about-writing-for-television", title: "About Writing for Television", year: 1960, desc: "Published essay on the craft and challenges of television writing" },
    { id: "tv-in-the-can-vs-tv-in-the-flesh", title: "TV in the Can vs. TV in the Flesh", year: 1961, desc: "Essay comparing live television drama to filmed production" },
    { id: "the-writers-role-in-television", title: "The Writer's Role in Television", year: 1962, desc: "Essay on the diminishing role and respect for writers in the medium" },
    { id: "stories-from-the-twilight-zone-introductions", title: "Stories from the Twilight Zone - Author Introductions", year: 1960, desc: "Serling's introductions to his published TZ story adaptations" },
    { id: "new-stories-from-the-twilight-zone-introductions", title: "New Stories from the Twilight Zone - Author Introductions", year: 1962, desc: "More introductions revealing his creative process" },
    { id: "the-season-to-be-wary-preface", title: "The Season to Be Wary - Preface", year: 1967, desc: "Preface to his published collection of Night Gallery stories" },
  ];

  for (const essay of essays) {
    const fname = `${essay.id}__${essay.year}.txt`;
    const filepath = path.join(dir, fname);

    if (fs.existsSync(filepath)) {
      console.log(`  [skip] ${essay.title}`);
      continue;
    }

    const prompt = `You are a literary scholar specializing in Rod Serling's published writings. Reconstruct the content and arguments of "${essay.title}" (${essay.year}).

Context: ${essay.desc}

Provide a comprehensive reconstruction that captures:
1. His thesis and central arguments
2. His actual prose style — the way he wrote for publication (more formal than speech, but still distinctly Serling)
3. Key passages and memorable phrases
4. His philosophical positions
5. Specific examples and references he makes
6. How this piece fits into his broader body of thought about writing, television, and storytelling

Write in a style faithful to Serling's published prose. Approximately 1500-2500 words.`;

    console.log(`  ${essay.title}...`);
    const result = await callGemini(prompt, 8192);
    const content = `ESSAY: "${essay.title}" (${essay.year})\nAuthor: Rod Serling\n${essay.desc}\n\n${result}`;
    fs.writeFileSync(filepath, content, "utf-8");
  }
}

// ─── Phase 7: Chunk and Embed ────────────────────────────────
function chunkText(text, chunkSize = 500, overlap = 75) {
  const words = text.split(/\s+/);
  if (words.length <= chunkSize) return [words.join(" ")];
  const chunks = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end >= words.length) break;
    start += chunkSize - overlap;
  }
  return chunks;
}

function inferPosition(index, total, sourceType) {
  if (sourceType === "narration") return index === 0 ? "narration-open" : "narration-close";
  if (["interview", "lecture", "essay"].includes(sourceType)) return "dialogue";
  const ratio = index / total;
  if (ratio < 0.15) return "opening";
  if (ratio < 0.45) return "rising";
  if (ratio < 0.7) return "crisis";
  if (ratio < 0.85) return "inversion";
  return "closing";
}

async function chunkAndEmbed() {
  console.log("\n=== PHASE 7: Chunk & Embed ===\n");

  const dirMap = {
    scripts: "script",
    narrations: "narration",
    interviews: "interview",
    lectures: "lecture",
    essays: "essay",
  };

  const allChunks = [];
  let chunkId = 0;

  for (const [dirName, sourceType] of Object.entries(dirMap)) {
    const dir = path.join(CORPUS_RAW, dirName);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".txt"));
    console.log(`  ${dirName}: ${files.length} files`);

    for (const filename of files) {
      const text = fs.readFileSync(path.join(dir, filename), "utf-8");
      const raw = filename.replace(".txt", "");
      const parts = raw.split("__");
      const title = parts[0].replace(/-/g, " ");
      const year = parts[1] ? parseInt(parts[1], 10) : undefined;
      const textChunks = chunkText(text);

      for (let i = 0; i < textChunks.length; i++) {
        allChunks.push({
          id: `chunk-${String(chunkId++).padStart(5, "0")}`,
          source: `${sourceType}/${title.replace(/\s+/g, "-").toLowerCase()}`,
          sourceType,
          section: inferPosition(i, textChunks.length, sourceType),
          text: textChunks[i],
          embedding: [],
          metadata: {
            episode: title,
            year: year && !isNaN(year) ? year : undefined,
            structuralPosition: inferPosition(i, textChunks.length, sourceType),
          },
        });
      }
    }
  }

  console.log(`\n  Total chunks: ${allChunks.length}`);
  console.log("  Embedding...\n");

  const BATCH = 20;
  for (let i = 0; i < allChunks.length; i += BATCH) {
    const batch = allChunks.slice(i, i + BATCH);
    const texts = batch.map((c) => c.text);

    try {
      const embeddings = await embedBatch(texts);
      for (let j = 0; j < batch.length; j++) {
        batch[j].embedding = embeddings[j];
      }
    } catch (e) {
      console.warn(`  Embed batch failed at ${i}, retrying after delay...`);
      await sleep(5000);
      try {
        const embeddings = await embedBatch(texts);
        for (let j = 0; j < batch.length; j++) {
          batch[j].embedding = embeddings[j];
        }
      } catch (e2) {
        console.error(`  Embed batch failed permanently at ${i}: ${e2.message}`);
        for (const chunk of batch) chunk.embedding = [];
      }
    }

    const progress = Math.min(i + BATCH, allChunks.length);
    if (progress % 100 === 0 || progress === allChunks.length) {
      console.log(`  Embedded ${progress}/${allChunks.length}`);
    }
  }

  const outPath = path.join(SERLING_PKG, "corpus", "chunks.json");
  fs.writeFileSync(outPath, JSON.stringify(allChunks, null, 2));
  console.log(`\n  Wrote ${allChunks.length} chunks to ${outPath}`);
  return allChunks.length;
}

// ─── Phase 8: Generate Decision Taxonomy ─────────────────────
const DECISION_CATEGORIES = [
  "premise_type", "structural_pattern", "twist_mechanism", "character_archetype",
  "character_test", "opening_strategy", "closing_strategy", "dialogue_density",
  "narration_role", "lighting_philosophy", "staging_approach", "pacing_shape",
  "music_relationship", "thematic_core", "tone_blend", "scale_of_stakes",
];

async function generateTaxonomy() {
  console.log("\n=== PHASE 8: Decision Taxonomy ===\n");

  const allDecisions = [];

  for (let i = 0; i < SERLING_EPISODES.length; i++) {
    const ep = SERLING_EPISODES[i];
    const epId = `tz-s${String(ep.s).padStart(2,"0")}e${String(ep.e).padStart(2,"0")}`;

    console.log(`  [${i+1}/${SERLING_EPISODES.length}] ${ep.title}...`);

    const prompt = `You are a scholar of Rod Serling's creative work with encyclopedic knowledge of The Twilight Zone. Analyze "${ep.title}" (Season ${ep.s}, Episode ${ep.e}, ${ep.year}) and catalog Serling's creative decisions across all 16 categories.

CATEGORIES:
- premise_type: What kind of story seed (wish fulfillment, identity crisis, conformity test, etc.)
- structural_pattern: How the story is built (slow reveal, compression, parallel timeline, etc.)
- twist_mechanism: How the inversion works (reframe, reversal, expansion, collapse, etc.)
- character_archetype: What kind of protagonist (everyman, authority figure, outsider, dreamer, etc.)
- character_test: How the character is tested (isolation, temptation, confrontation, loss, etc.)
- opening_strategy: How the episode opens (specific ordinary, in media res, narrator frame, etc.)
- closing_strategy: How the episode ends (resonance, irony, ambiguity, quiet devastation, etc.)
- dialogue_density: How much characters talk (silent, sparse, conversational, monologue-heavy)
- narration_role: What the narrator does (frame, commentary, revelation, none)
- lighting_philosophy: Visual approach (chiaroscuro, naturalistic, expressionist, etc.)
- staging_approach: Spatial strategy (confined, expansive, threshold, compressed)
- pacing_shape: Tempo arc (slow-burn, escalating, staccato, wave)
- music_relationship: How score functions (underscore, counterpoint, absence, late-entry)
- thematic_core: Primary theme (nostalgia, conformity, identity, wishes, justice, loneliness)
- tone_blend: Tonal recipe (wry-melancholy, eerie-warm, bitter-tender, etc.)
- scale_of_stakes: What's at risk (personal, communal, existential, cosmic)

For EACH category, provide:
1. "choice" — What Serling actually chose (be specific)
2. "alternatives" — 2-3 things he COULD have chosen but DIDN'T
3. "reasoning" — WHY this choice serves the episode (1-2 sentences)

Respond with ONLY valid JSON:
{
  "decisions": [
    { "category": "premise_type", "choice": "...", "alternatives": ["...", "..."], "reasoning": "..." }
  ]
}

Include exactly 16 decisions, one per category.`;

    const result = await callGemini(prompt, 4096);
    let cleaned = result.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    try {
      const parsed = JSON.parse(cleaned);
      for (const d of parsed.decisions || []) {
        allDecisions.push({
          id: `${epId}-${d.category}`,
          episodeId: epId,
          episodeTitle: ep.title,
          category: d.category,
          choice: d.choice || "",
          alternatives: d.alternatives || [],
          reasoning: d.reasoning || "",
          embedding: [],
        });
      }
    } catch {
      console.warn(`  Parse failed for ${ep.title}, skipping taxonomy`);
    }
  }

  console.log(`\n  Total decisions: ${allDecisions.length}`);
  console.log("  Embedding decisions...\n");

  const BATCH = 20;
  for (let i = 0; i < allDecisions.length; i += BATCH) {
    const batch = allDecisions.slice(i, i + BATCH);
    const texts = batch.map((d) => `${d.category}: ${d.choice}. ${d.reasoning}`);

    try {
      const embeddings = await embedBatch(texts);
      for (let j = 0; j < batch.length; j++) {
        batch[j].embedding = embeddings[j];
      }
    } catch {
      console.warn(`  Embed batch failed at ${i}, retrying...`);
      await sleep(5000);
      try {
        const embeddings = await embedBatch(texts);
        for (let j = 0; j < batch.length; j++) {
          batch[j].embedding = embeddings[j];
        }
      } catch {
        for (const d of batch) d.embedding = [];
      }
    }

    const progress = Math.min(i + BATCH, allDecisions.length);
    if (progress % 100 === 0 || progress === allDecisions.length) {
      console.log(`  Embedded ${progress}/${allDecisions.length}`);
    }
  }

  const outPath = path.join(SERLING_PKG, "taxonomy", "decisions.json");
  fs.writeFileSync(outPath, JSON.stringify(allDecisions, null, 2));
  console.log(`\n  Wrote ${allDecisions.length} decisions to ${outPath}`);
  return allDecisions.length;
}

// ─── Main ────────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   Rod Serling Complete Corpus Sourcer            ║");
  console.log("║   Powered by Gemini 2.0 Flash                   ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  ensureDir(CORPUS_RAW);

  const start = Date.now();

  await generateNarrations();
  await generateEpisodeAnalyses();
  await generateOtherWorks();
  await generateInterviews();
  await generateLectures();
  await generateEssays();

  const rawCount = countFiles(CORPUS_RAW);
  console.log(`\n  Total raw files generated: ${rawCount}`);

  const chunkCount = await chunkAndEmbed();
  const decisionCount = await generateTaxonomy();

  const elapsed = ((Date.now() - start) / 1000 / 60).toFixed(1);
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║   COMPLETE                                       ║");
  console.log(`║   Raw files: ${String(rawCount).padStart(4)}                                ║`);
  console.log(`║   Corpus chunks: ${String(chunkCount).padStart(4)} (embedded)               ║`);
  console.log(`║   Decision entries: ${String(decisionCount).padStart(4)} (embedded)            ║`);
  console.log(`║   Time: ${elapsed} minutes                          ║`);
  console.log("╚══════════════════════════════════════════════════╝\n");
}

function countFiles(dir) {
  let count = 0;
  if (!fs.existsSync(dir)) return 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      count += countFiles(path.join(dir, entry.name));
    } else if (entry.name.endsWith(".txt")) {
      count++;
    }
  }
  return count;
}

main().catch((e) => {
  console.error("\nFATAL:", e.message);
  process.exit(1);
});
