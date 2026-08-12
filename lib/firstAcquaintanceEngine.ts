import {
  firstAcquaintanceScenario,
  firstAcquaintanceSourceVersion,
  getFirstAcquaintanceScene,
  getFirstAcquaintanceSceneEntryEffect,
} from "./firstAcquaintanceScenario";
import { FirstAcquaintanceChoice, FirstAcquaintanceState } from "./firstAcquaintanceTypes";

function createStorageRevision(input: unknown): string {
  const serialized = JSON.stringify(input);
  let hash = 2166136261;

  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `r${(hash >>> 0).toString(16)}`;
}

function now(): string {
  return new Date().toISOString();
}

const storageRevision = createStorageRevision({
  version: firstAcquaintanceSourceVersion,
  startSceneId: firstAcquaintanceScenario.startSceneId,
  routeOrder: firstAcquaintanceScenario.routeOrder,
});

export const FIRST_ACQUAINTANCE_SAVE_KEY = `first-acquaintance.game-state.${storageRevision}`;
export const FIRST_ACQUAINTANCE_REBANDAGE_CHECKPOINT_SAVE_KEY =
  `first-acquaintance.checkpoint.rebandage.${storageRevision}`;
export const FIRST_ACQUAINTANCE_ACADEMY_CHECKPOINT_SAVE_KEY =
  `first-acquaintance.checkpoint.academy.${storageRevision}`;
export const FIRST_ACQUAINTANCE_CHECKPOINT_SCENE_IDS = new Set([
  "home_exam_end_reminder",
  "academy_pickup_opening",
]);

type FirstAcquaintanceCheckpointKind = "rebandage" | "academy";

const FIRST_ACQUAINTANCE_CHECKPOINT_CONFIG: Record<
  FirstAcquaintanceCheckpointKind,
  {
    saveKey: string;
    sceneIds: Set<string>;
  }
> = {
  rebandage: {
    saveKey: FIRST_ACQUAINTANCE_REBANDAGE_CHECKPOINT_SAVE_KEY,
    sceneIds: new Set(["home_exam_end_reminder"]),
  },
  academy: {
    saveKey: FIRST_ACQUAINTANCE_ACADEMY_CHECKPOINT_SAVE_KEY,
    sceneIds: new Set(["academy_pickup_opening"]),
  },
};

function getCheckpointKind(sceneId: string): FirstAcquaintanceCheckpointKind | null {
  for (const [kind, config] of Object.entries(FIRST_ACQUAINTANCE_CHECKPOINT_CONFIG) as [
    FirstAcquaintanceCheckpointKind,
    (typeof FIRST_ACQUAINTANCE_CHECKPOINT_CONFIG)[FirstAcquaintanceCheckpointKind],
  ][]) {
    if (config.sceneIds.has(sceneId)) return kind;
  }

  return null;
}

function isCheckpointScene(sceneId: string): boolean {
  return FIRST_ACQUAINTANCE_CHECKPOINT_SCENE_IDS.has(sceneId);
}

function appendTransitionOutcome(
  base: FirstAcquaintanceState["transitionOutcome"],
  updates?: {
    outcomeNarration?: string[];
    outcomeDialogue?: FirstAcquaintanceState["transitionOutcome"]["npcDialogue"];
  },
): FirstAcquaintanceState["transitionOutcome"] {
  return {
    narration: [...base.narration, ...(updates?.outcomeNarration ?? [])],
    npcDialogue: [...base.npcDialogue, ...(updates?.outcomeDialogue ?? [])],
  };
}

export function createFirstAcquaintanceInitialState(player: {
  name: string;
}): FirstAcquaintanceState {
  const timestamp = now();
  const startSceneEffect = getFirstAcquaintanceSceneEntryEffect(firstAcquaintanceScenario.startSceneId);

  return {
    player: {
      name: player.name,
      profession: "潜行修",
      weapon: "匕首",
    },
    currentSceneId: firstAcquaintanceScenario.startSceneId,
    flags: {
      ...firstAcquaintanceScenario.initialFlags,
      ...(startSceneEffect?.setFlags ?? {}),
    },
    history: [
      {
        id: `system-${Date.now()}`,
        sceneId: firstAcquaintanceScenario.startSceneId,
        source: "system",
        text: `《初识》当前版本 ${firstAcquaintanceSourceVersion} 已开始。`,
        createdAt: timestamp,
      },
    ],
    transitionOutcome: {
      narration: startSceneEffect?.outcomeNarration ?? [],
      npcDialogue: startSceneEffect?.outcomeDialogue ?? [],
    },
    lastFeedback: null,
    updatedAt: timestamp,
  };
}

