import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MisplacedRiverLightsOptionList from "../components/MisplacedRiverLightsOptionList";
import MisplacedRiverLightsSceneView from "../components/MisplacedRiverLightsSceneView";
import {
  applyMisplacedRiverLightsChoice,
  createMisplacedRiverLightsInitialState,
  loadMisplacedRiverLightsCheckpointGame,
  MISPLACED_RIVER_LIGHTS_CHECKPOINT_SCENE_IDS,
  MISPLACED_RIVER_LIGHTS_DAY_CHECKPOINT_SAVE_KEY,
  MISPLACED_RIVER_LIGHTS_NIGHT_CHECKPOINT_SAVE_KEY,
  MISPLACED_RIVER_LIGHTS_SAVE_KEY,
} from "../lib/misplacedRiverLightsEngine";
import {
  getMisplacedRiverLightsScene,
  getResolvedMisplacedRiverLightsDialogue,
  getResolvedMisplacedRiverLightsNarration,
  getVisibleMisplacedRiverLightsChoices,
  misplacedRiverLightsSourceVersion,
} from "../lib/misplacedRiverLightsScenario";

function withMockLocalStorage<T>(run: () => T): T {
  const original = globalThis.localStorage;
  const store = new Map<string, string>();
  const mock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;

  Object.defineProperty(globalThis, "localStorage", {
    value: mock,
    configurable: true,
  });

  try {
    return run();
  } finally {
    Object.defineProperty(globalThis, "localStorage", {
      value: original,
      configurable: true,
    });
  }
}

