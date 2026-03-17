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
}

export function createSessionFromExternal(config: ExternalSessionConfig): string {
  const planning: PlanningData = {
    ...DEFAULT_PLANNING,
    writingType: config.writingType ?? "art-direction",
    projectContext: config.prompt,
    referenceAttachments: config.imageAttachments ?? [],
  };

  const sessionId = storeActions.newSession(config.title ?? "Art Direction Session");

  storeActions.setFullPlanning(planning);
  storeActions.setRoomAgents(
    config.selectedAgentIds.map((id) => ({ personaId: id, approved: false })),
  );

  const brief = compileBrief(planning);
  storeActions.setProducerBrief(brief);
  storeActions.addChatMessage(createBriefMessage(brief));
  storeActions.setRoomPhase("briefing");
  storeActions.setScreen("writing");

  return sessionId;
}
