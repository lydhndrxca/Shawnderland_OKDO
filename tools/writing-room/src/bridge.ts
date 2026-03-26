/**
 * Bridge module for creating Writing Room sessions from external apps (e.g., ConceptLab).
 */

import { storeActions } from "./store";
import { compileBrief, createBriefMessage } from "./agentEngine";
import type { PlanningData, ChatAttachment, WritingType } from "./types";
import { DEFAULT_PLANNING } from "./types";

export interface ExternalSessionConfig {
  title?: string;
  writingType?: WritingType;
  prompt: string;
  selectedAgentIds: string[];
  imageAttachments?: ChatAttachment[];
  characterContext?: string;
}

export function createSessionFromExternal(config: ExternalSessionConfig): string {
  let projectContext = config.prompt;
  if (config.characterContext) {
    projectContext += `\n\n=== CHARACTER DESIGN CONTEXT ===\nThe following is the full character design sheet — identity, description, attributes, and any bible/costume/style notes used to generate the image(s) being discussed. Use this to understand the character fully.\n\n${config.characterContext}\n=== END CHARACTER CONTEXT ===`;
  }

  const planning: PlanningData = {
    ...DEFAULT_PLANNING,
    writingType: config.writingType ?? "art-direction",
    projectContext,
    referenceAttachments: config.imageAttachments ?? [],
  };

  const sessionId = storeActions.newSession(config.title ?? "Art Direction Session");

  storeActions.setFullPlanning(planning);
  storeActions.setRoomAgents(
    config.selectedAgentIds.map((id) => ({ personaId: id, approved: false })),
  );

  const brief = compileBrief(planning);
  storeActions.setProducerBrief(brief);
  const refImages = planning.referenceAttachments?.filter((a) => a.type === "image" && a.base64) ?? [];
  storeActions.addChatMessage(createBriefMessage(brief, refImages.length > 0 ? refImages : undefined));
  storeActions.setRoomPhase("briefing");
  storeActions.setScreen("writing");

  return sessionId;
}