describe("《错位的河灯》当前定稿版本", () => {
  it("选项继续使用数字编号和统一右箭头结构", () => {
    const state = createMisplacedRiverLightsInitialState({
      name: "林昭宁",
      profession: "炼丹师",
      weapon: "剑",
    });
    const scene = getMisplacedRiverLightsScene(state.currentSceneId);
    const html = renderToStaticMarkup(
      createElement(MisplacedRiverLightsOptionList, {
        choices: getVisibleMisplacedRiverLightsChoices(scene, state),
        prompt: scene.controlPrompt,
        onChoose: () => undefined,
      }),
    );

    expect(html).toContain('<span class="option-index">1</span>');
    expect(html).toContain("→");
    expect(html).not.toContain('<span class="option-index">A</span>');
  });

  it("人物对白继续按主角与三名主要角色颜色渲染", () => {
    const scene = getMisplacedRiverLightsScene("commission_reading_room");

    const html = renderToStaticMarkup(
      createElement(MisplacedRiverLightsSceneView, {
        scene,
        outcome: {
          narration: [],
          npcDialogue: [
            {
              speakerId: "player",
              speakerName: "你",
              actionBefore: "你把三份材料并到同一列，准备把自己的判断说清楚。",
              text: "我先说我看见的共同点，再谈是不是同一件事。",
            },
          ],
        },
        narration: getResolvedMisplacedRiverLightsNarration(scene, {
          player: { name: "林昭宁", profession: "炼丹师", weapon: "剑" },
          flags: {},
        } as any),
        dialogue: getResolvedMisplacedRiverLightsDialogue(scene, {
          player: { name: "林昭宁", profession: "炼丹师", weapon: "剑" },
          flags: {},
        } as any),
        playerName: "林昭宁",
        playerProfession: "炼丹师",
        playerWeapon: "剑",
      }),
    );

    expect(html).toContain("dialogue-line dialogue-player");
    expect(html).toContain("dialogue-line dialogue-he");
    expect(html).toContain("dialogue-line dialogue-wang");
    expect(html).toContain("dialogue-line dialogue-wu");
  });

  it("场景正文不再把 phase 首行渲染到剧情文本里", () => {
    const scene = getMisplacedRiverLightsScene("bay_records_review");
    const html = renderToStaticMarkup(
      createElement(MisplacedRiverLightsSceneView, {
        scene,
        outcome: { narration: [], npcDialogue: [] },
        narration: getResolvedMisplacedRiverLightsNarration(scene, {
          player: { name: "林昭宁", profession: "炼丹师", weapon: "剑" },
          flags: {},
        } as any),
        dialogue: getResolvedMisplacedRiverLightsDialogue(scene, {
          player: { name: "林昭宁", profession: "炼丹师", weapon: "剑" },
          flags: {},
        } as any),
        playerName: "林昭宁",
        playerProfession: "炼丹师",
        playerWeapon: "剑",
      }),
    );

    expect(html).toContain(scene.title);
    expect(html).not.toContain(">白天调查<");
  });

  it("熟人称呼会使用名字而不是完整姓名", () => {
    const scene = getMisplacedRiverLightsScene("commission_office_arrival");
    const html = renderToStaticMarkup(
      createElement(MisplacedRiverLightsSceneView, {
        scene,
        outcome: { narration: [], npcDialogue: [] },
        narration: getResolvedMisplacedRiverLightsNarration(scene, {
          player: { name: "林昭宁", profession: "炼丹师", weapon: "剑" },
          flags: {},
        } as any),
        dialogue: getResolvedMisplacedRiverLightsDialogue(scene, {
          player: { name: "林昭宁", profession: "炼丹师", weapon: "剑" },
          flags: {},
        } as any),
        playerName: "林昭宁",
        playerProfession: "炼丹师",
        playerWeapon: "剑",
      }),
    );

    expect(html).toContain("昭宁？你也是为了回鹭湾来的？");
    expect(html).not.toContain("林昭宁？你也是为了回鹭湾来的？");
  });

  it("使用独立的第三章存档键、检查点存档键和当前版本", () => {
    expect(misplacedRiverLightsSourceVersion).toBe("v1.2.0");
    expect(MISPLACED_RIVER_LIGHTS_SAVE_KEY).toMatch(/^misplaced-river-lights\.game-state\./);
    expect(MISPLACED_RIVER_LIGHTS_DAY_CHECKPOINT_SAVE_KEY).toMatch(
      /^misplaced-river-lights\.checkpoint\.day\./,
    );
    expect(MISPLACED_RIVER_LIGHTS_NIGHT_CHECKPOINT_SAVE_KEY).toMatch(
      /^misplaced-river-lights\.checkpoint\.night\./,
    );
  });

  it("按当前第一选择路径可以推进到章节收束并完成核心标记", () => {
    let state = createMisplacedRiverLightsInitialState({
      name: "林昭宁",
      profession: "炼丹师",
      weapon: "剑",
    });

    for (let step = 0; step < 60 && state.currentSceneId !== "chapter_closure"; step += 1) {
      const scene = getMisplacedRiverLightsScene(state.currentSceneId);
      const choices = getVisibleMisplacedRiverLightsChoices(scene, state);
      const choice = choices[0];
      expect(choice, `Scene ${scene.id} should have a current choice`).toBeDefined();
      state = applyMisplacedRiverLightsChoice(state, choice);
    }

    expect(state.currentSceneId).toBe("chapter_closure");
    expect(state.flags.ship_records_compared).toBe(true);
    expect(state.flags.silt_ridge_confirmed).toBe(true);
    expect(state.flags.float_lamp_tampering_confirmed).toBe(true);
    expect(state.flags.marker_alignment_confirmed).toBe(true);
    expect(state.flags.salvage_site_found).toBe(true);
    expect(state.flags.underwater_rope_found).toBe(true);
    expect(state.flags.luo_shun_identified).toBe(true);
    expect(state.flags.incoming_ship_warned).toBe(true);
    expect(state.flags.river_hazard_removed).toBe(true);
    expect(state.flags.institutional_handoff_completed).toBe(true);
    expect(state.flags.misplaced_river_lights_completed).toBe(true);
  });

  it("保留第三章的两个检查点场景", () => {
    expect([...MISPLACED_RIVER_LIGHTS_CHECKPOINT_SCENE_IDS].sort()).toEqual([
      "dusk_riverbank_wait",
      "night_watch_positions",
    ]);
    for (const sceneId of MISPLACED_RIVER_LIGHTS_CHECKPOINT_SCENE_IDS) {
      expect(() => getMisplacedRiverLightsScene(sceneId)).not.toThrow();
    }
  });

  it("到达检查点后会写入对应的第三章存档", () => {
    withMockLocalStorage(() => {
      globalThis.localStorage.removeItem(MISPLACED_RIVER_LIGHTS_DAY_CHECKPOINT_SAVE_KEY);
      globalThis.localStorage.removeItem(MISPLACED_RIVER_LIGHTS_NIGHT_CHECKPOINT_SAVE_KEY);

      let state = createMisplacedRiverLightsInitialState({
        name: "林昭宁",
        profession: "机关傀儡师",
        weapon: "枪",
      });

      for (let step = 0; step < 35 && state.currentSceneId !== "dusk_riverbank_wait"; step += 1) {
        const scene = getMisplacedRiverLightsScene(state.currentSceneId);
        const choices = getVisibleMisplacedRiverLightsChoices(scene, state);
        state = applyMisplacedRiverLightsChoice(state, choices[0]);
      }

      expect(state.currentSceneId).toBe("dusk_riverbank_wait");
      expect(loadMisplacedRiverLightsCheckpointGame("day")?.currentSceneId).toBe(
        "dusk_riverbank_wait",
      );

      for (let step = 0; step < 10 && state.currentSceneId !== "night_watch_positions"; step += 1) {
        const scene = getMisplacedRiverLightsScene(state.currentSceneId);
        const choices = getVisibleMisplacedRiverLightsChoices(scene, state);
        state = applyMisplacedRiverLightsChoice(state, choices[0]);
      }

      expect(state.currentSceneId).toBe("night_watch_positions");
      expect(loadMisplacedRiverLightsCheckpointGame("night")?.currentSceneId).toBe(
        "night_watch_positions",
      );
    });
  });
});
