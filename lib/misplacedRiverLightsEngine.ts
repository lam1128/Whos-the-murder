import {
  getMisplacedRiverLightsScene,
  getMisplacedRiverLightsSceneEntryEffect,
  misplacedRiverLightsScenario,
  misplacedRiverLightsSourceVersion,
} from "./misplacedRiverLightsScenario";
import {
  MisplacedRiverLightsChoice,
  MisplacedRiverLightsProfession,
  MisplacedRiverLightsState,
  MisplacedRiverLightsWeapon,
} from "./misplacedRiverLightsTypes";

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
  version: misplacedRiverLightsSourceVersion,
  startSceneId: misplacedRiverLightsScenario.startSceneId,
  routeOrder: misplacedRiverLightsScenario.routeOrder,
});

export const MISPLACED_RIVER_LIGHTS_SAVE_KEY =
  `misplaced-river-lights.game-state.${storageRevision}`;
export const MISPLACED_RIVER_LIGHTS_DAY_CHECKPOINT_SAVE_KEY =
  `misplaced-river-lights.checkpoint.day.${storageRevision}`;
export const MISPLACED_RIVER_LIGHTS_NIGHT_CHECKPOINT_SAVE_KEY =
  `misplaced-river-lights.checkpoint.night.${storageRevision}`;
export const MISPLACED_RIVER_LIGHTS_CHECKPOINT_SCENE_IDS = new Set([
  "dusk_riverbank_wait",
  "night_watch_positions",
]);

type MisplacedRiverLightsCheckpointKind = "day" | "night";

const MISPLACED_RIVER_LIGHTS_CHECKPOINT_CONFIG: Record<
  MisplacedRiverLightsCheckpointKind,
  {
    saveKey: string;
    sceneIds: Set<string>;
  }
> = {
  day: {
    saveKey: MISPLACED_RIVER_LIGHTS_DAY_CHECKPOINT_SAVE_KEY,
    sceneIds: new Set(["dusk_riverbank_wait"]),
  },
  night: {
    saveKey: MISPLACED_RIVER_LIGHTS_NIGHT_CHECKPOINT_SAVE_KEY,
    sceneIds: new Set(["night_watch_positions"]),
  },
};

function getCheckpointKind(sceneId: string): MisplacedRiverLightsCheckpointKind | null {
  for (const [kind, config] of Object.entries(MISPLACED_RIVER_LIGHTS_CHECKPOINT_CONFIG) as [
    MisplacedRiverLightsCheckpointKind,
    (typeof MISPLACED_RIVER_LIGHTS_CHECKPOINT_CONFIG)[MisplacedRiverLightsCheckpointKind],
  ][]) {
    if (config.sceneIds.has(sceneId)) return kind;
  }

  return null;
}

function isCheckpointScene(sceneId: string): boolean {
  return MISPLACED_RIVER_LIGHTS_CHECKPOINT_SCENE_IDS.has(sceneId);
}

function appendTransitionOutcome(
  base: MisplacedRiverLightsState["transitionOutcome"],
  updates?: {
    outcomeNarration?: string[];
    outcomeDialogue?: MisplacedRiverLightsState["transitionOutcome"]["npcDialogue"];
  },
): MisplacedRiverLightsState["transitionOutcome"] {
  return {
    narration: [...base.narration, ...(updates?.outcomeNarration ?? [])],
    npcDialogue: [...base.npcDialogue, ...(updates?.outcomeDialogue ?? [])],
  };
}

export function createMisplacedRiverLightsInitialState(player: {
  name: string;
  profession: MisplacedRiverLightsProfession;
  weapon: MisplacedRiverLightsWeapon;
}): MisplacedRiverLightsState {
  const timestamp = now();
  const startSceneEffect = getMisplacedRiverLightsSceneEntryEffect(
    misplacedRiverLightsScenario.startSceneId,
  );

  return {
    player: {
      name: player.name,
      profession: player.profession,
      weapon: player.weapon,
    },
    currentSceneId: misplacedRiverLightsScenario.startSceneId,
    flags: {
      ...misplacedRiverLightsScenario.initialFlags,
      ...(startSceneEffect?.setFlags ?? {}),
    },
    inventory: misplacedRiverLightsScenario.initialInventory,
    history: [
      {
        id: `system-${Date.now()}`,
        sceneId: misplacedRiverLightsScenario.startSceneId,
        source: "system",
        text: `《错位的河灯》当前版本 ${misplacedRiverLightsSourceVersion} 已开始。`,
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

export function getMisplacedRiverLightsRuntimeScene(sceneId: string) {
  return getMisplacedRiverLightsScene(sceneId);
}

export function saveMisplacedRiverLightsGame(
  state: MisplacedRiverLightsState,
): MisplacedRiverLightsState {
  const savedState = {
    ...state,
    updatedAt: now(),
  };

  globalThis.localStorage?.setItem(MISPLACED_RIVER_LIGHTS_SAVE_KEY, JSON.stringify(savedState));
  return savedState;
}

export function loadMisplacedRiverLightsGame(): MisplacedRiverLightsState | null {
  const raw = globalThis.localStorage?.getItem(MISPLACED_RIVER_LIGHTS_SAVE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as MisplacedRiverLightsState;
  } catch {
    return null;
  }
}

export function saveMisplacedRiverLightsCheckpointGame(
  state: MisplacedRiverLightsState,
): MisplacedRiverLightsState {
  const kind = getCheckpointKind(state.currentSceneId) ?? "day";
  const snapshot = {
    ...state,
    updatedAt: now(),
  };

  globalThis.localStorage?.setItem(
    MISPLACED_RIVER_LIGHTS_CHECKPOINT_CONFIG[kind].saveKey,
    JSON.stringify(snapshot),
  );

  return snapshot;
}

export function loadMisplacedRiverLightsCheckpointGame(
  kind: MisplacedRiverLightsCheckpointKind,
): MisplacedRiverLightsState | null {
  const raw = globalThis.localStorage?.getItem(
    MISPLACED_RIVER_LIGHTS_CHECKPOINT_CONFIG[kind].saveKey,
  );
  if (!raw) return null;

  try {
    return JSON.parse(raw) as MisplacedRiverLightsState;
  } catch {
    return null;
  }
}

export function clearMisplacedRiverLightsSave(): void {
  globalThis.localStorage?.removeItem(MISPLACED_RIVER_LIGHTS_SAVE_KEY);
}

export function applyMisplacedRiverLightsChoice(
  state: MisplacedRiverLightsState,
  choice: MisplacedRiverLightsChoice,
): MisplacedRiverLightsState {
  if (!choice.nextSceneId) {
    return {
      ...state,
      lastFeedback: choice.notice ?? null,
      updatedAt: now(),
    };
  }

  const timestamp = now();
  const nextScene = getMisplacedRiverLightsScene(choice.nextSceneId);
  const nextSceneEntryEffect = getMisplacedRiverLightsSceneEntryEffect(nextScene.id);

  const updatedState: MisplacedRiverLightsState = {
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
    return saveMisplacedRiverLightsCheckpointGame(updatedState);
  }

  return updatedState;
}

export function applyMisplacedRiverLightsFreeInput(
  state: MisplacedRiverLightsState,
  text: string,
): MisplacedRiverLightsState {
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
