import rawScenarioData from "../data/equipment_day_current.json";
import {
  EquipmentDayChoice,
  EquipmentDayDialogueLine,
  EquipmentDayInventoryItem,
  EquipmentDayScenario,
  EquipmentDayScene,
  EquipmentDaySceneEffect,
  EquipmentDayState,
  EquipmentDayVisibility,
} from "./equipmentDayTypes";

type RawChoiceEffect = {
  setFlags?: Record<string, unknown>;
  setState?: Record<string, unknown>;
  addInventoryIds?: string[];
  outcomeNarration?: string[];
  outcomeDialogue?: EquipmentDayDialogueLine[];
};

type RawChoice = {
  id: "1" | "2" | "3" | "4";
  text: string;
  nextSceneId: string | null;
  effect?: RawChoiceEffect;
  branchType?: string;
  visibility?: EquipmentDayVisibility;
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
    visibility: EquipmentDayVisibility;
  }>;
  npcDialogue: EquipmentDayDialogueLine[];
  conditionalDialogue?: EquipmentDayDialogueLine[];
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
  initialInventory?: EquipmentDayInventoryItem[];
  inventoryDefinitions?: EquipmentDayInventoryItem[];
  startSceneId: string;
  scenes: RawScene[];
};

const sourceData = rawScenarioData as RawScenarioData;
const sceneIds = new Set(sourceData.scenes.map((scene) => scene.id));

export const equipmentDaySourceVersion = sourceData.metadata.version;

function toRuntimeSceneEffect(effect?: RawChoiceEffect): EquipmentDaySceneEffect | undefined {
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

function toRuntimeChoice(choice: RawChoice): EquipmentDayChoice {
  const hasResolvedTarget = choice.nextSceneId ? sceneIds.has(choice.nextSceneId) : false;

  return {
    id: choice.id,
    label: choice.id,
    text: choice.text,
    nextSceneId: hasResolvedTarget ? choice.nextSceneId : null,
    notice:
      choice.nextSceneId && !hasResolvedTarget
        ? "This branch does not have a valid target scene in the current Equipment Day JSON."
        : null,
    branchType: choice.branchType ?? null,
    visibility: choice.visibility,
    effect: toRuntimeSceneEffect(choice.effect),
  };
}

const runtimeScenes: EquipmentDayScene[] = sourceData.scenes.map((scene) => {
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
) as Record<string, EquipmentDayInventoryItem>;

export const equipmentDayScenario: EquipmentDayScenario = {
  id: sourceData.metadata.id,
  title: `${sourceData.metadata.title} / ${sourceData.metadata.title_en ?? "Equipment Day"}`,
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

const scenesById = new Map(equipmentDayScenario.scenes.map((scene) => [scene.id, scene]));

export function getEquipmentDayScene(sceneId: string): EquipmentDayScene {
  const scene = scenesById.get(sceneId);
  if (!scene) {
    throw new Error(`Unknown Equipment Day scene: ${sceneId}`);
  }
  return scene;
}

export function isEquipmentDayVisible(
  visibility: EquipmentDayVisibility | undefined,
  state: Pick<EquipmentDayState, "flags" | "player">,
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

export function getVisibleEquipmentDayChoices(
  scene: EquipmentDayScene,
  state: Pick<EquipmentDayState, "flags" | "player">,
): EquipmentDayChoice[] {
  return scene.choices.filter((choice) => isEquipmentDayVisible(choice.visibility, state));
}

export function getResolvedEquipmentDayNarration(
  scene: EquipmentDayScene,
  state: Pick<EquipmentDayState, "flags" | "player">,
): string[] {
  return [
    ...scene.narration,
    ...(scene.conditionalNarration ?? [])
      .filter((entry) => isEquipmentDayVisible(entry.visibility, state))
      .map((entry) => entry.text),
  ];
}

export function getResolvedEquipmentDayDialogue(
  scene: EquipmentDayScene,
  state: Pick<EquipmentDayState, "flags" | "player">,
): EquipmentDayDialogueLine[] {
  return [
    ...scene.npcDialogue,
    ...(scene.conditionalDialogue ?? []).filter((line) =>
      isEquipmentDayVisible(line.visibility, state),
    ),
  ];
}

export function getEquipmentDaySceneEntryEffect(
  sceneId: string,
): EquipmentDaySceneEffect | undefined {
  return getEquipmentDayScene(sceneId).onEnterEffect;
}
