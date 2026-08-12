import rawScenarioData from "../data/first_acquaintance_current.json";
import {
  FirstAcquaintanceChoice,
  FirstAcquaintanceDialogueLine,
  FirstAcquaintanceScene,
  FirstAcquaintanceSceneEffect,
  FirstAcquaintanceScenario,
  FirstAcquaintanceState,
  FirstAcquaintanceVisibility,
} from "./firstAcquaintanceTypes";

type RawChoiceEffect = {
  setFlags?: Record<string, unknown>;
  setState?: Record<string, unknown>;
  outcomeNarration?: string[];
  outcomeDialogue?: FirstAcquaintanceDialogueLine[];
};

type RawChoice = {
  id: "1" | "2" | "3" | "4";
  text: string;
  nextSceneId: string | null;
  effect?: RawChoiceEffect;
  branchType?: string;
  visibility?: FirstAcquaintanceVisibility;
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
    visibility: FirstAcquaintanceVisibility;
  }>;
  npcDialogue: FirstAcquaintanceDialogueLine[];
  conditionalDialogue?: FirstAcquaintanceDialogueLine[];
  choices: RawChoice[];
  freeInputEnabled: boolean;
  terminal?: boolean;
  onEnterEffect?: RawChoiceEffect;
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
  startSceneId: string;
  scenes: RawScene[];
};

const sourceData = rawScenarioData as RawScenarioData;
const sceneIds = new Set(sourceData.scenes.map((scene) => scene.id));

export const firstAcquaintanceSourceVersion = sourceData.metadata.version;

function toRuntimeSceneEffect(effect?: RawChoiceEffect): FirstAcquaintanceSceneEffect | undefined {
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

function toRuntimeChoice(choice: RawChoice): FirstAcquaintanceChoice {
  const hasResolvedTarget = choice.nextSceneId ? sceneIds.has(choice.nextSceneId) : false;

  return {
    id: choice.id,
    label: choice.id,
    text: choice.text,
    nextSceneId: hasResolvedTarget ? choice.nextSceneId : null,
    notice:
      choice.nextSceneId && !hasResolvedTarget
        ? "This branch does not have a valid target scene in the current First Acquaintance JSON."
        : null,
    branchType: choice.branchType ?? null,
    visibility: choice.visibility,
    effect: toRuntimeSceneEffect(choice.effect),
  };
}

const runtimeScenes: FirstAcquaintanceScene[] = sourceData.scenes.map((scene) => ({
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
  controlPrompt: scene.choices.length > 0 ? "你准备怎么回应？" : null,
  choices: scene.choices.map((choice) => toRuntimeChoice(choice)),
  freeInputEnabled: scene.freeInputEnabled,
  terminal: Boolean(scene.terminal),
}));

export const firstAcquaintanceScenario: FirstAcquaintanceScenario = {
  id: sourceData.metadata.id,
  title: `${sourceData.metadata.title} / ${sourceData.metadata.title_en ?? "First Acquaintance"}`,
  startSceneId: sourceData.startSceneId,
  scenes: runtimeScenes,
  routeOrder: sourceData.scenes.map((scene) => scene.id),
  initialFlags: {
    ...(sourceData.initialState?.flags ?? {}),
    ...(sourceData.initialState?.state ?? {}),
  },
};

const scenesById = new Map(firstAcquaintanceScenario.scenes.map((scene) => [scene.id, scene]));

export function getFirstAcquaintanceScene(sceneId: string): FirstAcquaintanceScene {
  const scene = scenesById.get(sceneId);
  if (!scene) {
    throw new Error(`Unknown First Acquaintance scene: ${sceneId}`);
  }
  return scene;
}

export function isFirstAcquaintanceVisible(
  visibility: FirstAcquaintanceVisibility | undefined,
  state: Pick<FirstAcquaintanceState, "flags" | "player">,
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

export function getVisibleFirstAcquaintanceChoices(
  scene: FirstAcquaintanceScene,
  state: Pick<FirstAcquaintanceState, "flags" | "player">,
): FirstAcquaintanceChoice[] {
  return scene.choices.filter((choice) => isFirstAcquaintanceVisible(choice.visibility, state));
}

export function getResolvedFirstAcquaintanceNarration(
  scene: FirstAcquaintanceScene,
  state: Pick<FirstAcquaintanceState, "flags" | "player">,
): string[] {
  return [
    ...scene.narration,
    ...(scene.conditionalNarration ?? [])
      .filter((entry) => isFirstAcquaintanceVisible(entry.visibility, state))
      .map((entry) => entry.text),
  ];
}

export function getResolvedFirstAcquaintanceDialogue(
  scene: FirstAcquaintanceScene,
  state: Pick<FirstAcquaintanceState, "flags" | "player">,
): FirstAcquaintanceDialogueLine[] {
  return [
    ...scene.npcDialogue,
    ...(scene.conditionalDialogue ?? []).filter((line) =>
      isFirstAcquaintanceVisible(line.visibility, state),
    ),
  ];
}

export function getFirstAcquaintanceSceneEntryEffect(
  sceneId: string,
): FirstAcquaintanceSceneEffect | undefined {
  return getFirstAcquaintanceScene(sceneId).onEnterEffect;
}

function stringifyFlag(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join("，");
  }
  return String(value);
}

export function getFirstAcquaintanceSidebarNotes(
  flags: Record<string, unknown>,
): Array<{ id: string; title: string; detail: string }> {
  const notes: Array<{ id: string; title: string; detail: string }> = [];

  if (flags.player_aftercare_rules) {
    notes.push({
      id: "aftercare",
      title: "换药叮嘱",
      detail: stringifyFlag(flags.player_aftercare_rules),
    });
  }

  if (flags.wang_ou_blue_pendant || flags.wang_ou_blue_pendant_status) {
    notes.push({
      id: "wang-ou-pendant",
      title: "水蓝吊坠",
      detail: "何炅送给王鸥的礼物，很好看。",
    });
  }

  if (flags.relationship_progress || flags.relationship_status || flags.relationship_context) {
    notes.push({
      id: "relationship-progress",
      title: "关系变化",
      detail: stringifyFlag(
        flags.relationship_progress ?? flags.relationship_status ?? flags.relationship_context,
      ),
    });
  }

  return notes;
}
