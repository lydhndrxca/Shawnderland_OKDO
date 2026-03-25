const fs = require("fs");
const path = require("path");

const API_KEY = process.env.GEMINI_API_KEY || "";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const RATE_LIMIT_MS = 2000;

const TASKS = [
  { file: "corpus-raw/essays/serling-biographical-profile__1975.txt", prompt: "You are a Rod Serling biographer. Write a comprehensive 3000-4000 word biographical and psychological profile of Rod Serling that focuses on how his life experiences directly shaped his creative decisions. Cover: his childhood in Binghamton NY and its influence on nostalgia themes; his traumatic WWII combat experience (Battle of Leyte, the death of his friend who was killed by a falling crate during a paradrop - which haunted him and shaped his view of random cruelty); his Jewish identity and how it informed his civil rights advocacy; his father early death and how it permeated his work with father-son themes; his battles with TV sponsors and censors over racial content (particularly A Town Has Turned to Dust); his move from live TV drama to filmed fantasy as a way to bypass censorship; his teaching at Ithaca College; his perfectionism and prolific output; his health decline and early death at 50. For each biographical element, explicitly connect it to specific creative patterns visible in his scripts." },
  { file: "corpus-raw/essays/serling-creative-philosophy__1963.txt", prompt: "You are a Rod Serling scholar. Compile a comprehensive 3000-word document of Rod Serling creative philosophy, using his own documented words and positions wherever possible. Organize by topic: his view of television potential and failures; his philosophy on writing; his position on the writer moral obligation; his belief in using fantasy/science fiction as social commentary; his views on censorship and sponsor interference; his advice to young writers; his thoughts on character vs. plot; his philosophy on twist endings; his views on dialogue and narration; and his position on commercial vs. artistic television. Include his most famous and frequently cited quotes with context." },
  { file: "corpus-raw/essays/serling-career-arc-analysis__1975.txt", prompt: "You are a television historian. Write a detailed 3000-word analysis of how Rod Serling creative style evolved across his career. Cover distinct phases: Early Career (1951-1955); Breakthrough Period (1955-1958); The Twilight Zone Era (1959-1964); Post-TZ Wilderness (1964-1969); Night Gallery Period (1969-1973); Final Phase (1973-1975). For each phase, identify specific technical and thematic shifts with episode examples." },
  { file: "corpus-raw/essays/serling-critical-analysis__2020.txt", prompt: "You are a television studies professor. Write a 3000-word scholarly analysis of what makes Rod Serling creative approach unique and identifiable, contrasting him with his Twilight Zone contemporaries (Charles Beaumont, Richard Matheson, George Clayton Johnson). Cover: distinctive sentence rhythms; specific-to-universal zoom; twist endings vs Matheson; narration as character vs Beaumont; recurring structural patterns; dialogue differences; psychological horror; signature thematic preoccupations." },
  { file: "corpus-raw/essays/serling-dialogue-patterns__1964.txt", prompt: "You are a screenwriting professor. Write a 2500-word analysis of Serling dialogue patterns and verbal tics. Include: characteristic sentence structures; vocabulary preferences; narration rhythms; how characters speak by social class; monologue vs dialogue; exposition handling; understatement at emotional peaks; 10-15 reconstructed examples from actual episodes." },
  { file: "corpus-raw/essays/serling-thematic-taxonomy__1964.txt", prompt: "You are a Twilight Zone scholar. Write a 3000-word taxonomy of Serling recurring themes with every theme connected to specific episodes. Cover: Nostalgia and impossibility of return; Conformity as social violence; The wish that destroys; Identity crisis; Obsolescence; Justice perverted; Cost of immortality; Isolation; War absurdity; Technology as dehumanizer. For each theme describe what Serling is arguing, how it evolved, and what personal experience drove it." }
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function callGemini(prompt) {
  const url = BASE_URL + "?key=" + API_KEY;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 8192 }
    })
  });
  if (!res.ok) throw new Error("API " + res.status + ": " + await res.text());
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No text in response");
  return text;
}

function wordCount(t) { return t.trim().split(/\s+/).filter(Boolean).length; }

async function main() {
  const results = [];
  for (let i = 0; i < TASKS.length; i++) {
    const { file, prompt } = TASKS[i];
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      results.push({ file, created: false, words: wordCount(fs.readFileSync(fullPath, "utf8")) });
      console.log("SKIP (exists): " + file);
      continue;
    }
    console.log("Generating " + (i + 1) + "/" + TASKS.length + ": " + file);
    try {
      const text = await callGemini(prompt);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, text, "utf8");
      results.push({ file, created: true, words: wordCount(text) });
      console.log("  -> " + wordCount(text) + " words");
    } catch (err) {
      console.error("  ERROR: " + err.message);
      results.push({ file, created: false, error: err.message });
    }
    if (i < TASKS.length - 1) await sleep(RATE_LIMIT_MS);
  }
  console.log("\n=== SUMMARY ===");
  results.forEach(r => {
    if (r.error) console.log(r.file + ": ERROR - " + r.error);
    else console.log(r.file + ": " + (r.created ? "CREATED" : "SKIPPED") + " - " + r.words + " words");
  });
}

main().catch(console.error);
