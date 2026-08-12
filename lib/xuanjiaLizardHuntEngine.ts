import {
  getXuanjiaLizardHuntScene,
  getXuanjiaLizardHuntSceneEntryEffect,
  xuanjiaLizardHuntScenario,
  xuanjiaLizardHuntSourceVersion,
} from "./xuanjiaLizardHuntScenario";
import {
  XuanjiaLizardHuntChoice,
  XuanjiaLizardHuntInventoryItem,
  XuanjiaLizardHuntState,
} from "./xuanjiaLizardHuntTypes";

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
  version: xuanjiaLizardHuntSourceVersion,
  startSceneId: xuanjiaLizardHuntScenario.startSceneId,
  routeOrder: xuanjiaLizardHuntScenario.routeOrder,
});

export const XUANJIA_LIZARD_HUNT_SAVE_KEY =
  `xuanjia-lizard-hunt.game-state.${storageRevision}`;

function appendTransitionOutcome(
  base: XuanjiaLizardHuntState["transitionOutcome"],
  updates?: {
    outcomeNarration?: string[];
    outcomeDialogue?: XuanjiaLizardHuntState["transitionOutcome"]["npcDialogue"];
  },
): XuanjiaLizardHuntState["transitionOutcome"] {
  return {
    narration: [...base.narration, ...(updates?.outcomeNarration ?? [])],
    npcDialogue: [...base.npcDialogue, ...(updates?.outcomeDialogue ?? [])],
  };
}

function appendInventoryByIds(
  inventory: XuanjiaLizardHuntInventoryItem[],
  ids: string[] | undefined,
): XuanjiaLizardHuntInventoryItem[] {
  if (!ids?.length) return inventory;

  const nextInventory = [...inventory];

  for (const id of ids) {
    const definition = xuanjiaLizardHuntScenario.inventoryDefinitions[id];
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

export function createXuanjiaLizardHuntInitialState(player: {
  name: string;
}): XuanjiaLizardHuntState {
  const timestamp = now();
  const startSceneEffect = getXuanjiaLizardHuntSceneEntryEffect(xuanjiaLizardHuntScenario.startSceneId);

  return {
    player: {
      name: player.name,
      profession: "潜行修",
      weapon: "匕首",
    },
    currentSceneId: xuanjiaLizardHuntScenario.startSceneId,
    flags: {
      ...xuanjiaLizardHuntScenario.initialFlags,
      ...(startSceneEffect?.setFlags ?? {}),
    },
    inventory: appendInventoryByIds(
      xuanjiaLizardHuntScenario.initialInventory.map((item) => ({ ...item })),
      startSceneEffect?.addInventoryIds,
    ),
    history: [
      {
        id: `system-${Date.now()}`,
        sceneId: xuanjiaLizardHuntScenario.startSceneId,
        source: "system",
        text: `《玄甲林蜥》当前版本 ${xuanjiaLizardHuntSourceVersion} 已开始。`,
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

export function getXuanjiaLizardHuntRuntimeScene(sceneId: string) {
  return getXuanjiaLizardHuntScene(sceneId);
}

export function saveXuanjiaLizardHuntGame(
  state: XuanjiaLizardHuntState,
): XuanjiaLizardHuntState {
  const savedState = {
    ...state,
    updatedAt: now(),
  };

  globalThis.localStorage?.setItem(XUANJIA_LIZARD_HUNT_SAVE_KEY, JSON.stringify(savedState));
  return savedState;
}

export function loadXuanjiaLizardHuntGame(): XuanjiaLizardHuntState | null {
  const raw = globalThis.localStorage?.getItem(XUANJIA_LIZARD_HUNT_SAVE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as XuanjiaLizardHuntState;
  } catch {
    return null;
  }
}

export function clearXuanjiaLizardHuntSave(): void {
  globalThis.localStorage?.removeItem(XUANJIA_LIZARD_HUNT_SAVE_KEY);
}

export function applyXuanjiaLizardHuntChoice(
  state: XuanjiaLizardHuntState,
  choice: XuanjiaLizardHuntChoice,
): XuanjiaLizardHuntState {
  if (!choice.nextSceneId) {
    return {
      ...state,
      lastFeedback: choice.notice ?? null,
      updatedAt: now(),
    };
  }

  const timestamp = now();
  const nextScene = getXuanjiaLizardHuntScene(choice.nextSceneId);
  const nextSceneEntryEffect = getXuanjiaLizardHuntSceneEntryEffect(nextScene.id);

  return {
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
}

export function applyXuanjiaLizardHuntFreeInput(
  state: XuanjiaLizardHuntState,
  text: string,
): XuanjiaLizardHuntState {
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
