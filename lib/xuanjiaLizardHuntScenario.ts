import rawScenarioData from "../data/xuanjia_lizard_hunt_current.json";
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

type RawChoiceEffect = {
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
  effect?: RawChoiceEffect;
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
  conditionalNarration?: Array<{
    text: string;
    visibility: XuanjiaLizardHuntVisibility;
  }>;
  npcDialogue: XuanjiaLizardHuntDialogueLine[];
  conditionalDialogue?: XuanjiaLizardHuntDialogueLine[];
  choices?: RawChoice[];
  freeInputEnabled?: boolean;
  terminal?: boolean;
  onEnterEffect?: RawChoiceEffect;
  controlPrompt?: string | null;
};

type RawScenarioData = {
  metadata: {
    id: string;
    title: string;
    title_en?: string;
    version: string;
  };
  initialState?: {
    flags?: Record<string, unknown>;
    state?: Record<string, unknown>;
  };
  initialInventory?: XuanjiaLizardHuntInventoryItem[];
  inventoryDefinitions?: XuanjiaLizardHuntInventoryItem[];
  startSceneId: string;
  scenes: RawScene[];
};

const sourceData = rawScenarioData as RawScenarioData;
const sceneIds = new Set(sourceData.scenes.map((scene) => scene.id));

export const xuanjiaLizardHuntSourceVersion = sourceData.metadata.version;

function toRuntimeSceneEffect(effect?: RawChoiceEffect): XuanjiaLizardHuntSceneEffect | undefined {
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
        ? "This branch does not have a valid target scene in the current Xuanjia Lizard Hunt JSON."
        : null,
    branchType: choice.branchType ?? null,
    visibility: choice.visibility,
    effect: toRuntimeSceneEffect(choice.effect),
  };
}

const runtimeScenes: XuanjiaLizardHuntScene[] = sourceData.scenes.map((scene) => {
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
    choices: sceneChoices.map((choice) => toRuntimeChoice(choice)),
    freeInputEnabled: scene.freeInputEnabled ?? false,
    terminal: Boolean(scene.terminal),
  };
});

const inventoryDefinitions = Object.fromEntries(
  (sourceData.inventoryDefinitions ?? []).map((item) => [item.id, item]),
) as Record<string, XuanjiaLizardHuntInventoryItem>;

export const xuanjiaLizardHuntScenario: XuanjiaLizardHuntScenario = {
  id: sourceData.metadata.id,
  title: `${sourceData.metadata.title} / ${sourceData.metadata.title_en ?? "Xuanjia Lizard Hunt"}`,
  startSceneId: sourceData.startSceneId,
  scenes: runtimeScenes,
  routeOrder: sourceData.scenes.map((scene) => scene.id),
  initialFlags: {
    ...(sourceData.initialState?.flags ?? {}),
    ...(sourceData.initialState?.state ?? {}),
  },
  initialInventory: sourceData.initialInventory ?? [],
  inventoryDefinitions,
};

const scenesById = new Map(xuanjiaLizardHuntScenario.scenes.map((scene) => [scene.id, scene]));

export function getXuanjiaLizardHuntScene(sceneId: string): XuanjiaLizardHuntScene {
  const scene = scenesById.get(sceneId);
  if (!scene) {
    throw new Error(`Unknown Xuanjia Lizard Hunt scene: ${sceneId}`);
  }
  return scene;
}

export function isXuanjiaLizardHuntVisible(
  visibility: XuanjiaLizardHuntVisibility | undefined,
  state: Pick<XuanjiaLizardHuntState, "flags" | "player">,
): boolean {
  if (!visibility) return true;

  if ("flag" in visibility) {
    return Boolean(state.flags[visibility.flag]) === visibility.equals;
  }

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

export function getVisibleXuanjiaLizardHuntChoices(
  scene: XuanjiaLizardHuntScene,
  state: Pick<XuanjiaLizardHuntState, "flags" | "player">,
): XuanjiaLizardHuntChoice[] {
  return scene.choices.filter((choice) => isXuanjiaLizardHuntVisible(choice.visibility, state));
}

export function getResolvedXuanjiaLizardHuntNarration(
  scene: XuanjiaLizardHuntScene,
  state: Pick<XuanjiaLizardHuntState, "flags" | "player">,
): string[] {
  return [
    ...scene.narration,
    ...(scene.conditionalNarration ?? [])
      .filter((entry) => isXuanjiaLizardHuntVisible(entry.visibility, state))
      .map((entry) => entry.text),
  ];
}

export function getResolvedXuanjiaLizardHuntDialogue(
  scene: XuanjiaLizardHuntScene,
  state: Pick<XuanjiaLizardHuntState, "flags" | "player">,
): XuanjiaLizardHuntDialogueLine[] {
  return [
    ...scene.npcDialogue,
    ...(scene.conditionalDialogue ?? []).filter((line) =>
      isXuanjiaLizardHuntVisible(line.visibility, state),
    ),
  ];
}

export function getXuanjiaLizardHuntSceneEntryEffect(
  sceneId: string,
): XuanjiaLizardHuntSceneEffect | undefined {
  return getXuanjiaLizardHuntScene(sceneId).onEnterEffect;
}
