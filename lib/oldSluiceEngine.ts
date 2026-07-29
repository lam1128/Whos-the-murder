import rawOldSluiceData from "../data/old_sluice_current.json";
import {
  Choice,
  OldSluiceDataSchema,
  GameState,
  GameStateSchema,
  Profession,
  Scene,
  Weapon,
} from "./oldSluiceTypes";

function createStorageRevision(input: unknown): string {
  const serialized = JSON.stringify(input);
  let hash = 2166136261;

  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `r${(hash >>> 0).toString(16)}`;
}

const oldSluiceStorageRevision = createStorageRevision(rawOldSluiceData);

export const SAVE_KEY = `old-sluice.game-state.${oldSluiceStorageRevision}`;
export const RESCUE_CHECKPOINT_SAVE_KEY =
  `old-sluice.checkpoint.rescue.${oldSluiceStorageRevision}`;
export const MEAL_CHECKPOINT_SAVE_KEY =
  `old-sluice.checkpoint.meal.${oldSluiceStorageRevision}`;
export const CHECKPOINT_SAVE_KEY = RESCUE_CHECKPOINT_SAVE_KEY;
export const CHECKPOINT_SCENE_IDS = new Set(["withdrawal_converges", "post_task_meal"]);
type CheckpointKind = "rescue" | "meal";

const CHECKPOINT_CONFIG: Record<
  CheckpointKind,
  {
    saveKey: string;
    sceneIds: Set<string>;
    clueIds: Set<string>;
    flag: string;
    feedback: string;
  }
> = {
  rescue: {
    saveKey: RESCUE_CHECKPOINT_SAVE_KEY,
    sceneIds: new Set(["withdrawal_converges"]),
    clueIds: new Set([
      "clue_missing_cargo",
      "clue_guard_testimony",
      "clue_winch_water",
      "clue_injured_creature_tracks",
      "clue_monster_metal_wound",
    ]),
    flag: "checkpoint_rescue_complete",
    feedback: "已自动保存救援汇合后的测试存档。",
  },
  meal: {
    saveKey: MEAL_CHECKPOINT_SAVE_KEY,
    sceneIds: new Set(["post_task_meal"]),
    clueIds: new Set(["clue_cargo_damage_result", "clue_trap_evidence_handed_over"]),
    flag: "checkpoint_meal_ready",
    feedback: "已自动保存到达饭桌后的测试存档。",
  },
};
export const oldSluiceData = OldSluiceDataSchema.parse(rawOldSluiceData);
export const scenes: Scene[] = oldSluiceData.scenes;

export function isCheckpointScene(sceneId: string): boolean {
  return CHECKPOINT_SCENE_IDS.has(sceneId);
}

function getCheckpointKind(sceneId: string): CheckpointKind | null {
  for (const [kind, config] of Object.entries(CHECKPOINT_CONFIG) as [
    CheckpointKind,
    (typeof CHECKPOINT_CONFIG)[CheckpointKind],
  ][]) {
    if (config.sceneIds.has(sceneId)) return kind;
  }
  return null;
}

export function getScene(sceneId: string): Scene {
  const scene = scenes.find((item) => item.id === sceneId);
  if (!scene) {
    throw new Error(`找不到场景：${sceneId}`);
  }
  return scene;
}

export function getVisibleChoices(scene: Scene, state: GameState): Choice[] {
  return scene.choices.filter((choice) => {
    if (!choice.visibility) return true;

    if ("flag" in choice.visibility) {
      return Boolean(state.flags[choice.visibility.flag]) === choice.visibility.equals;
    }

    if ("any" in choice.visibility) {
      return choice.visibility.any.some(
        (condition) => Boolean(state.flags[condition.flag]) === condition.equals,
      );
    }

    if ("playerProfession" in choice.visibility) {
      return state.player.profession === choice.visibility.playerProfession;
    }

    return true;
  });
}

function now(): string {
  return new Date().toISOString();
}

export function createInitialGameState(player: {
  name: string;
  profession: Profession;
  weapon: Weapon;
}): GameState {
  const scene = getScene(oldSluiceData.startSceneId);
  const timestamp = now();

  return GameStateSchema.parse({
    schemaVersion: 1,
    saveVersion: 0,
    player: {
      ...player,
      gender: "女性",
      age: 19,
      heightCm: 165,
      hair: "长发",
      background: "临川城普通河运家庭",
      currentStatus: "已经完成学业，但尚未正式参加过危险委托",
    },
    phase: scene.phase,
    currentSceneId: scene.id,
    location: scene.location,
    presentCharacters: scene.presentCharacters,
    knownClues: oldSluiceData.initialClues,
    injury: {
      location: "无",
      severity: "无伤",
      description: "目前没有受伤",
      treatment: null,
      needsRecheck: false,
    },
    inventory: oldSluiceData.initialInventory,
    relationships: [],
    flags: {},
    history: [
      {
        id: `system-${Date.now()}`,
        sceneId: scene.id,
        source: "系统",
        text: "抵达旧水闸转运点。",
        createdAt: timestamp,
      },
    ],
    transitionOutcome: {
      narration: [],
      npcDialogue: [],
    },
    pendingStoryHook: null,
    lastFeedback: null,
    updatedAt: timestamp,
  });
}

export function saveGame(state: GameState): GameState {
  const validated = GameStateSchema.parse({
    ...state,
    saveVersion: state.saveVersion + 1,
    updatedAt: now(),
  });
  globalThis.localStorage?.setItem(SAVE_KEY, JSON.stringify(validated));
  return validated;
}

