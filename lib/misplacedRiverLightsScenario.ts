import rawScenarioData from "../data/misplaced_river_lights_current.json";
import {
  MisplacedRiverLightsChoice,
  MisplacedRiverLightsDialogueLine,
  MisplacedRiverLightsScenario,
  MisplacedRiverLightsScene,
  MisplacedRiverLightsSceneEffect,
  MisplacedRiverLightsState,
  MisplacedRiverLightsVisibility,
} from "./misplacedRiverLightsTypes";

type RawChoiceEffect = {
  setFlags?: Record<string, unknown>;
  setState?: Record<string, unknown>;
  outcomeNarration?: string[];
  outcomeDialogue?: MisplacedRiverLightsDialogueLine[];
};

type RawChoice = {
  id: "1" | "2" | "3" | "4";
  text: string;
  nextSceneId: string | null;
  effect?: RawChoiceEffect;
  branchType?: string;
  visibility?: MisplacedRiverLightsVisibility;
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
    visibility: MisplacedRiverLightsVisibility;
  }>;
  npcDialogue: MisplacedRiverLightsDialogueLine[];
  conditionalDialogue?: MisplacedRiverLightsDialogueLine[];
  choices: RawChoice[];
  freeInputEnabled: boolean;
  terminal?: boolean;
  onEnterEffect?: RawChoiceEffect;
  controlPrompt?: string | null;
};

type RawScenarioData = {
  metadata: {
    id: string;
    title: string;
    titleEn?: string;
    version: string;
  };
  initialState?: {
    flags?: Record<string, unknown>;
    state?: Record<string, unknown>;
  };
  initialInventory?: MisplacedRiverLightsScenario["initialInventory"];
  sidebarNotes?: MisplacedRiverLightsScenario["sidebarNotes"];
  startSceneId: string;
  scenes: RawScene[];
};

const sourceData = rawScenarioData as RawScenarioData;
const sceneIds = new Set(sourceData.scenes.map((scene) => scene.id));

export const misplacedRiverLightsSourceVersion = sourceData.metadata.version;

function toRuntimeSceneEffect(effect?: RawChoiceEffect): MisplacedRiverLightsSceneEffect | undefined {
  if (!effect) return undefined;

  return {
    setFlags: {
      ...(effect.setFlags ?? {}),
      ...(effect.setState ?? {}),
    },
    outcomeNarration: effect.outcomeNarration ?? [],
    outcomeDialogue: effect.outcomeDialogue ?? [],
  };
}

function toRuntimeChoice(choice: RawChoice): MisplacedRiverLightsChoice {
  const hasResolvedTarget = choice.nextSceneId ? sceneIds.has(choice.nextSceneId) : false;

  return {
    id: choice.id,
    label: choice.id,
    text: choice.text,
    nextSceneId: hasResolvedTarget ? choice.nextSceneId : null,
    notice:
      choice.nextSceneId && !hasResolvedTarget
        ? "This branch does not have a valid target scene in the current Misplaced River Lights JSON."
        : null,
    branchType: choice.branchType ?? null,
    visibility: choice.visibility,
    effect: toRuntimeSceneEffect(choice.effect),
  };
}

const runtimeScenes: MisplacedRiverLightsScene[] = sourceData.scenes.map((scene) => ({
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
    scene.choices.length > 0 ? (scene.controlPrompt ?? "你准备怎么回应？") : null,
  choices: scene.choices.map((choice) => toRuntimeChoice(choice)),
  freeInputEnabled: scene.freeInputEnabled,
  terminal: Boolean(scene.terminal),
}));

export const misplacedRiverLightsScenario: MisplacedRiverLightsScenario = {
  id: sourceData.metadata.id,
  title: `${sourceData.metadata.title} / ${sourceData.metadata.titleEn ?? "Misplaced River Lights"}`,
  startSceneId: sourceData.startSceneId,
  scenes: runtimeScenes,
  routeOrder: sourceData.scenes.map((scene) => scene.id),
  initialFlags: {
    ...(sourceData.initialState?.flags ?? {}),
    ...(sourceData.initialState?.state ?? {}),
  },
  initialInventory: sourceData.initialInventory ?? [],
  sidebarNotes: sourceData.sidebarNotes ?? [],
};

const scenesById = new Map(misplacedRiverLightsScenario.scenes.map((scene) => [scene.id, scene]));

export function getMisplacedRiverLightsScene(sceneId: string): MisplacedRiverLightsScene {
  const scene = scenesById.get(sceneId);
  if (!scene) {
    throw new Error(`Unknown Misplaced River Lights scene: ${sceneId}`);
  }
  return scene;
}

export function isMisplacedRiverLightsVisible(
  visibility: MisplacedRiverLightsVisibility | undefined,
  state: Pick<MisplacedRiverLightsState, "flags" | "player">,
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

export function getVisibleMisplacedRiverLightsChoices(
  scene: MisplacedRiverLightsScene,
  state: Pick<MisplacedRiverLightsState, "flags" | "player">,
): MisplacedRiverLightsChoice[] {
  return scene.choices.filter((choice) => isMisplacedRiverLightsVisible(choice.visibility, state));
}

export function getResolvedMisplacedRiverLightsNarration(
  scene: MisplacedRiverLightsScene,
  state: Pick<MisplacedRiverLightsState, "flags" | "player">,
): string[] {
  return [
    ...scene.narration,
    ...(scene.conditionalNarration ?? [])
      .filter((entry) => isMisplacedRiverLightsVisible(entry.visibility, state))
      .map((entry) => entry.text),
  ];
}

export function getResolvedMisplacedRiverLightsDialogue(
  scene: MisplacedRiverLightsScene,
  state: Pick<MisplacedRiverLightsState, "flags" | "player">,
): MisplacedRiverLightsDialogueLine[] {
  return [
    ...scene.npcDialogue,
    ...(scene.conditionalDialogue ?? []).filter((line) =>
      isMisplacedRiverLightsVisible(line.visibility, state),
    ),
  ];
}

export function getMisplacedRiverLightsSceneEntryEffect(
  sceneId: string,
): MisplacedRiverLightsSceneEffect | undefined {
  return getMisplacedRiverLightsScene(sceneId).onEnterEffect;
}

export function getMisplacedRiverLightsSidebarNotes(
  flags: Record<string, unknown>,
): Array<{ id: string; title: string; detail: string }> {
  return misplacedRiverLightsScenario.sidebarNotes.filter((note) => Boolean(flags[note.flag]));
}
