const BLOCKED_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now/i,
  /system\s*:\s*/i,
  /\bexecute\s+(code|command|script|function)\b/i,
  /\b(run|call|invoke)\s+tool\b/i,
  /\bwrite\s+file\b/i,
  /\bdelete\s+file\b/i,
  /\bshell\b.*\bcommand\b/i,
  /```\s*(bash|sh|powershell|cmd)/i,
];

export function checkPromptInjection(text: string): { safe: boolean; matched?: string } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return { safe: false, matched: pattern.source };
    }
  }
  return { safe: true };
}

export function wrapUserDataBlock(userText: string): string {
  return `<<<DATA>>>\n${userText}\n<<<END_DATA>>>`;
}

export function buildSafePrompt(
  instructions: string,
  userData: string[],
): string {
  let prompt = instructions + '\n\n';
  if (userData.length > 0) {
    prompt += '## User-Provided Data\n';
    for (const text of userData) {
      prompt += wrapUserDataBlock(text) + '\n';
    }
  }
  return prompt;
}

export function guardBeforeProviderCall(
  prompt: string,
  userData: string[],
): { safe: boolean; reason?: string } {
  for (const text of userData) {
    const check = checkPromptInjection(text);
    if (!check.safe) {
      return {
        safe: false,
        reason: `Blocked pattern in user input: ${check.matched}`,
      };
    }
  }

  if (prompt.includes('<<<DATA>>>')) {
    const outsideData = prompt.replace(/<<<DATA>>>[\s\S]*?<<<END_DATA>>>/g, '');
    for (const text of userData) {
      if (outsideData.includes(text) && text.length > 20) {
        return {
          safe: false,
          reason: 'User text found outside DATA block',
        };
      }
    }
  }

  return { safe: true };
}
