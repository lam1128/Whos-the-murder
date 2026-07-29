import {
  firstAcquaintanceScenario,
  firstAcquaintanceSourceVersion,
  getFirstAcquaintanceScene,
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

export function createFirstAcquaintanceInitialState(player: {
  name: string;
}): FirstAcquaintanceState {
  const timestamp = now();

  return {
    player: {
      name: player.name,
      profession: "潜行修",
      weapon: "匕首",
    },
    currentSceneId: firstAcquaintanceScenario.startSceneId,
    flags: { ...firstAcquaintanceScenario.initialFlags },
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
      narration: [],
      npcDialogue: [],
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
      lastFeedback: choice.notice ?? "这一段已经抵达当前场景的收束位置了。",
      updatedAt: now(),
    };
  }

  const timestamp = now();
  const nextScene = getFirstAcquaintanceScene(choice.nextSceneId);

  return {
    ...state,
    currentSceneId: nextScene.id,
    flags: {
      ...state.flags,
      ...(choice.effect?.setFlags ?? {}),
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
    transitionOutcome: {
      narration: choice.effect?.outcomeNarration ?? [],
      npcDialogue: choice.effect?.outcomeDialogue ?? [],
    },
    lastFeedback: null,
    updatedAt: timestamp,
  };
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
    lastFeedback: "已记录你的自由输入；当前页面仍按这份 JSON 的既有分支继续运行。",
    updatedAt: now(),
  };
}