export function getFirstAcquaintanceRuntimeScene(sceneId: string) {
  return getFirstAcquaintanceScene(sceneId);
}

export function saveFirstAcquaintanceGame(
  state: FirstAcquaintanceState,
): FirstAcquaintanceState {
  const savedState = {
    ...state,
    updatedAt: now(),
  };

  globalThis.localStorage?.setItem(FIRST_ACQUAINTANCE_SAVE_KEY, JSON.stringify(savedState));
  return savedState;
}

export function loadFirstAcquaintanceGame(): FirstAcquaintanceState | null {
  const raw = globalThis.localStorage?.getItem(FIRST_ACQUAINTANCE_SAVE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as FirstAcquaintanceState;
  } catch {
    return null;
  }
}

export function saveFirstAcquaintanceCheckpointGame(
  state: FirstAcquaintanceState,
): FirstAcquaintanceState {
  const kind = getCheckpointKind(state.currentSceneId) ?? "rebandage";
  const snapshot = {
    ...state,
    updatedAt: now(),
  };

  globalThis.localStorage?.setItem(
    FIRST_ACQUAINTANCE_CHECKPOINT_CONFIG[kind].saveKey,
    JSON.stringify(snapshot),
  );

  return snapshot;
}

export function loadFirstAcquaintanceCheckpointGame(
  kind: FirstAcquaintanceCheckpointKind,
): FirstAcquaintanceState | null {
  const raw = globalThis.localStorage?.getItem(
    FIRST_ACQUAINTANCE_CHECKPOINT_CONFIG[kind].saveKey,
  );
  if (!raw) return null;

  try {
    return JSON.parse(raw) as FirstAcquaintanceState;
  } catch {
    return null;
  }
}

export function clearFirstAcquaintanceSave(): void {
  globalThis.localStorage?.removeItem(FIRST_ACQUAINTANCE_SAVE_KEY);
}

export function applyFirstAcquaintanceChoice(
  state: FirstAcquaintanceState,
  choice: FirstAcquaintanceChoice,
): FirstAcquaintanceState {
  if (!choice.nextSceneId) {
    return {
      ...state,
      lastFeedback: choice.notice ?? null,
      updatedAt: now(),
    };
  }

  const timestamp = now();
  const nextScene = getFirstAcquaintanceScene(choice.nextSceneId);
  const nextSceneEntryEffect = getFirstAcquaintanceSceneEntryEffect(nextScene.id);

  const updatedState: FirstAcquaintanceState = {
    ...state,
    currentSceneId: nextScene.id,
    flags: {
      ...state.flags,
      ...(choice.effect?.setFlags ?? {}),
      ...(nextSceneEntryEffect?.setFlags ?? {}),
    },
    history: [
      ...state.history,
      {
        id: `choice-${Date.now()}`,
        sceneId: state.currentSceneId,
        source: "choice",
        text: choice.text,
        createdAt: timestamp,
      },
    ],
    transitionOutcome: appendTransitionOutcome(
      {
        narration: choice.effect?.outcomeNarration ?? [],
        npcDialogue: choice.effect?.outcomeDialogue ?? [],
      },
      nextSceneEntryEffect,
    ),
    lastFeedback: null,
    updatedAt: timestamp,
  };

  if (isCheckpointScene(nextScene.id)) {
    return saveFirstAcquaintanceCheckpointGame(updatedState);
  }

  return updatedState;
}

export function applyFirstAcquaintanceFreeInput(
  state: FirstAcquaintanceState,
  text: string,
): FirstAcquaintanceState {
  const cleanText = text.trim();
  if (!cleanText) return state;

  return {
    ...state,
    history: [
      ...state.history,
      {
        id: `free-${Date.now()}`,
        sceneId: state.currentSceneId,
        source: "free_input",
        text: cleanText,
        createdAt: now(),
      },
    ],
    lastFeedback: null,
    updatedAt: now(),
  };
}
