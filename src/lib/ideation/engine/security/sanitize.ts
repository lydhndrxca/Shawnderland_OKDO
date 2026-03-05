const MAX_SEED_LENGTH = 5000;
const MAX_USER_INPUT_LENGTH = 2000;
const MAX_PROMPT_HINT_LENGTH = 500;

const CONTROL_CHAR_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
const EXCESSIVE_WHITESPACE_RE = /[ \t]{4,}/g;
const EXCESSIVE_NEWLINES_RE = /\n{4,}/g;

function clean(text: string, maxLen: number): string {
  let s = text.replace(CONTROL_CHAR_RE, '');
  s = s.replace(EXCESSIVE_WHITESPACE_RE, '   ');
  s = s.replace(EXCESSIVE_NEWLINES_RE, '\n\n\n');
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s.trim();
}

export function sanitizeSeedText(input: string): string {
  return clean(input, MAX_SEED_LENGTH);
}

export function sanitizeUserInput(input: string): string {
  return clean(input, MAX_USER_INPUT_LENGTH);
}

export function sanitizePromptHint(input: string): string {
  return clean(input, MAX_PROMPT_HINT_LENGTH);
}

export function sanitizeModelOutput(output: string): string {
  return output.replace(CONTROL_CHAR_RE, '');
}

export const LIMITS = {
  MAX_SEED_LENGTH,
  MAX_USER_INPUT_LENGTH,
  MAX_PROMPT_HINT_LENGTH,
} as const;
