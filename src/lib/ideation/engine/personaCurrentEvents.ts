import { generateText, generateTextWithSearch } from "@shawnderland/ai";
import type { SearchGroundedResult } from "@shawnderland/ai";

export interface PersonaNewsResult {
  summary: string;
  searchQueries: string[];
  sources: Array<{ uri: string; title: string }>;
  fetchedAt: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function isCacheFresh(cache: PersonaNewsResult | null | undefined): boolean {
  if (!cache?.fetchedAt) return false;
  return Date.now() - cache.fetchedAt < CACHE_TTL_MS;
}

/**
 * Two-step fetch: first extract relevant search topics from the persona's
 * researchData, then use Gemini with Google Search grounding to pull
 * real-time current events tailored to this persona.
 */
export async function fetchPersonaCurrentEvents(
  persona: { name: string; role: string; researchData: string },
): Promise<PersonaNewsResult> {
  // Step 1: Extract search topics from persona bio
  const extractPrompt = [
    `Analyze this creative persona's biography and extract the key topics that would determine what real-world news and current events they'd care about.`,
    ``,
    `Name: ${persona.name}`,
    `Role: ${persona.role}`,
    `Biography:\n${persona.researchData.slice(0, 2000)}`,
    ``,
    `Extract and return ONLY a comma-separated list of:`,
    `- Geographic locations they'd follow news about`,
    `- Industries, art forms, and cultural domains they track`,
    `- Specific people, studios, companies, or movements they reference`,
    `- Types of events they'd care about (awards shows, exhibitions, game releases, political events, etc.)`,
    ``,
    `Return ONLY the comma-separated topics, nothing else. Be specific. Maximum 15 topics.`,
  ].join("\n");

  let topics: string;
  try {
    topics = await generateText(extractPrompt, { temperature: 0.2 });
  } catch {
    topics = `${persona.role}, creative industry, art, design, entertainment`;
  }

  // Step 2: Search with grounding using the extracted topics
  const searchPrompt = [
    `You are ${persona.name}, a ${persona.role}. You're catching up on what's happening in the world right now.`,
    ``,
    `Based on your background and interests, report on the current events that would matter to you personally.`,
    ``,
    `Your areas of interest: ${topics.trim()}`,
    ``,
    `Cover ALL of these categories:`,
    `1. WORLD EVENTS: Major global news that everyone's talking about`,
    `2. LOCAL/REGIONAL: Events in the specific locations and regions you're connected to`,
    `3. YOUR INDUSTRY: News in your professional field and creative domain`,
    `4. POP CULTURE: Entertainment, media, art, music, film, games — things in your cultural orbit`,
    `5. PEOPLE YOU FOLLOW: What are key figures in your world up to right now?`,
    ``,
    `Be specific with names, dates, and details. Write as a concise briefing — 3-5 bullet points per category.`,
    `Use today's actual current events. This is a real-time briefing.`,
  ].join("\n");

  let result: SearchGroundedResult;
  try {
    result = await generateTextWithSearch(searchPrompt, { temperature: 0.3 });
  } catch {
    return {
      summary: "Unable to fetch current events at this time.",
      searchQueries: [],
      sources: [],
      fetchedAt: Date.now(),
    };
  }

  return {
    summary: result.text,
    searchQueries: result.searchQueries,
    sources: result.sources,
    fetchedAt: Date.now(),
  };
}
