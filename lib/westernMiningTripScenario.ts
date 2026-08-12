import rawScenarioData from "../data/chapter5_western_mining_trip_current.json";
import {
  WesternMiningTripChoice,
  WesternMiningTripDialogueLine,
  WesternMiningTripInventoryChange,
  WesternMiningTripInventoryItem,
  WesternMiningTripScenario,
  WesternMiningTripScene,
  WesternMiningTripSceneEffect,
  WesternMiningTripState,
  WesternMiningTripVisibility,
} from "./westernMiningTripTypes";

type RawEffect = {
  outcomeNarration?: string[];
  outcomeDialogue?: WesternMiningTripDialogueLine[];
  stateChanges?: {
    flags?: Record<string, unknown>;
    state?: Record<string, unknown>;
  };
  inventoryChanges?: WesternMiningTripInventoryChange[];
  completion?: string;
};

type RawChoice = {
  id: "1" | "2" | "3" | "4";
  text: string;
  nextSceneId: string | null;
  effect?: RawEffect;
  branchType?: string;
  visibility?: WesternMiningTripVisibility;
};

type RawScene = {
  id: string;
  title: string;
  phase: string;
  location: string;
  presentCharacters?: string[];
  narration: string[];
  conditionalNarration?: Array<{ text: string; visibility: WesternMiningTripVisibility }>;
  npcDialogue: WesternMiningTripDialogueLine[];
  conditionalDialogue?: WesternMiningTripDialogueLine[];
  choices?: RawChoice[];
  freeInputEnabled?: boolean;
  terminal?: boolean;
  onEnterEffect?: RawEffect;
  controlPrompt?: string | null;
};

type RawScenarioData = {
  metadata: { scenarioId: string; title: string; version: string };
  initialState?: { flags?: Record<string, unknown>; state?: Record<string, unknown> };
  initialInventory?: WesternMiningTripInventoryItem[];
  inventoryDefinitions?: WesternMiningTripInventoryItem[];
  startSceneId: string;
  scenes: RawScene[];
};

const sourceData = rawScenarioData as RawScenarioData;
const sceneIds = new Set(sourceData.scenes.map((scene) => scene.id));

export const westernMiningTripSourceVersion = sourceData.metadata.version;

function toRuntimeSceneEffect(effect?: RawEffect): WesternMiningTripSceneEffect | undefined {
  if (!effect) return undefined;

  return {
    setFlags: {
      ...(effect.stateChanges?.flags ?? {}),
      ...(effect.stateChanges?.state ?? {}),
    },
    inventoryChanges: effect.inventoryChanges ?? [],
    outcomeNarration: effect.outcomeNarration ?? [],
    outcomeDialogue: effect.outcomeDialogue ?? [],
    completion: effect.completion,
  };
}

function toRuntimeChoice(choice: RawChoice): WesternMiningTripChoice {
  const hasResolvedTarget = choice.nextSceneId ? sceneIds.has(choice.nextSceneId) : false;

  return {
    id: choice.id,
    label: choice.id,
    text: choice.text,
    nextSceneId: hasResolvedTarget ? choice.nextSceneId : null,
    notice:
      choice.nextSceneId && !hasResolvedTarget
        ? "本章分支没有有效的目标场景。"
        : null,
    branchType: choice.branchType ?? null,
    visibility: choice.visibility,
    effect: toRuntimeSceneEffect(choice.effect),
  };
}

const runtimeScenes: WesternMiningTripScene[] = sourceData.scenes.map((scene) => {
  const sceneChoices = scene.choices ?? [];

  return {
    id: scene.id,
    title: scene.title,
    phase: scene.phase,
    location: scene.location,
    presentCharacters: scene.presentCharacters ?? [],
    narration: scene.narration ?? [],
    conditionalNarration: scene.conditionalNarration ?? [],
    npcDialogue: scene.npcDialogue ?? [],
    conditionalDialogue: scene.conditionalDialogue ?? [],
    onEnterEffect: toRuntimeSceneEffect(scene.onEnterEffect),
    controlPrompt:
      sceneChoices.length > 0 ? (scene.controlPrompt ?? "你准备怎么回应？") : null,
    choices: sceneChoices.map(toRuntimeChoice),
    freeInputEnabled: scene.freeInputEnabled ?? false,
    terminal: Boolean(scene.terminal),
  };
});

const westernMiningTripScenario: WesternMiningTripScenario = {
  id: sourceData.metadata.scenarioId,
  title: sourceData.metadata.title,
  startSceneId: sourceData.startSceneId,
  scenes: runtimeScenes,
  routeOrder: runtimeScenes.map((scene) => scene.id),
  initialFlags: {
    ...(sourceData.initialState?.flags ?? {}),
    ...(sourceData.initialState?.state ?? {}),
  },
  initialInventory: sourceData.initialInventory ?? [],
  inventoryDefinitions: Object.fromEntries(
    (sourceData.inventoryDefinitions ?? []).map((item) => [item.id, item]),
  ),
};

const scenesById = new Map(westernMiningTripScenario.scenes.map((scene) => [scene.id, scene]));

export function getWesternMiningTripScene(sceneId: string): WesternMiningTripScene {
  const scene = scenesById.get(sceneId);
  if (!scene) throw new Error(`Unknown Western Mining Trip scene: ${sceneId}`);
  return scene;
}

export function isWesternMiningTripVisible(
  visibility: WesternMiningTripVisibility | undefined,
  state: Pick<WesternMiningTripState, "flags" | "player">,
): boolean {
  if (!visibility) return true;
  if ("flag" in visibility) return Boolean(state.flags[visibility.flag]) === visibility.equals;
  if ("any" in visibility) {
    return visibility.any.some(
      (condition) => Boolean(state.flags[condition.flag]) === condition.equals,
    );
  }
  if ("playerProfession" in visibility) {
    return state.player.profession === visibility.playerProfession;
  }
  return true;
}

export function getVisibleWesternMiningTripChoices(
  scene: WesternMiningTripScene,
  state: Pick<WesternMiningTripState, "flags" | "player">,
): WesternMiningTripChoice[] {
  return scene.choices.filter((choice) => isWesternMiningTripVisible(choice.visibility, state));
}

export function getResolvedWesternMiningTripNarration(
  scene: WesternMiningTripScene,
  state: Pick<WesternMiningTripState, "flags" | "player">,
): string[] {
  return [
    ...scene.narration,
    ...(scene.conditionalNarration ?? [])
      .filter((entry) => isWesternMiningTripVisible(entry.visibility, state))
      .map((entry) => entry.text),
  ];
}

export function getResolvedWesternMiningTripDialogue(
  scene: WesternMiningTripScene,
  state: Pick<WesternMiningTripState, "flags" | "player">,
): WesternMiningTripDialogueLine[] {
  return [
    ...scene.npcDialogue,
    ...(scene.conditionalDialogue ?? []).filter((line) =>
      isWesternMiningTripVisible(line.visibility, state),
    ),
  ];
}

export function getWesternMiningTripSceneEntryEffect(
  sceneId: string,
): WesternMiningTripSceneEffect | undefined {
  return getWesternMiningTripScene(sceneId).onEnterEffect;
}

export { westernMiningTripScenario };
