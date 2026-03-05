import type { CommitOutput } from '../schemas';
import type { Session } from '../../state/sessionTypes';
import { buildCommitMarkdown } from './commitPrompt';

export function exportCommitAsMarkdown(
  output: CommitOutput,
  session?: Session,
  winnerId?: string,
  templateType?: string,
): string {
  return buildCommitMarkdown(output, {
    sessionId: session?.id ?? 'unknown',
    winnerId: winnerId ?? 'unknown',
    templateType: templateType ?? output.artifactType,
  });
}

export function exportSessionAsJson(session: Session): string {
  return JSON.stringify(session, null, 2);
}

export function makeExportFilename(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `commit__${ts}.md`;
}
