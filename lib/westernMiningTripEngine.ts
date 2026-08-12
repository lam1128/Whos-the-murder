import {
  getWesternMiningTripScene,
  getWesternMiningTripSceneEntryEffect,
  westernMiningTripScenario,
  westernMiningTripSourceVersion,
} from "./westernMiningTripScenario";
import {
  WesternMiningTripChoice,
  WesternMiningTripInventoryChange,
  WesternMiningTripInventoryItem,
  WesternMiningTripState,
} from "./westernMiningTripTypes";
import { getPlayerAddress } from "./playerAddress";

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
  scenarioId: westernMiningTripScenario.id,
  version: westernMiningTripSourceVersion,
  startSceneId: westernMiningTripScenario.startSceneId,
  routeOrder: westernMiningTripScenario.routeOrder,
});

export const WESTERN_MINING_TRIP_SAVE_KEY =
  `western-mining-trip.game-state.${storageRevision}`;

function appendTransitionOutcome(
  base: WesternMiningTripState["transitionOutcome"],
  updates?: {
    outcomeNarration?: string[];
    outcomeDialogue?: WesternMiningTripState["transitionOutcome"]["npcDialogue"];
  },
): WesternMiningTripState["transitionOutcome"] {
  return {
    narration: [...base.narration, ...(updates?.outcomeNarration ?? [])],
    npcDialogue: [...base.npcDialogue, ...(updates?.outcomeDialogue ?? [])],
  };
}

function appendInventoryByIds(
  inventory: WesternMiningTripInventoryItem[],
  ids?: string[],
): WesternMiningTripInventoryItem[] {
  if (!ids?.length) return inventory;
  const nextInventory = inventory.map((item) => ({ ...item }));

  for (const id of ids) {
    const definition = westernMiningTripScenario.inventoryDefinitions[id];
    if (!definition) continue;
    const existing = nextInventory.find((item) => item.id === id);
    if (existing) existing.quantity += definition.quantity;
    else nextInventory.push({ ...definition });
  }

  return nextInventory;
}

function applyInventoryChanges(
  inventory: WesternMiningTripInventoryItem[],
  changes?: WesternMiningTripInventoryChange[],
): WesternMiningTripInventoryItem[] {
  if (!changes?.length) return inventory;
  const nextInventory = inventory.map((item) => ({ ...item }));

  for (const change of changes) {
    const existing = nextInventory.find((item) => item.id === change.id);
    if (existing) {
      existing.quantity += change.quantity;
      continue;
    }

    const definition = westernMiningTripScenario.inventoryDefinitions[change.id];
    if (definition && change.quantity > 0) {
      nextInventory.push({ ...definition, quantity: change.quantity });
    }
  }

  return nextInventory.filter((item) => item.quantity > 0);
}

function applyEffect(
  state: WesternMiningTripState,
  effect: ReturnType<typeof getWesternMiningTripSceneEntryEffect>,
): Pick<WesternMiningTripState, "flags" | "inventory"> {
  return {
    flags: { ...state.flags, ...(effect?.setFlags ?? {}) },
    inventory: applyInventoryChanges(
      appendInventoryByIds(state.inventory, effect?.addInventoryIds),
      effect?.inventoryChanges,
    ),
  };
}

export function getWesternMiningTripTravelNickname(name: string): string {
  if (name.trim() === "林昭宁") return "昭昭";
  return getPlayerAddress(name).familiar;
}

export function createWesternMiningTripInitialState({
  name,
}: {
  name: string;
}): WesternMiningTripState {
  const timestamp = now();
  const travelNickname = getWesternMiningTripTravelNickname(name);
  const initialState: WesternMiningTripState = {
    scenarioId: "chapter5_western_mining_trip",
    scenarioVersion: westernMiningTripSourceVersion,
    player: { name, profession: "潜行修", weapon: "匕首" },
    currentSceneId: westernMiningTripScenario.startSceneId,
    flags: {
      ...westernMiningTripScenario.initialFlags,
      player_travel_nickname: travelNickname,
    },
    inventory: westernMiningTripScenario.initialInventory.map((item) => ({ ...item })),
    history: [
      {
        id: `system-${Date.now()}`,
        sceneId: westernMiningTripScenario.startSceneId,
        source: "system",
        text: `《${westernMiningTripScenario.title}》${westernMiningTripSourceVersion} 已开始。`,
        createdAt: timestamp,
      },
    ],
    transitionOutcome: { narration: [], npcDialogue: [] },
    lastFeedback: null,
    updatedAt: timestamp,
  };

  const initialEffect = getWesternMiningTripSceneEntryEffect(initialState.currentSceneId);
  const resolved = applyEffect(initialState, initialEffect);
  return { ...initialState, ...resolved };
}

export function getWesternMiningTripRuntimeScene(sceneId: string) {
  return getWesternMiningTripScene(sceneId);
}

export function saveWesternMiningTripGame(
  state: WesternMiningTripState,
): WesternMiningTripState {
  const savedState = { ...state, updatedAt: now() };
  globalThis.localStorage?.setItem(WESTERN_MINING_TRIP_SAVE_KEY, JSON.stringify(savedState));
  return savedState;
}

export function loadWesternMiningTripGame(): WesternMiningTripState | null {
  const raw = globalThis.localStorage?.getItem(WESTERN_MINING_TRIP_SAVE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WesternMiningTripState;
    if (
      parsed.scenarioId !== westernMiningTripScenario.id ||
      parsed.scenarioVersion !== westernMiningTripSourceVersion
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearWesternMiningTripSave(): void {
  globalThis.localStorage?.removeItem(WESTERN_MINING_TRIP_SAVE_KEY);
}

export function applyWesternMiningTripChoice(
  state: WesternMiningTripState,
  choice: WesternMiningTripChoice,
): WesternMiningTripState {
  if (!choice.nextSceneId) {
    return { ...state, lastFeedback: choice.notice ?? null, updatedAt: now() };
  }

  const timestamp = now();
  const nextScene = getWesternMiningTripScene(choice.nextSceneId);
  const choiceEffect = choice.effect;
  const nextSceneEffect = getWesternMiningTripSceneEntryEffect(nextScene.id);
  const choiceResolved = applyEffect(state, choiceEffect);
  const nextResolved = applyEffect(
    { ...state, ...choiceResolved },
    nextSceneEffect,
  );

  return {
    ...state,
    currentSceneId: nextScene.id,
    flags: nextResolved.flags,
    inventory: nextResolved.inventory,
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
        narration: choiceEffect?.outcomeNarration ?? [],
        npcDialogue: choiceEffect?.outcomeDialogue ?? [],
      },
      nextSceneEffect,
    ),
    lastFeedback: null,
    updatedAt: timestamp,
  };
}

export function applyWesternMiningTripFreeInput(
  state: WesternMiningTripState,
  text: string,
): WesternMiningTripState {
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
