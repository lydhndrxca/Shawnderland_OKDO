export function buildNormalizePrompt(
  seedText: string,
  userInputs: string[],
  seedContext?: string,
  influenceContext?: string[],
  strictAdherence?: boolean,
): string {
  let prompt = '[STAGE:normalize]\n\n';
  prompt += `## Seed Idea\n${seedText}\n\n`;

  if (seedContext) {
    prompt += `## Context Provided by User\n${seedContext}\n\n`;
  }

  if (userInputs.length > 0) {
    prompt += '## User Constraints\n';
    for (const input of userInputs) {
      prompt += `- ${input}\n`;
    }
    prompt += '\n';
  }

  if (influenceContext && influenceContext.length > 0) {
    prompt += influenceContext.join('\n\n') + '\n\n';
  }

  if (strictAdherence) {
    prompt +=
      '## ⚠ STRICT ADHERENCE MODE\n' +
      'You MUST interpret the seed idea EXACTLY as the user stated it. Do NOT impose any framing, ' +
      'categorization, or domain that is not explicitly present in the seed text or context.\n' +
      'Specifically:\n' +
      '- Do NOT assume this is a "product idea", "game idea", "app idea", "business idea", or any other ' +
      'category unless the user EXPLICITLY uses those words or it is unmistakably clear from context.\n' +
      '- Do NOT invent a target audience, market, revenue model, or use case.\n' +
      '- Do NOT reinterpret an abstract, artistic, or open-ended idea as something commercial or utilitarian.\n' +
      '- Keep the summary, assumptions, and questions tightly scoped to ONLY what the user actually wrote.\n' +
      '- If the idea is vague or abstract, treat it as intentionally vague — do not "helpfully" narrow it.\n\n';
  }

  prompt +=
    '## Instructions\n' +
    'Elaborate on the seed idea based ONLY on what the user has provided. ' +
    'Do NOT invent a target audience, domain, or use case that the user has not mentioned. ' +
    'If the user provided context, use it to frame your analysis. ' +
    'If no context was given, keep things open-ended and blue-sky.\n\n' +
    'Produce a structured normalization:\n' +
    '- seedSummary: 1-2 sentence elaboration of what this idea is about, staying faithful to the user\'s words\n' +
    '- assumptions: key-value pairs for things that are implied but not stated (label them clearly as assumptions)\n' +
    '- clarifyingQuestions: 2-4 targeted questions that would meaningfully improve the quality of generated ideas if answered. Ask about intent, scope, audience, constraints, or priorities that are not clear from the seed.\n\n' +
    'Return JSON: { "seedSummary": "...", "assumptions": [{ "key": "...", "value": "...", "userOverride": false }], "clarifyingQuestions": ["..."] }\n';
  return prompt;
}
