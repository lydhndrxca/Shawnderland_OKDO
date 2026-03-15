/**
 * Nathan Fielder Corpus Scraper
 *
 * Scrapes actual transcripts from subslikescript.com (Nathan For You,
 * The Rehearsal) and interview transcripts from various sources.
 * Outputs raw text files organized by source type for ingestion.
 *
 * Usage: node packages/fielder/scripts/scrape-corpus.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_DIR = path.join(__dirname, "..", "corpus-raw");

const DELAY_MS = 2000;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "text/html",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function extractTranscript(html) {
  // subslikescript stores transcript in <div class="full-script">
  const fullScriptMatch = html.match(/<div class="full-script">([\s\S]*?)<\/div>/);
  if (fullScriptMatch) {
    return fullScriptMatch[1]
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // Fallback: try to find any large block of text
  const bodyMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/);
  if (bodyMatch) {
    return bodyMatch[1]
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  return null;
}

// Nathan For You episodes on subslikescript.com
const NFY_EPISODES = [
  // Season 1
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-1/episode-1-Yogurt_ShopPizzeria", file: "nfy-s01e01__Yogurt-Shop-Pizzeria__2013.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-1/episode-3-Clothing_StoreRestaurant", file: "nfy-s01e03__Clothing-Store-Restaurant__2013.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-1/episode-4-Gas_StationCaricature_Artist", file: "nfy-s01e04__Gas-Station-Caricature-Artist__2013.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-1/episode-5-Haunted_HouseThe_Hunk", file: "nfy-s01e05__Haunted-House-The-Hunk__2013.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-1/episode-6-Funeral_HomeBurger_JointSkydiving", file: "nfy-s01e06__Funeral-Home-Burger-Joint__2013.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-1/episode-7-The_Claw_of_Shame", file: "nfy-s01e07__The-Claw-of-Shame__2013.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-1/episode-8-Private_InvestigatorTaxi_Company", file: "nfy-s01e08__Private-Investigator-Taxi__2013.txt" },
  // Season 2
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-2/episode-1-Mechanic_Realtor", file: "nfy-s02e01__Mechanic-Realtor__2014.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-2/episode-2-Souvenir_Shop_ELAIFF", file: "nfy-s02e02__Souvenir-Shop-ELAIFF__2014.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-2/episode-3-Pet_Store_Maid_Service", file: "nfy-s02e03__Pet-Store-Maid-Service__2014.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-2/episode-4-Liquor_Store_Exterminator_Car_Wash", file: "nfy-s02e04__Liquor-Store-Exterminator__2014.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-2/episode-5-Dumb_Starbucks", file: "nfy-s02e05__Dumb-Starbucks__2014.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-2/episode-6-Dating_Service_Party_Planner", file: "nfy-s02e06__Dating-Service-Party-Planner__2014.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-2/episode-7-Taxi_Service_Hot_Dog_Stand", file: "nfy-s02e07__Taxi-Service-Hot-Dog-Stand__2014.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-2/episode-8-Toy_Company_Movie_Theatre", file: "nfy-s02e08__Toy-Company-Movie-Theatre__2014.txt" },
  // Season 3
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-3/episode-1-Electronics_Store", file: "nfy-s03e01__Electronics-Store__2015.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-3/episode-2-Horseback_RidingMan_Zone", file: "nfy-s03e02__Horseback-Riding-Man-Zone__2015.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-3/episode-3-The_Movement", file: "nfy-s03e03__The-Movement__2015.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-3/episode-4-Sporting_Goods_StoreAntique_Store", file: "nfy-s03e04__Sporting-Goods-Antique-Store__2015.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-3/episode-5-Smokers_Allowed", file: "nfy-s03e05__Smokers-Allowed__2015.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-3/episode-6-HotelTravel_Agent", file: "nfy-s03e06__Hotel-Travel-Agent__2015.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-3/episode-7-Nail_SalonFun", file: "nfy-s03e07__Nail-Salon-Fun__2015.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-3/episode-8-The_Hero", file: "nfy-s03e08__The-Hero__2015.txt" },
  // Season 4
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-4/episode-1-Nathan_for_You_A_Celebration", file: "nfy-s04e01__A-Celebration__2017.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-4/episode-1-The_Richards_Tip", file: "nfy-s04e01b__The-Richards-Tip__2017.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-4/episode-2-Chili_ShopMassage_Parlor", file: "nfy-s04e02__Chili-Shop-Massage-Parlor__2017.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-4/episode-3-Andy_vs_Uber", file: "nfy-s04e03__Andy-vs-Uber__2017.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-4/episode-4-The_Anecdote", file: "nfy-s04e04__The-Anecdote__2017.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-4/episode-5-Shipping_Logistics_Company", file: "nfy-s04e05__Shipping-Logistics__2017.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-4/episode-6-Computer_RepairPsychic", file: "nfy-s04e06__Computer-Repair-Psychic__2017.txt" },
  { url: "https://subslikescript.com/series/Nathan_for_You-2297757/season-4/episode-7-Finding_Frances", file: "nfy-s04e07__Finding-Frances__2017.txt" },
];

// The Rehearsal episodes on subslikescript.com
const REHEARSAL_EPISODES = [
  { url: "https://subslikescript.com/series/The_Rehearsal-10802170/season-1/episode-1-Episode_11", file: "reh-s01e01__Orange-Juice-No-Pulp__2022.txt" },
  { url: "https://subslikescript.com/series/The_Rehearsal-10802170/season-1/episode-2-Episode_12", file: "reh-s01e02__Scion__2022.txt" },
  { url: "https://subslikescript.com/series/The_Rehearsal-10802170/season-1/episode-3-Episode_13", file: "reh-s01e03__Gold-Digger__2022.txt" },
  { url: "https://subslikescript.com/series/The_Rehearsal-10802170/season-1/episode-4-The_Fielder_Method", file: "reh-s01e04__The-Fielder-Method__2022.txt" },
  { url: "https://subslikescript.com/series/The_Rehearsal-10802170/season-1/episode-5-Apocalypto", file: "reh-s01e05__Apocalypto__2022.txt" },
  { url: "https://subslikescript.com/series/The_Rehearsal-10802170/season-1/episode-6-Pretend_Daddy", file: "reh-s01e06__Pretend-Daddy__2022.txt" },
];

// Interview and article sources (will be fetched and extracted)
const INTERVIEW_SOURCES = [
  { url: "https://www.npr.org/transcripts/1119071898", file: "interview__NPR-Pop-Culture-Happy-Hour-Rehearsal__2022.txt", type: "npr" },
  { url: "https://www.npr.org/transcripts/1111488990", file: "interview__NPR-Fresh-Air-Rehearsal-Review__2022.txt", type: "npr" },
  { url: "https://www.npr.org/transcripts/nx-s1-5372583", file: "interview__NPR-Rehearsal-Season-2__2025.txt", type: "npr" },
  { url: "https://www.npr.org/transcripts/1197954642", file: "interview__NPR-Benny-Safdie-Curse__2024.txt", type: "npr" },
];

function extractNPRTranscript(html) {
  // NPR stores transcript in <div class="transcript"> or article body
  const transcriptMatch = html.match(/<div[^>]*class="[^"]*transcript[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (transcriptMatch) {
    return transcriptMatch[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // Fallback: extract from story body
  const storyMatch = html.match(/<div[^>]*id="storytext"[^>]*>([\s\S]*?)<\/div>/);
  if (storyMatch) {
    return storyMatch[1]
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // Broader fallback
  const bodyText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Take a meaningful chunk from the middle (skip nav/boilerplate)
  const lines = bodyText.split("\n").filter((l) => l.trim().length > 20);
  if (lines.length > 10) {
    return lines.join("\n").trim();
  }

  return null;
}

async function scrapeEpisodes(episodes, outputSubdir, label) {
  const outDir = path.join(RAW_DIR, outputSubdir);
  ensureDir(outDir);

  let scraped = 0;
  let skipped = 0;

  for (let i = 0; i < episodes.length; i++) {
    const ep = episodes[i];
    const outPath = path.join(outDir, ep.file);

    if (fs.existsSync(outPath)) {
      const existing = fs.readFileSync(outPath, "utf-8");
      if (existing.length > 500) {
        skipped++;
        continue;
      }
    }

    console.log(`  [${i + 1}/${episodes.length}] ${ep.file.replace(/.txt$/, "")}`);

    try {
      const html = await fetchPage(ep.url);
      const transcript = extractTranscript(html);

      if (transcript && transcript.length > 200) {
        fs.writeFileSync(outPath, transcript, "utf-8");
        scraped++;
        console.log(`    OK (${transcript.length} chars)`);
      } else {
        console.log(`    WARN: Transcript too short or not found`);
      }
    } catch (err) {
      console.error(`    ERROR: ${err.message}`);
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`  ${label}: ${scraped} scraped, ${skipped} already existed\n`);
  return scraped;
}

async function scrapeInterviews() {
  const outDir = path.join(RAW_DIR, "interviews");
  ensureDir(outDir);

  let scraped = 0;

  for (let i = 0; i < INTERVIEW_SOURCES.length; i++) {
    const src = INTERVIEW_SOURCES[i];
    const outPath = path.join(outDir, src.file);

    if (fs.existsSync(outPath) && fs.readFileSync(outPath, "utf-8").length > 500) {
      console.log(`  [${i + 1}/${INTERVIEW_SOURCES.length}] Already exists: ${src.file}`);
      continue;
    }

    console.log(`  [${i + 1}/${INTERVIEW_SOURCES.length}] ${src.file}`);

    try {
      const html = await fetchPage(src.url);
      let text;

      if (src.type === "npr") {
        text = extractNPRTranscript(html);
      } else {
        text = extractTranscript(html);
      }

      if (text && text.length > 200) {
        fs.writeFileSync(outPath, text, "utf-8");
        scraped++;
        console.log(`    OK (${text.length} chars)`);
      } else {
        console.log(`    WARN: Content too short or not found`);
      }
    } catch (err) {
      console.error(`    ERROR: ${err.message}`);
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  return scraped;
}

async function main() {
  console.log("=== Nathan Fielder Corpus Scraper ===\n");
  ensureDir(RAW_DIR);

  console.log("--- Nathan For You Transcripts ---");
  await scrapeEpisodes(NFY_EPISODES, "scripts", "Nathan For You");

  console.log("--- The Rehearsal Transcripts ---");
  await scrapeEpisodes(REHEARSAL_EPISODES, "scripts", "The Rehearsal");

  console.log("--- Interview Transcripts ---");
  await scrapeInterviews();

  // Count total files
  let totalFiles = 0;
  let totalChars = 0;
  for (const subdir of ["scripts", "interviews"]) {
    const dir = path.join(RAW_DIR, subdir);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".txt"));
    for (const f of files) {
      totalFiles++;
      totalChars += fs.readFileSync(path.join(dir, f), "utf-8").length;
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total files: ${totalFiles}`);
  console.log(`Total characters: ${totalChars.toLocaleString()}`);
  console.log(`Raw corpus saved to: ${RAW_DIR}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Run generate-corpus.mjs to chunk + supplement with Gemini analysis`);
  console.log(`  2. Run generate-taxonomy.mjs to build decision taxonomy`);
  console.log(`  3. Run embed-all.mjs to embed everything`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
