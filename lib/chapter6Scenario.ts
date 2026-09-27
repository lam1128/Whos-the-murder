import rawScenarioData from "../data/chapter6_three_year_sword_echo_current.json";
import {
  XuanjiaLizardHuntChoice,
  XuanjiaLizardHuntDialogueLine,
  XuanjiaLizardHuntInventoryItem,
  XuanjiaLizardHuntScenario,
  XuanjiaLizardHuntScene,
  XuanjiaLizardHuntSceneEffect,
  XuanjiaLizardHuntState,
  XuanjiaLizardHuntVisibility,
} from "./xuanjiaLizardHuntTypes";

type RawEffect = {
  setFlags?: Record<string, unknown>;
  setState?: Record<string, unknown>;
  addInventoryIds?: string[];
  outcomeNarration?: string[];
  outcomeDialogue?: XuanjiaLizardHuntDialogueLine[];
};

type RawChoice = {
  id: "1" | "2" | "3" | "4";
  text: string;
  nextSceneId: string | null;
  effect?: RawEffect;
  branchType?: string;
  visibility?: XuanjiaLizardHuntVisibility;
};

type RawScene = {
  id: string;
  title: string;
  phase: string;
  location: string;
  presentCharacters?: string[];
  narration: string[];
  conditionalNarration?: Array<{ text: string; visibility: XuanjiaLizardHuntVisibility }>;
  npcDialogue?: XuanjiaLizardHuntDialogueLine[];
  conditionalDialogue?: XuanjiaLizardHuntDialogueLine[];
  choices?: RawChoice[];
  freeInputEnabled?: boolean;
  terminal?: boolean;
  onEnterEffect?: RawEffect;
  controlPrompt?: string | null;
};

type RawScenarioData = {
  metadata: {
    title: string;
    title_en?: string;
    scenarioPrefix: string;
    version: string;
  };
  initialState?: { flags?: Record<string, unknown>; state?: Record<string, unknown> };
  initialInventory?: XuanjiaLizardHuntInventoryItem[];
  inventoryDefinitions?: XuanjiaLizardHuntInventoryItem[];
  startSceneId: string;
  scenes: RawScene[];
};

const sourceData = rawScenarioData as RawScenarioData;
const sceneIds = new Set(sourceData.scenes.map((scene) => scene.id));

export const chapter6SourceVersion = sourceData.metadata.version;

function toRuntimeEffect(effect?: RawEffect): XuanjiaLizardHuntSceneEffect | undefined {
  if (!effect) return undefined;

  return {
    setFlags: {
      ...(effect.setFlags ?? {}),
      ...(effect.setState ?? {}),
    },
    addInventoryIds: effect.addInventoryIds ?? [],
    outcomeNarration: effect.outcomeNarration ?? [],
    outcomeDialogue: effect.outcomeDialogue ?? [],
  };
}

function toRuntimeChoice(choice: RawChoice): XuanjiaLizardHuntChoice {
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
    effect: toRuntimeEffect(choice.effect),
  };
}

const runtimeScenes: XuanjiaLizardHuntScene[] = sourceData.scenes.map((scene) => {
  const choices = scene.choices ?? [];

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
    onEnterEffect: toRuntimeEffect(scene.onEnterEffect),
    controlPrompt: choices.length > 0 ? scene.controlPrompt ?? "你准备怎么回应？" : null,
    choices: choices.map(toRuntimeChoice),
    freeInputEnabled: scene.freeInputEnabled ?? false,
    terminal: Boolean(scene.terminal),
  };
});

export const chapter6Scenario: XuanjiaLizardHuntScenario = {
  id: sourceData.metadata.scenarioPrefix,
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

const scenesById = new Map(chapter6Scenario.scenes.map((scene) => [scene.id, scene]));

export function getChapter6Scene(sceneId: string): XuanjiaLizardHuntScene {
  const scene = scenesById.get(sceneId);
  if (!scene) throw new Error(`Unknown chapter 6 scene: ${sceneId}`);
  return scene;
}

export function isChapter6Visible(
  visibility: XuanjiaLizardHuntVisibility | undefined,
  state: Pick<XuanjiaLizardHuntState, "flags" | "player">,
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

export function getVisibleChapter6Choices(
  scene: XuanjiaLizardHuntScene,
  state: Pick<XuanjiaLizardHuntState, "flags" | "player">,
): XuanjiaLizardHuntChoice[] {
  return scene.choices.filter((choice) => isChapter6Visible(choice.visibility, state));
}

export function getChapter6Narration(
  scene: XuanjiaLizardHuntScene,
  state: Pick<XuanjiaLizardHuntState, "flags" | "player">,
): string[] {
  return [
    ...scene.narration,
    ...(scene.conditionalNarration ?? [])
      .filter((entry) => isChapter6Visible(entry.visibility, state))
      .map((entry) => entry.text),
  ];
}

export function getChapter6Dialogue(
  scene: XuanjiaLizardHuntScene,
  state: Pick<XuanjiaLizardHuntState, "flags" | "player">,
): XuanjiaLizardHuntDialogueLine[] {
  return [
    ...scene.npcDialogue,
    ...(scene.conditionalDialogue ?? []).filter((line) =>
      isChapter6Visible(line.visibility, state),
    ),
  ];
}

export function getChapter6SceneEntryEffect(
  sceneId: string,
): XuanjiaLizardHuntSceneEffect | undefined {
  return getChapter6Scene(sceneId).onEnterEffect;
}
