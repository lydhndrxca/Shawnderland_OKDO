export function buildNormalizePrompt(
  seedText: string,
  userInputs: string[],
  seedContext?: string,
  influenceContext?: string[],
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

  prompt +=
    '## Instructions\n' +
    'Elaborate on the seed idea based ONLY on what the user has provided. ' +
    'Do NOT invent a target audience, domain, or use case that the user has not mentioned. ' +
    'If the user provided context, use it to frame your analysis. ' +
    'If no context was given, keep things open-ended and blue-sky.\n\n' +
    'Produce a structured normalization:\n' +
    '- seedSummary: 1-2 sentence elaboration of what this idea is about, staying faithful to the user\'s words\n' +
    '- assumptions: key-value pairs for things that are implied but not stated (label them clearly as assumptions)\n' +
    '- clarifyingQuestions: 0-2 questions only if something is genuinely ambiguous\n\n' +
    'Return JSON: { "seedSummary": "...", "assumptions": [{ "key": "...", "value": "...", "userOverride": false }], "clarifyingQuestions": ["..."] }\n';
  return prompt;
}
