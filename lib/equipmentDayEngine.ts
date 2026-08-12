import {
  equipmentDayScenario,
  equipmentDaySourceVersion,
  getEquipmentDayScene,
  getEquipmentDaySceneEntryEffect,
} from "./equipmentDayScenario";
import {
  EquipmentDayChoice,
  EquipmentDayInventoryItem,
  EquipmentDayState,
} from "./equipmentDayTypes";

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
  version: equipmentDaySourceVersion,
  startSceneId: equipmentDayScenario.startSceneId,
  routeOrder: equipmentDayScenario.routeOrder,
});

export const EQUIPMENT_DAY_SAVE_KEY = `equipment-day.game-state.${storageRevision}`;
export const EQUIPMENT_DAY_LUNCH_CHECKPOINT_SAVE_KEY =
  `equipment-day.checkpoint.lunch.${storageRevision}`;
export const EQUIPMENT_DAY_DINNER_CHECKPOINT_SAVE_KEY =
  `equipment-day.checkpoint.dinner.${storageRevision}`;
export const EQUIPMENT_DAY_CHECKPOINT_SCENE_IDS = new Set([
  "ch4_20_lunch",
  "ch4_44_dinner_start",
]);

type EquipmentDayCheckpointKind = "lunch" | "dinner";

const EQUIPMENT_DAY_CHECKPOINT_CONFIG: Record<
  EquipmentDayCheckpointKind,
  {
    saveKey: string;
    sceneIds: Set<string>;
    feedback: string;
  }
> = {
  lunch: {
    saveKey: EQUIPMENT_DAY_LUNCH_CHECKPOINT_SAVE_KEY,
    sceneIds: new Set(["ch4_20_lunch"]),
    feedback: "已自动保存到午饭前后的断点存档。",
  },
  dinner: {
    saveKey: EQUIPMENT_DAY_DINNER_CHECKPOINT_SAVE_KEY,
    sceneIds: new Set(["ch4_44_dinner_start"]),
    feedback: "已自动保存到双人晚饭前的断点存档。",
  },
};

function getCheckpointKind(sceneId: string): EquipmentDayCheckpointKind | null {
  for (const [kind, config] of Object.entries(EQUIPMENT_DAY_CHECKPOINT_CONFIG) as [
    EquipmentDayCheckpointKind,
    (typeof EQUIPMENT_DAY_CHECKPOINT_CONFIG)[EquipmentDayCheckpointKind],
  ][]) {
    if (config.sceneIds.has(sceneId)) return kind;
  }

  return null;
}

function isCheckpointScene(sceneId: string): boolean {
  return EQUIPMENT_DAY_CHECKPOINT_SCENE_IDS.has(sceneId);
}

function appendTransitionOutcome(
  base: EquipmentDayState["transitionOutcome"],
  updates?: {
    outcomeNarration?: string[];
    outcomeDialogue?: EquipmentDayState["transitionOutcome"]["npcDialogue"];
  },
): EquipmentDayState["transitionOutcome"] {
  return {
    narration: [...base.narration, ...(updates?.outcomeNarration ?? [])],
    npcDialogue: [...base.npcDialogue, ...(updates?.outcomeDialogue ?? [])],
  };
}

function appendInventoryByIds(
  inventory: EquipmentDayInventoryItem[],
  ids: string[] | undefined,
): EquipmentDayInventoryItem[] {
  if (!ids?.length) return inventory;

  const nextInventory = [...inventory];

  for (const id of ids) {
    const definition = equipmentDayScenario.inventoryDefinitions[id];
    if (!definition) continue;

    const existing = nextInventory.find((item) => item.id === definition.id);
    if (existing) {
      existing.quantity += definition.quantity;
      continue;
    }

    nextInventory.push({ ...definition });
  }

  return nextInventory;
}

export function createEquipmentDayInitialState(player: { name: string }): EquipmentDayState {
  const timestamp = now();
  const startSceneEffect = getEquipmentDaySceneEntryEffect(equipmentDayScenario.startSceneId);

  return {
    player: {
      name: player.name,
      profession: "潜行修",
      weapon: "匕首",
    },
    currentSceneId: equipmentDayScenario.startSceneId,
    flags: {
      ...equipmentDayScenario.initialFlags,
      ...(startSceneEffect?.setFlags ?? {}),
    },
    inventory: appendInventoryByIds(
      equipmentDayScenario.initialInventory.map((item) => ({ ...item })),
      startSceneEffect?.addInventoryIds,
    ),
    history: [
      {
        id: `system-${Date.now()}`,
        sceneId: equipmentDayScenario.startSceneId,
        source: "system",
        text: `《添置》当前版本 ${equipmentDaySourceVersion} 已开始。`,
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

export function getEquipmentDayRuntimeScene(sceneId: string) {
  return getEquipmentDayScene(sceneId);
}

export function saveEquipmentDayGame(state: EquipmentDayState): EquipmentDayState {
  const savedState = {
    ...state,
    updatedAt: now(),
  };

  globalThis.localStorage?.setItem(EQUIPMENT_DAY_SAVE_KEY, JSON.stringify(savedState));
  return savedState;
}

export function loadEquipmentDayGame(): EquipmentDayState | null {
  const raw = globalThis.localStorage?.getItem(EQUIPMENT_DAY_SAVE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as EquipmentDayState;
  } catch {
    return null;
  }
}

export function saveEquipmentDayCheckpointGame(state: EquipmentDayState): EquipmentDayState {
  const kind = getCheckpointKind(state.currentSceneId) ?? "lunch";
  const snapshot = {
    ...state,
    lastFeedback: EQUIPMENT_DAY_CHECKPOINT_CONFIG[kind].feedback,
    updatedAt: now(),
  };

  globalThis.localStorage?.setItem(
    EQUIPMENT_DAY_CHECKPOINT_CONFIG[kind].saveKey,
    JSON.stringify(snapshot),
  );

  return snapshot;
}

export function loadEquipmentDayCheckpointGame(
  kind: EquipmentDayCheckpointKind,
): EquipmentDayState | null {
  const raw = globalThis.localStorage?.getItem(EQUIPMENT_DAY_CHECKPOINT_CONFIG[kind].saveKey);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as EquipmentDayState;
  } catch {
    return null;
  }
}

export function clearEquipmentDaySave(): void {
  globalThis.localStorage?.removeItem(EQUIPMENT_DAY_SAVE_KEY);
}

export function applyEquipmentDayChoice(
  state: EquipmentDayState,
  choice: EquipmentDayChoice,
): EquipmentDayState {
  if (!choice.nextSceneId) {
    return {
      ...state,
      lastFeedback: choice.notice ?? null,
      updatedAt: now(),
    };
  }

  const timestamp = now();
  const nextScene = getEquipmentDayScene(choice.nextSceneId);
  const nextSceneEntryEffect = getEquipmentDaySceneEntryEffect(nextScene.id);

  const updatedState: EquipmentDayState = {
    ...state,
    currentSceneId: nextScene.id,
    flags: {
      ...state.flags,
      ...(choice.effect?.setFlags ?? {}),
      ...(nextSceneEntryEffect?.setFlags ?? {}),
    },
    inventory: appendInventoryByIds(
      appendInventoryByIds(state.inventory, choice.effect?.addInventoryIds),
      nextSceneEntryEffect?.addInventoryIds,
    ),
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
    return saveEquipmentDayCheckpointGame(updatedState);
  }

  return updatedState;
}

export function applyEquipmentDayFreeInput(
  state: EquipmentDayState,
  text: string,
): EquipmentDayState {
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
