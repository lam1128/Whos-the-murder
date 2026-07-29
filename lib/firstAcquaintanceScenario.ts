import rawScenarioData from "../data/first_acquaintance_current.json";
import {
  FirstAcquaintanceChoice,
  FirstAcquaintanceDialogueLine,
  FirstAcquaintanceScene,
  FirstAcquaintanceScenario,
} from "./firstAcquaintanceTypes";

type RawChoiceEffect = {
  addClueIds?: string[];
  addInventoryIds?: string[];
  setFlags?: Record<string, unknown>;
  setState?: Record<string, unknown>;
  impressionTags?: string[];
  outcomeNarration?: string[];
  outcomeDialogue?: FirstAcquaintanceDialogueLine[];
};

type RawChoice = {
  id: "1" | "2" | "3" | "4";
  text: string;
  intent?: string;
  nextSceneId: string | null;
  effect?: RawChoiceEffect;
  branchType?: string;
};

type RawScene = {
  id: string;
  title: string;
  phase: string;
  location: string;
  presentCharacters?: string[];
  narration: string[];
  npcDialogue: FirstAcquaintanceDialogueLine[];
  choices: RawChoice[];
  freeInputEnabled: boolean;
  terminal?: boolean;
  newCharacterIntroduction?: unknown;
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

const sourceData = rawScenarioData as unknown as RawScenarioData;
const sceneIds = new Set(sourceData.scenes.map((scene) => scene.id));

export const firstAcquaintanceSourceVersion = sourceData.metadata.version;

function toRuntimeChoice(choice: RawChoice): FirstAcquaintanceChoice {
  const hasResolvedTarget = choice.nextSceneId ? sceneIds.has(choice.nextSceneId) : false;

  return {
    id: choice.id,
    label: choice.id,
    text: choice.text,
    nextSceneId: hasResolvedTarget ? choice.nextSceneId : null,
    notice:
      choice.nextSceneId && !hasResolvedTarget
        ? "这个分支在当前这份初识 JSON 里还没有对应的目标场景，页面会先停留在这里。"
        : null,
    branchType: choice.branchType ?? null,
    effect: {
      setFlags: {
        ...(choice.effect?.setFlags ?? {}),
        ...(choice.effect?.setState ?? {}),
      },
      outcomeNarration: choice.effect?.outcomeNarration ?? [],
      outcomeDialogue: choice.effect?.outcomeDialogue ?? [],
    },
  };
}

const runtimeScenes: FirstAcquaintanceScene[] = sourceData.scenes.map((scene) => ({
  id: scene.id,
  title: scene.title,
  phase: scene.phase,
  location: scene.location,
  presentCharacters: scene.presentCharacters ?? [],
  narration: scene.narration ?? [],
  npcDialogue: scene.npcDialogue ?? [],
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

export function getFirstAcquaintanceProgress(sceneId: string): {
  current: number;
  total: number;
} {
  const index = firstAcquaintanceScenario.routeOrder.indexOf(sceneId);
  return {
    current: index === -1 ? 0 : index + 1,
    total: firstAcquaintanceScenario.routeOrder.length,
  };
}

function stringifyFlag(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join("；");
  }
  return String(value);
}

export function getFirstAcquaintanceSidebarNotes(
  flags: Record<string, unknown>,
): Array<{ id: string; title: string; detail: string }> {
  const notes: Array<{ id: string; title: string; detail: string }> = [];

  if (flags.player_wound_status) {
    notes.push({
      id: "wound-status",
      title: "伤口情况",
      detail: stringifyFlag(flags.player_wound_status),
    });
  }

  if (flags.player_aftercare_rules) {
    notes.push({
      id: "aftercare",
      title: "换药叮嘱",
      detail: stringifyFlag(flags.player_aftercare_rules),
    });
  }

  if (flags.wu_xin_gift || flags.wu_xin_gift_purchased) {
    notes.push({
      id: "wu-xin-gift",
      title: "吴昕礼物",
      detail: flags.wu_xin_gift ? stringifyFlag(flags.wu_xin_gift) : "礼物线已经推进到吴昕相关阶段。",
    });
  }

  if (flags.wang_ou_blue_pendant) {
    notes.push({
      id: "wang-ou-pendant",
      title: "水蓝吊坠",
      detail: stringifyFlag(flags.wang_ou_blue_pendant),
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

  if (flags.tomorrow_rebandage_with_wang_ou || flags.wound_rebandaged) {
    notes.push({
      id: "tomorrow-rebandage",
      title: "换药安排",
      detail: "这条线已经进入或完成王鸥换药相关流程。",
    });
  }

  if (flags.medicine_supplies_replenished) {
    notes.push({
      id: "medicine-supplies",
      title: "药材补齐",
      detail: "这一趟已经把换药和常用药材补齐了。",
    });
  }

  return notes;
}
