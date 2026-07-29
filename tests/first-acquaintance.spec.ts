import { createElement } from "react";
import { describe, expect, it } from "vitest";
import FirstAcquaintanceOptionList from "../components/FirstAcquaintanceOptionList";
import FirstAcquaintanceSceneView from "../components/FirstAcquaintanceSceneView";
import {
  applyFirstAcquaintanceChoice,
  createFirstAcquaintanceInitialState,
  FIRST_ACQUAINTANCE_SAVE_KEY,
} from "../lib/firstAcquaintanceEngine";
import { getFirstAcquaintanceScene } from "../lib/firstAcquaintanceScenario";

const renderToStaticMarkup: (element: ReturnType<typeof createElement>) => string =
  require("react-dom/server").renderToStaticMarkup;

describe("《初识》独立试玩线", () => {
  it("选项完全沿用旧水闸的数字、正文和右箭头结构", () => {
    const scene = getFirstAcquaintanceScene("breakfast_chunting_opening");
    const html = renderToStaticMarkup(
      createElement(FirstAcquaintanceOptionList, {
        choices: scene.choices,
        prompt: scene.controlPrompt,
        onChoose: () => undefined,
      }),
    );

    expect(html).toContain('<span class="option-index">1</span>');
    expect(html).toContain('<span class="option-index">4</span>');
    expect(html).toContain("→");
    expect(html).not.toContain('<span class="option-index">01</span>');
    expect(html).not.toContain('<span class="option-index">A</span>');
  });

  it("对白按旧水闸的人物卡颜色和顺序渲染", () => {
    const scene = getFirstAcquaintanceScene("ornament_blue_pendant");
    const html = renderToStaticMarkup(
      createElement(FirstAcquaintanceSceneView, {
        scene,
        outcome: { narration: [], npcDialogue: [] },
        playerName: "林昭宁",
        playerProfession: "潜行修",
      }),
    );

    expect(scene.npcDialogue.map((line) => line.speakerId)).toEqual([
      "he_jiong",
      "wang_ou",
      "he_jiong",
      "wang_ou",
      "he_jiong",
      "wang_ou",
      "he_jiong",
    ]);
    expect(html).toContain("dialogue-line dialogue-he");
    expect(html).toContain("dialogue-line dialogue-wang");
    expect(html.indexOf("何炅</p>")).toBeLessThan(html.indexOf("这个也包起来吧。"));
    expect(html.indexOf("王鸥</p>")).toBeLessThan(html.indexOf("我还没说要。"));
  });

  it("场景中的主角对白会按旧水闸的青绿色卡片渲染", () => {
    const scene = getFirstAcquaintanceScene("xuji_arrival_greet");
    const html = renderToStaticMarkup(
      createElement(FirstAcquaintanceSceneView, {
        scene,
        outcome: { narration: [], npcDialogue: [] },
        playerName: "林昭宁",
        playerProfession: "潜行修",
      }),
    );

    expect(html).toContain("dialogue-line dialogue-player");
    expect(html).toContain("林昭宁");
  });

  it("使用独立存档键，不占用旧水闸存档", () => {
    expect(FIRST_ACQUAINTANCE_SAVE_KEY).toMatch(/^first-acquaintance\.game-state\./);
  });

  it("已确认主线可以从早餐推进到 round_closure", () => {
    let state = createFirstAcquaintanceInitialState({ name: "林昭宁" });

    for (let step = 0; step < 80 && state.currentSceneId !== "round_closure"; step += 1) {
      const scene = getFirstAcquaintanceScene(state.currentSceneId);
      const mainlineChoice = scene.choices.find((choice) => choice.isSelectedPath && Boolean(choice.nextSceneId));
      expect(mainlineChoice, `Scene ${scene.id} should have a selected-path choice`).toBeDefined();
      state = applyFirstAcquaintanceChoice(state, mainlineChoice!);
    }

    expect(state.currentSceneId).toBe("round_closure");
    expect(state.player.profession).toBe("潜行修");
    expect(state.player.weapon).toBe("匕首");
    expect(state.flags.round_complete).toBe(true);
    expect(state.flags.tomorrow_rebandage_with_wang_ou).toBe("accepted_morning");
  });

  it("未落地的低影响分支不会让页面报错", () => {
    const scene = getFirstAcquaintanceScene("breakfast_chunting_opening");
    const branchChoice = scene.choices.find((choice) => choice.label === "2")!;
    const state = createFirstAcquaintanceInitialState({ name: "林昭宁" });
    const updated = applyFirstAcquaintanceChoice(state, branchChoice);

    expect(updated.currentSceneId).toBe(scene.id);
    expect(updated.history).toHaveLength(state.history.length);
    expect(updated.lastFeedback).toContain("还没有展开");
  });

  it("当前场景没有下一步时会停留在原地", () => {
    const state = {
      ...createFirstAcquaintanceInitialState({ name: "林昭宁" }),
      currentSceneId: "round_closure",
    };
    const updated = applyFirstAcquaintanceChoice(state, {
      id: "round_closure:1",
      label: "1",
      text: "结束这一段。",
      nextSceneId: null,
    });

    expect(updated.currentSceneId).toBe("round_closure");
    expect(updated.lastFeedback).toContain("收束");
  });
});