export function loadGame(): GameState | null {
  const raw = globalThis.localStorage?.getItem(SAVE_KEY);
  if (!raw) return null;

  try {
    return GameStateSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function createCheckpointSnapshot(
  state: GameState,
  kind: CheckpointKind = getCheckpointKind(state.currentSceneId) ?? "rescue",
): GameState {
  const config = CHECKPOINT_CONFIG[kind];
  return GameStateSchema.parse({
    ...state,
    knownClues: state.knownClues.filter((clue) => config.clueIds.has(clue.id)),
    flags: { ...state.flags, [config.flag]: true },
    lastFeedback: config.feedback,
    updatedAt: now(),
  });
}

export function saveCheckpointGame(state: GameState): GameState {
  const kind = getCheckpointKind(state.currentSceneId) ?? "rescue";
  const snapshot = createCheckpointSnapshot(state, kind);
  globalThis.localStorage?.setItem(CHECKPOINT_CONFIG[kind].saveKey, JSON.stringify(snapshot));
  return snapshot;
}

export function loadCheckpointGame(kind: CheckpointKind = "rescue"): GameState | null {
  const raw = globalThis.localStorage?.getItem(CHECKPOINT_CONFIG[kind].saveKey);
  if (!raw) return null;

  try {
    return GameStateSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearSave(): void {
  globalThis.localStorage?.removeItem(SAVE_KEY);
}

export function applyChoice(state: GameState, choice: Choice): GameState {
  const timestamp = now();
  const nextScene = choice.nextSceneId ? getScene(choice.nextSceneId) : getScene(state.currentSceneId);
  const clueCatalog = [...oldSluiceData.initialClues, ...oldSluiceData.discoverableClues];
  const cluesToAdd = choice.effect.addClueIds
    .map((clueId) => clueCatalog.find((clue) => clue.id === clueId))
    .filter((clue): clue is NonNullable<typeof clue> => Boolean(clue));
  const knownClueIds = new Set(state.knownClues.map((clue) => clue.id));
  const newClues = cluesToAdd.filter((clue) => !knownClueIds.has(clue.id));

  const relationships = [...state.relationships];
  for (const update of choice.effect.impressionTags) {
    const characterName =
      update.characterId === "he_jiong"
        ? "何炅"
        : update.characterId === "wang_ou"
          ? "王鸥"
          : update.characterId;
    const index = relationships.findIndex(
      (relationship) => relationship.characterId === update.characterId,
    );

    if (index === -1) {
      relationships.push({
        characterId: update.characterId,
        characterName,
        tags: [update.tag],
        evidence: [update.evidence],
        updatedAt: timestamp,
      });
      continue;
    }

    const current = relationships[index];
    relationships[index] = {
      ...current,
      tags: current.tags.includes(update.tag) ? current.tags : [...current.tags, update.tag],
      evidence: current.evidence.includes(update.evidence)
        ? current.evidence
        : [...current.evidence, update.evidence],
      updatedAt: timestamp,
    };
  }

  const updatedState = GameStateSchema.parse({
    ...state,
    currentSceneId: nextScene.id,
    phase: nextScene.phase,
    location: nextScene.location,
    presentCharacters: nextScene.presentCharacters,
    knownClues: [...state.knownClues, ...newClues],
    injury:
      nextScene.id === "injury_treatment"
        ? {
            location: "前臂",
            severity: "轻伤",
            description: "前臂有一道较深划口，已经临时包扎",
            treatment: "王鸥当晚进行了清创和临时包扎",
            needsRecheck: true,
          }
        : state.injury,
    relationships,
    flags: {...state.flags, ...choice.effect.setFlags},
    history: [
      ...state.history,
      {
        id: `choice-${Date.now()}`,
        sceneId: state.currentSceneId,
        source: "选项",
        text: choice.text,
        createdAt: timestamp,
      },
    ],
    transitionOutcome: {
      narration: choice.effect.outcomeNarration,
      npcDialogue: choice.effect.outcomeDialogue,
    },
    pendingStoryHook:
      nextScene.id === "recheck_hook"
        ? "主角次日上午到徐记药材铺复查前臂伤口"
        : state.pendingStoryHook,
    lastFeedback: choice.nextSceneId && isCheckpointScene(choice.nextSceneId)
      ? CHECKPOINT_CONFIG[getCheckpointKind(choice.nextSceneId) ?? "rescue"].feedback
      : choice.nextSceneId
        ? null
      : "已记录你的选择。当前版本的后续场景仍在制作中。",
    updatedAt: timestamp,
  });

  if (choice.nextSceneId && isCheckpointScene(choice.nextSceneId)) {
    return saveCheckpointGame(updatedState);
  }

  return updatedState;
}

export function applyFreeInput(state: GameState, text: string): GameState {
  const cleanText = text.trim();
  if (!cleanText) return state;
  const timestamp = now();

  return GameStateSchema.parse({
    ...state,
    history: [
      ...state.history,
      {
        id: `free-${Date.now()}`,
        sceneId: state.currentSceneId,
        source: "自由输入",
        text: cleanText,
        createdAt: timestamp,
      },
    ],
    lastFeedback: "已记录你的自由行动。固定状态机暂时无法解析未列出的后续结果。",
    updatedAt: timestamp,
  });
}
