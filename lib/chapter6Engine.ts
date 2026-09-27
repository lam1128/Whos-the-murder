import {
  chapter6Scenario,
  chapter6SourceVersion,
  getChapter6Scene,
  getChapter6SceneEntryEffect,
} from "./chapter6Scenario";
import {
  XuanjiaLizardHuntChoice,
  XuanjiaLizardHuntInventoryItem,
  XuanjiaLizardHuntState,
} from "./xuanjiaLizardHuntTypes";
import { getPlayerAddress } from "./playerAddress";

export type Chapter6State = XuanjiaLizardHuntState & {
  scenarioId: "chapter6_three_year_sword_echo";
  scenarioVersion: string;
};

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
  scenarioId: chapter6Scenario.id,
  version: chapter6SourceVersion,
  startSceneId: chapter6Scenario.startSceneId,
  routeOrder: chapter6Scenario.routeOrder,
});

export const CHAPTER6_SAVE_KEY = `chapter6-three-year-sword-echo.game-state.${storageRevision}`;

function appendInventoryByIds(
  inventory: XuanjiaLizardHuntInventoryItem[],
  ids?: string[],
): XuanjiaLizardHuntInventoryItem[] {
  if (!ids?.length) return inventory;
  const nextInventory = inventory.map((item) => ({ ...item }));

  for (const id of ids) {
    const definition = chapter6Scenario.inventoryDefinitions[id];
    if (!definition) continue;
    const existing = nextInventory.find((item) => item.id === id);
    if (existing) existing.quantity += definition.quantity;
    else nextInventory.push({ ...definition });
  }

  return nextInventory;
}

function applyEffect(
  state: Chapter6State,
  effect: ReturnType<typeof getChapter6SceneEntryEffect>,
): Pick<Chapter6State, "flags" | "inventory"> {
  return {
    flags: { ...state.flags, ...(effect?.setFlags ?? {}) },
    inventory: appendInventoryByIds(state.inventory, effect?.addInventoryIds),
  };
}

export function createChapter6InitialState({ name }: { name: string }): Chapter6State {
  const timestamp = now();
  const initialState: Chapter6State = {
    scenarioId: "chapter6_three_year_sword_echo",
    scenarioVersion: chapter6SourceVersion,
    player: { name, profession: "潜行修", weapon: "匕首" },
    currentSceneId: chapter6Scenario.startSceneId,
    flags: { ...chapter6Scenario.initialFlags },
    inventory: chapter6Scenario.initialInventory.map((item) => ({ ...item })),
    history: [
      {
        id: `system-${Date.now()}`,
        sceneId: chapter6Scenario.startSceneId,
        source: "system",
        text: `《${chapter6Scenario.title}》当前版本 ${chapter6SourceVersion} 已开始。`,
        createdAt: timestamp,
      },
    ],
    transitionOutcome: { narration: [], npcDialogue: [] },
    lastFeedback: null,
    updatedAt: timestamp,
  };

  const initialEffect = getChapter6SceneEntryEffect(initialState.currentSceneId);
  const resolved = applyEffect(initialState, initialEffect);
  return { ...initialState, ...resolved };
}

export function getChapter6RuntimeScene(sceneId: string) {
  return getChapter6Scene(sceneId);
}

export function saveChapter6Game(state: Chapter6State): Chapter6State {
  const savedState = { ...state, updatedAt: now() };
  globalThis.localStorage?.setItem(CHAPTER6_SAVE_KEY, JSON.stringify(savedState));
  return savedState;
}

export function loadChapter6Game(): Chapter6State | null {
  const raw = globalThis.localStorage?.getItem(CHAPTER6_SAVE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Chapter6State;
    if (
      parsed.scenarioId !== chapter6Scenario.id ||
      parsed.scenarioVersion !== chapter6SourceVersion
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearChapter6Save(): void {
  globalThis.localStorage?.removeItem(CHAPTER6_SAVE_KEY);
}

export function applyChapter6Choice(
  state: Chapter6State,
  choice: XuanjiaLizardHuntChoice,
): Chapter6State {
  if (!choice.nextSceneId) {
    return { ...state, lastFeedback: choice.notice ?? null, updatedAt: now() };
  }

  const timestamp = now();
  const nextScene = getChapter6Scene(choice.nextSceneId);
  const nextSceneEffect = getChapter6SceneEntryEffect(nextScene.id);
  const choiceEffect = choice.effect;
  const afterChoice = applyEffect(state, choiceEffect);
  const afterScene = applyEffect({ ...state, ...afterChoice }, nextSceneEffect);

  return {
    ...state,
    currentSceneId: nextScene.id,
    flags: afterScene.flags,
    inventory: afterScene.inventory,
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
    transitionOutcome: {
      narration: [
        ...(choiceEffect?.outcomeNarration ?? []),
        ...(nextSceneEffect?.outcomeNarration ?? []),
      ],
      npcDialogue: [
        ...(choiceEffect?.outcomeDialogue ?? []),
        ...(nextSceneEffect?.outcomeDialogue ?? []),
      ],
    },
    lastFeedback: null,
    updatedAt: timestamp,
  };
}

export function applyChapter6FreeInput(state: Chapter6State, text: string): Chapter6State {
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

export function getChapter6TravelNickname(name: string): string {
  return getPlayerAddress(name).familiar;
}
