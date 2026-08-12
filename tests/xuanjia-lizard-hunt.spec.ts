import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import XuanjiaLizardHuntOptionList from "../components/XuanjiaLizardHuntOptionList";
import XuanjiaLizardHuntSceneView from "../components/XuanjiaLizardHuntSceneView";
import {
  applyXuanjiaLizardHuntChoice,
  createXuanjiaLizardHuntInitialState,
  XUANJIA_LIZARD_HUNT_SAVE_KEY,
} from "../lib/xuanjiaLizardHuntEngine";
import {
  getResolvedXuanjiaLizardHuntDialogue,
  getResolvedXuanjiaLizardHuntNarration,
  getVisibleXuanjiaLizardHuntChoices,
  getXuanjiaLizardHuntScene,
  xuanjiaLizardHuntScenario,
  xuanjiaLizardHuntSourceVersion,
} from "../lib/xuanjiaLizardHuntScenario";

describe("《玄甲林蜥》当前定稿版本", () => {
  it("选项继续使用数字编号和统一右箭头结构", () => {
    const state = createXuanjiaLizardHuntInitialState({ name: "林昭宁" });
    const scene = getXuanjiaLizardHuntScene(state.currentSceneId);
    const html = renderToStaticMarkup(
      createElement(XuanjiaLizardHuntOptionList, {
        choices: getVisibleXuanjiaLizardHuntChoices(scene, state),
        prompt: scene.controlPrompt,
        onChoose: () => undefined,
      }),
    );

    expect(html).toContain('<span class="option-index">1</span>');
    expect(html).toContain("→");
    expect(html).not.toContain('<span class="option-index">A</span>');
  });

  it("人物对白继续按主角与三名主要角色颜色渲染", () => {
    const scene = getXuanjiaLizardHuntScene("preparation_day");
    const html = renderToStaticMarkup(
      createElement(XuanjiaLizardHuntSceneView, {
        scene,
        outcome: {
          narration: [],
          npcDialogue: [
            {
              speakerId: "player",
              speakerName: "你",
              actionBefore: "你把桌上的干粮袋拉近一点，认真看向另外三个人。",
              text: "我先把要带的东西点清楚，再出门。",
            },
          ],
        },
        narration: getResolvedXuanjiaLizardHuntNarration(scene, {
          player: { name: "林昭宁", profession: "潜行修", weapon: "匕首" },
          flags: {},
        } as any),
        dialogue: getResolvedXuanjiaLizardHuntDialogue(scene, {
          player: { name: "林昭宁", profession: "潜行修", weapon: "匕首" },
          flags: {},
        } as any),
        playerName: "林昭宁",
        playerProfession: "潜行修",
      }),
    );

    expect(html).toContain("dialogue-line dialogue-player");
    expect(html).toContain("dialogue-line dialogue-he");
    expect(html).toContain("dialogue-line dialogue-wang");
    expect(html).toContain("dialogue-line dialogue-wu");
  });

  it("场景正文不再把 phase 首行渲染到剧情文本里", () => {
    const scene = getXuanjiaLizardHuntScene("second_rebandage_arrival");
    const html = renderToStaticMarkup(
      createElement(XuanjiaLizardHuntSceneView, {
        scene,
        outcome: { narration: [], npcDialogue: [] },
        narration: getResolvedXuanjiaLizardHuntNarration(scene, {
          player: { name: "林昭宁", profession: "潜行修", weapon: "匕首" },
          flags: {},
        } as any),
        dialogue: getResolvedXuanjiaLizardHuntDialogue(scene, {
          player: { name: "林昭宁", profession: "潜行修", weapon: "匕首" },
          flags: {},
        } as any),
        playerName: "林昭宁",
        playerProfession: "潜行修",
      }),
    );

    expect(html).toContain(scene.title);
    expect(html).not.toContain(">第二次换药<");
  });

  it("使用独立的第三章存档键和当前版本", () => {
    expect(xuanjiaLizardHuntSourceVersion).toBe("v1.1.0");
    expect(XUANJIA_LIZARD_HUNT_SAVE_KEY).toMatch(/^xuanjia-lizard-hunt\.game-state\./);
  });

  it("玩家可见剧情不使用脱离沉浸感的角色代称或成对转折句", () => {
    const serializedScenes = JSON.stringify(xuanjiaLizardHuntScenario.scenes);
    expect(serializedScenes).not.toContain("主角");
    expect(serializedScenes).not.toContain("而是");
  });

  it("按当前第一选择路径可以推进到章节收束并完成核心标记", () => {
    let state = createXuanjiaLizardHuntInitialState({ name: "林昭宁" });

    for (let step = 0; step < 120 && state.currentSceneId !== "chapter_closure"; step += 1) {
      const scene = getXuanjiaLizardHuntScene(state.currentSceneId);
      const choices = getVisibleXuanjiaLizardHuntChoices(scene, state);
      const choice = choices[0];
      expect(choice, `Scene ${scene.id} should have a current choice`).toBeDefined();
      state = applyXuanjiaLizardHuntChoice(state, choice);
    }

    expect(state.currentSceneId).toBe("chapter_closure");
    expect(state.player.profession).toBe("潜行修");
    expect(state.player.weapon).toBe("匕首");
    expect(state.flags.xuanjia_lizard_hunt_completed).toBe(true);
    expect(state.flags.relationship_tier).toBe("trusted_friends_and_field_partners");
    expect(state.flags.player_injury).toBe("light_scrapes_recovering");
  });
});
