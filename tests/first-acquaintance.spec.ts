import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import FirstAcquaintanceOptionList from "../components/FirstAcquaintanceOptionList";
import FirstAcquaintanceSceneView from "../components/FirstAcquaintanceSceneView";
import {
  applyFirstAcquaintanceChoice,
  createFirstAcquaintanceInitialState,
  FIRST_ACQUAINTANCE_ACADEMY_CHECKPOINT_SAVE_KEY,
  FIRST_ACQUAINTANCE_CHECKPOINT_SCENE_IDS,
  FIRST_ACQUAINTANCE_REBANDAGE_CHECKPOINT_SAVE_KEY,
  FIRST_ACQUAINTANCE_SAVE_KEY,
  loadFirstAcquaintanceCheckpointGame,
} from "../lib/firstAcquaintanceEngine";
import {
  firstAcquaintanceScenario,
  firstAcquaintanceSourceVersion,
  getFirstAcquaintanceScene,
  getResolvedFirstAcquaintanceDialogue,
  getResolvedFirstAcquaintanceNarration,
  getVisibleFirstAcquaintanceChoices,
} from "../lib/firstAcquaintanceScenario";

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

describe("《初识》当前定稿版本", () => {
  it("选项使用数字编号和统一右箭头结构", () => {
    const state = createFirstAcquaintanceInitialState({ name: "林昭宁" });
    const scene = getFirstAcquaintanceScene(firstAcquaintanceScenario.startSceneId);
    const html = renderToStaticMarkup(
      createElement(FirstAcquaintanceOptionList, {
        choices: getVisibleFirstAcquaintanceChoices(scene, state),
        prompt: scene.controlPrompt,
        onChoose: () => undefined,
      }),
    );

    expect(html).toContain('<span class="option-index">1</span>');
    expect(html).toContain("→");
    expect(html).not.toContain('<span class="option-index">A</span>');
  });

  it("人物对白仍按角色颜色渲染", () => {
    const scene = getFirstAcquaintanceScene("ornament_blue_pendant");
    const html = renderToStaticMarkup(
      createElement(FirstAcquaintanceSceneView, {
        scene,
        outcome: { narration: [], npcDialogue: [] },
        playerName: "林昭宁",
        playerProfession: "潜行修",
      }),
    );

    expect(html).toContain("dialogue-line dialogue-he");
    expect(html).toContain("dialogue-line dialogue-wang");
    expect(scene.npcDialogue.length).toBeGreaterThan(0);
  });

  it("纯动作条目会直接读取 JSON 中的动作，不会渲染空对白", () => {
    const scene = getFirstAcquaintanceScene("xuji_arrival_greet");
    const html = renderToStaticMarkup(
      createElement(FirstAcquaintanceSceneView, {
        scene,
        outcome: { narration: [], npcDialogue: [] },
        playerName: "林昭宁",
        playerProfession: "潜行修",
      }),
    );

    const actionOnlyLine = scene.npcDialogue.find(
      (line) => line.text === "" && Boolean(line.actionBefore || line.actionAfter),
    );

    expect(actionOnlyLine).toBeTruthy();
    expect(html).toContain(actionOnlyLine?.actionBefore ?? "");
    expect(html).not.toContain('<p class="dialogue-text leading-7"></p>');
  });

  it("场景正文会带上 4.10 的条件旁白", () => {
    const scene = getFirstAcquaintanceScene("wang_home_preparation");
    const normalState = createFirstAcquaintanceInitialState({ name: "林昭宁" });
    const yardState = {
      ...normalState,
      flags: { ...normalState.flags, came_via_yard_observation: true },
    };

    const normalNarration = getResolvedFirstAcquaintanceNarration(scene, normalState).join("\n");
    const yardNarration = getResolvedFirstAcquaintanceNarration(scene, yardState).join("\n");

    expect(normalNarration).toContain("何炅把大药包放到桌边");
    expect(yardNarration).toContain("已经打开的药箱");
    expect(yardNarration).not.toEqual(normalNarration);
  });

  it("结尾会按是否询问承务所切换条件对白", () => {
    const scene = getFirstAcquaintanceScene("round_closure");
    const baseState = createFirstAcquaintanceInitialState({ name: "林昭宁" });
    const discussedState = {
      ...baseState,
      flags: { ...baseState.flags, he_jiong_office_discussed: true },
    };

    const defaultDialogue = getResolvedFirstAcquaintanceDialogue(scene, baseState)
      .map((line) => line.text)
      .join("\n");
    const discussedDialogue = getResolvedFirstAcquaintanceDialogue(scene, discussedState)
      .map((line) => line.text)
      .join("\n");

    expect(defaultDialogue).toContain("之后有空再见");
    expect(defaultDialogue).not.toContain("承务所的事");
    expect(discussedDialogue).toContain("承务所的事");
  });

  it("会根据 visibility 隐藏已经问过的重复选项", () => {
    const scene = getFirstAcquaintanceScene("noodle_shop_arrival");
    const state = createFirstAcquaintanceInitialState({ name: "林昭宁" });
    const defaultChoices = getVisibleFirstAcquaintanceChoices(scene, state);
    const hiddenState = {
      ...state,
      flags: { ...state.flags, branch_seen__noodle_he_jiong_old_memory_branch: true },
    };
    const hiddenChoices = getVisibleFirstAcquaintanceChoices(scene, hiddenState);

    expect(defaultChoices.some((choice) => choice.id === "2")).toBe(true);
    expect(hiddenChoices.some((choice) => choice.id === "2")).toBe(false);
  });

  it("使用独立存档键、检查点存档键和当前版本", () => {
    expect(firstAcquaintanceSourceVersion).toBe("v4.10.0");
    expect(FIRST_ACQUAINTANCE_SAVE_KEY).toMatch(/^first-acquaintance\.game-state\./);
    expect(FIRST_ACQUAINTANCE_REBANDAGE_CHECKPOINT_SAVE_KEY).toMatch(
      /^first-acquaintance\.checkpoint\.rebandage\./,
    );
    expect(FIRST_ACQUAINTANCE_ACADEMY_CHECKPOINT_SAVE_KEY).toMatch(
      /^first-acquaintance\.checkpoint\.academy\./,
    );
  });

  it("按当前定稿的第一选择可以推进到 round_closure，并触发进场状态", () => {
    let state = createFirstAcquaintanceInitialState({ name: "林昭宁" });

    for (let step = 0; step < 80 && state.currentSceneId !== "round_closure"; step += 1) {
      const scene = getFirstAcquaintanceScene(state.currentSceneId);
      const choices = getVisibleFirstAcquaintanceChoices(scene, state);
      const choice = choices[0];
      expect(choice, `Scene ${scene.id} should have a current choice`).toBeDefined();
      state = applyFirstAcquaintanceChoice(state, choice);
    }

    expect(state.currentSceneId).toBe("round_closure");
    expect(state.player.profession).toBe("潜行修");
    expect(state.player.weapon).toBe("匕首");
    expect(state.flags.tomorrow_rebandage_scheduled).toBe(true);
    expect(state.flags.first_acquaintance_completed).toBe(true);
  });

  it("当前低影响分支会按 JSON 的目标场景汇合", () => {
    const scene = getFirstAcquaintanceScene("breakfast_chunting_opening");
    const branchChoice = scene.choices.find((choice) => choice.id === "2")!;
    const state = createFirstAcquaintanceInitialState({ name: "林昭宁" });
    const updated = applyFirstAcquaintanceChoice(state, branchChoice);

    expect(branchChoice.branchType).toBe("low_impact_reconverge");
    expect(updated.currentSceneId).toBe("breakfast_preferences");
    expect(updated.history).toHaveLength(state.history.length + 1);
  });

  it("保留第二章的两个检查点场景", () => {
    expect([...FIRST_ACQUAINTANCE_CHECKPOINT_SCENE_IDS].sort()).toEqual([
      "academy_pickup_opening",
      "home_exam_end_reminder",
    ]);
    for (const sceneId of FIRST_ACQUAINTANCE_CHECKPOINT_SCENE_IDS) {
      expect(() => getFirstAcquaintanceScene(sceneId)).not.toThrow();
    }
  });

  it("到达检查点后会写入对应的第二章存档", () => {
    withMockLocalStorage(() => {
      globalThis.localStorage.removeItem(FIRST_ACQUAINTANCE_REBANDAGE_CHECKPOINT_SAVE_KEY);
      globalThis.localStorage.removeItem(FIRST_ACQUAINTANCE_ACADEMY_CHECKPOINT_SAVE_KEY);

      let state = createFirstAcquaintanceInitialState({ name: "林昭宁" });

      for (let step = 0; step < 40 && state.currentSceneId !== "home_exam_end_reminder"; step += 1) {
        const scene = getFirstAcquaintanceScene(state.currentSceneId);
        const choices = getVisibleFirstAcquaintanceChoices(scene, state);
        state = applyFirstAcquaintanceChoice(state, choices[0]);
      }

      expect(state.currentSceneId).toBe("home_exam_end_reminder");
      expect(loadFirstAcquaintanceCheckpointGame("rebandage")?.currentSceneId).toBe(
        "home_exam_end_reminder",
      );

      for (let step = 0; step < 20 && state.currentSceneId !== "academy_pickup_opening"; step += 1) {
        const scene = getFirstAcquaintanceScene(state.currentSceneId);
        const choices = getVisibleFirstAcquaintanceChoices(scene, state);
        state = applyFirstAcquaintanceChoice(state, choices[0]);
      }

      expect(state.currentSceneId).toBe("academy_pickup_opening");
      expect(loadFirstAcquaintanceCheckpointGame("academy")?.currentSceneId).toBe(
        "academy_pickup_opening",
      );
    });
  });

  it("收束场景没有下一步时会停留在原地", () => {
    const state = {
      ...createFirstAcquaintanceInitialState({ name: "林昭宁" }),
      currentSceneId: "round_closure",
    };
    const updated = applyFirstAcquaintanceChoice(state, {
      id: "1",
      label: "1",
      text: "结束这一段。",
      nextSceneId: null,
    });

    expect(updated.currentSceneId).toBe("round_closure");
    expect(updated.lastFeedback).toBeNull();
  });
});
