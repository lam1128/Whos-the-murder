import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import XuanjiaLizardHuntOptionList from "../components/XuanjiaLizardHuntOptionList";
import XuanjiaLizardHuntSceneView from "../components/XuanjiaLizardHuntSceneView";
import {
  applyEquipmentDayChoice,
  createEquipmentDayInitialState,
  EQUIPMENT_DAY_CHECKPOINT_SCENE_IDS,
  EQUIPMENT_DAY_DINNER_CHECKPOINT_SAVE_KEY,
  EQUIPMENT_DAY_SAVE_KEY,
  EQUIPMENT_DAY_LUNCH_CHECKPOINT_SAVE_KEY,
  loadEquipmentDayCheckpointGame,
} from "../lib/equipmentDayEngine";
import {
  equipmentDayScenario,
  equipmentDaySourceVersion,
  getEquipmentDayScene,
  getResolvedEquipmentDayDialogue,
  getResolvedEquipmentDayNarration,
  getVisibleEquipmentDayChoices,
} from "../lib/equipmentDayScenario";

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

describe("《添置》当前定稿版本", () => {
  it("选项继续使用数字编号和统一右箭头结构", () => {
    const state = createEquipmentDayInitialState({ name: "林昭宁" });
    const scene = getEquipmentDayScene(state.currentSceneId);
    const html = renderToStaticMarkup(
      createElement(XuanjiaLizardHuntOptionList, {
        choices: getVisibleEquipmentDayChoices(scene, state),
        prompt: scene.controlPrompt,
        onChoose: () => undefined,
      }),
    );

    expect(html).toContain('<span class="option-index">1</span>');
    expect(html).toContain("→");
    expect(html).not.toContain('<span class="option-index">A</span>');
  });

  it("人物对白继续按主角与三名主要角色颜色渲染", () => {
    const scene = getEquipmentDayScene("ch4_28_wu_professional_tools");
    const html = renderToStaticMarkup(
      createElement(XuanjiaLizardHuntSceneView, {
        scene,
        outcome: {
          narration: [],
          npcDialogue: [
            {
              speakerId: "player",
              speakerName: "你",
              actionBefore: "你低头看了一眼旧短靴，又抬头看向另外三个人。",
              text: "那我今天就认真挑一双合适的。",
            },
          ],
        },
        narration: getResolvedEquipmentDayNarration(scene, {
          player: { name: "林昭宁", profession: "潜行修", weapon: "匕首" },
          flags: {},
        } as any),
        dialogue: getResolvedEquipmentDayDialogue(scene, {
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
    const scene = getEquipmentDayScene(equipmentDayScenario.startSceneId);
    const html = renderToStaticMarkup(
      createElement(XuanjiaLizardHuntSceneView, {
        scene,
        outcome: { narration: [], npcDialogue: [] },
        narration: getResolvedEquipmentDayNarration(scene, {
          player: { name: "林昭宁", profession: "潜行修", weapon: "匕首" },
          flags: {},
        } as any),
        dialogue: getResolvedEquipmentDayDialogue(scene, {
          player: { name: "林昭宁", profession: "潜行修", weapon: "匕首" },
          flags: {},
        } as any),
        playerName: "林昭宁",
        playerProfession: "潜行修",
      }),
    );

    expect(html).toContain(scene.title);
    expect(html).not.toContain(">上午开场<");
  });

  it("使用独立的第四章存档键和当前版本", () => {
    expect(equipmentDaySourceVersion).toBe("v2.3.0");
    expect(EQUIPMENT_DAY_SAVE_KEY).toMatch(/^equipment-day\.game-state\./);
    expect(EQUIPMENT_DAY_LUNCH_CHECKPOINT_SAVE_KEY).toMatch(/^equipment-day\.checkpoint\.lunch\./);
    expect(EQUIPMENT_DAY_DINNER_CHECKPOINT_SAVE_KEY).toMatch(
      /^equipment-day\.checkpoint\.dinner\./,
    );
  });

  it("新稿保持连续场景与人物对白结构", () => {
    const scene = getEquipmentDayScene("ch4_18_wang_needle_check");
    expect(scene.npcDialogue.some((line) => line.speakerId === "wang_ou")).toBe(true);
    expect(scene.choices).toHaveLength(3);

    const lines = equipmentDayScenario.scenes.flatMap((currentScene) => [
      ...currentScene.npcDialogue,
      ...currentScene.choices.flatMap((choice) => choice.effect?.outcomeDialogue ?? []),
    ]);
    expect(lines.length).toBeGreaterThan(0);
    expect(equipmentDayScenario.scenes.every((currentScene) =>
      currentScene.terminal ||
      (currentScene.choices.length >= 3 && currentScene.choices.length <= 4),
    )).toBe(true);
    expect(getEquipmentDayScene("ch4_45_wang_past").choices.map((choice) => choice.id)).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
  });

  it("玩家说出口的话都会得到在场人物回应", () => {
    for (const scene of equipmentDayScenario.scenes) {
      for (const choice of scene.choices) {
        const dialogue = choice.effect?.outcomeDialogue ?? [];
        const lastPlayerIndex = dialogue.reduce(
          (lastIndex, line, index) => (line.speakerId === "player" ? index : lastIndex),
          -1,
        );
        if (lastPlayerIndex < 0) continue;

        expect(
          dialogue.slice(lastPlayerIndex + 1).some((line) => line.speakerId !== "player"),
          `${scene.id}:${choice.id} should receive an immediate reply`,
        ).toBe(true);
      }
    }
  });

  it("无对白行动显示玩家姓名，熟名称呼会按输入姓名解析", () => {
    const actionScene = getEquipmentDayScene("ch4_08_plain_boots");
    const namedScene = getEquipmentDayScene("ch4_04_market_meet");
    const state = {
      player: { name: "林昭宁", profession: "潜行修", weapon: "匕首" },
      flags: {},
    } as any;
    const actionHtml = renderToStaticMarkup(
      createElement(XuanjiaLizardHuntSceneView, {
        scene: actionScene,
        outcome: {
          narration: ["你低头检查新换上的软靴。"],
          npcDialogue: [],
        },
        narration: getResolvedEquipmentDayNarration(actionScene, state),
        dialogue: getResolvedEquipmentDayDialogue(actionScene, state),
        playerName: "林昭宁",
        playerProfession: "潜行修",
      }),
    );
    const namedHtml = renderToStaticMarkup(
      createElement(XuanjiaLizardHuntSceneView, {
        scene: namedScene,
        outcome: { narration: [], npcDialogue: [] },
        narration: getResolvedEquipmentDayNarration(namedScene, state),
        dialogue: getResolvedEquipmentDayDialogue(namedScene, state),
        playerName: "林昭宁",
        playerProfession: "潜行修",
      }),
    );

    expect(actionHtml).toContain(">林昭宁</p>");
    expect(namedHtml).toContain("昭宁，到了？");
  });

  it("三阶剑先由师傅介绍，薄鳞由何炅在午饭离席前提出", () => {
    const serialized = JSON.stringify(equipmentDayScenario);
    expect(serialized).not.toContain("上午看中的");
    expect(serialized).not.toContain("而是");
    expect(serialized).not.toContain("主角");
    expect(serialized).not.toContain("比较沉的纸包");
    expect(serialized).not.toContain("轻的一包");

    const swordIntroScene = getEquipmentDayScene("ch4_15_he_sword_maintenance");
    const swordTrialScene = getEquipmentDayScene("ch4_16_try_third_tier");
    expect(swordIntroScene.narration.join(" ")).toContain("三阶剑");
    expect(swordTrialScene.narration.join(" ")).toContain("接过刚才介绍的三阶剑");
    expect(swordTrialScene.narration.join(" ")).toContain("将三阶剑双手递还师傅");

    const scaleScene = getEquipmentDayScene("ch4_22_he_thin_scale_idea");
    expect(scaleScene.location).toBe("临川城普通小馆");
    expect(scaleScene.phase).toBe("中午");
    expect(scaleScene.narration.join(" ")).toContain("何炅");
    expect(scaleScene.narration.join(" ")).toContain("特意把薄鳞包好");
    expect(scaleScene.narration.join(" ")).toContain("还没有结账离席");
    expect(getEquipmentDayScene("ch4_23_walk_guard").narration.join(" ")).toContain(
      "仍由何炅拿着",
    );
  });

  it("匕首和刀鞘上午留店，傍晚取回后才完成调整", () => {
    const sendScene = getEquipmentDayScene("ch4_14_adjust_sheath");
    const pickupScene = getEquipmentDayScene("ch4_40_pickup");

    expect(sendScene.narration.join(" ")).toContain("一起留在铺里");
    expect(sendScene.onEnterEffect?.setFlags?.player_sheath_sent).toBe(true);
    expect(sendScene.onEnterEffect?.setFlags?.player_sheath_adjusted).toBeUndefined();
    expect(pickupScene.narration.join(" ")).toContain("取回原有匕首和调整好的刀鞘");
    expect(pickupScene.onEnterEffect?.setFlags?.player_sheath_adjusted).toBe(true);
    expect(pickupScene.onEnterEffect?.addInventoryIds).toContain("adjusted_dagger_sheath");
  });

  it("换鞋由三人结合旧装备和委托表现共同提出", () => {
    const reviewScene = getEquipmentDayScene("ch4_07_old_gear_review");
    const speakers = reviewScene.npcDialogue.map((line) => line.speakerId);

    expect(speakers).toEqual(["he_jiong", "wang_ou", "wu_xin"]);
    expect(reviewScene.narration.join(" ")).toContain("最先影响行动的一件");
    expect(reviewScene.npcDialogue.every((line) => line.text.includes("鞋"))).toBe(true);
  });

  it("黑色行动结果都由玩家执行，场景标题、阶段和地点完整", () => {
    for (const scene of equipmentDayScenario.scenes) {
      expect(scene.title.trim(), `${scene.id} title`).not.toBe("");
      expect(scene.phase.trim(), `${scene.id} phase`).not.toBe("");
      expect(scene.location.trim(), `${scene.id} location`).not.toBe("");
      expect(`${scene.title}${scene.phase}${scene.location}`).not.toMatch(/[?？]{2,}/);

      for (const choice of scene.choices) {
        for (const narration of choice.effect?.outcomeNarration ?? []) {
          expect(narration.startsWith("你"), `${scene.id}:${choice.id} player action`).toBe(true);
        }
      }
    }
  });

  it("地点变化会在剧情正文中明确写出移动过程", () => {
    expect(getEquipmentDayScene("ch4_06_equipment_street").narration[0]).toContain(
      "走到装备街入口",
    );
    expect(getEquipmentDayScene("ch4_10_professional_boots").narration[0]).toContain(
      "离开普通软靴铺",
    );
    expect(getEquipmentDayScene("ch4_18_wang_needle_check").narration[0]).toContain(
      "走进旁边的药具铺",
    );
    expect(getEquipmentDayScene("ch4_28_wu_professional_tools").narration[0]).toContain(
      "走到符具街后",
    );
    expect(getEquipmentDayScene("ch4_40_pickup").narration[0]).toContain("回到装备街后");
  });

  it("人物说话时称吴昕为昕昕，叙述仍使用吴昕", () => {
    const dialogueTexts = equipmentDayScenario.scenes.flatMap((scene) => [
      ...scene.npcDialogue.map((line) => line.text),
      ...scene.choices.flatMap((choice) =>
        (choice.effect?.outcomeDialogue ?? []).map((line) => line.text),
      ),
    ]);
    const narrationTexts = equipmentDayScenario.scenes.flatMap((scene) => scene.narration);

    expect(dialogueTexts.some((text) => text.includes("昕昕"))).toBe(true);
    expect(dialogueTexts.some((text) => text.includes("吴昕"))).toBe(false);
    expect(narrationTexts.some((text) => text.includes("吴昕"))).toBe(true);
    expect(narrationTexts.some((text) => text.includes("昕昕"))).toBe(false);
  });

  it("人物语言中的动作神态覆盖率不低于百分之三十，且相同描写不重复三次", () => {
    const dialogueLines = equipmentDayScenario.scenes.flatMap((scene) => [
      ...scene.npcDialogue,
      ...scene.choices.flatMap((choice) => choice.effect?.outcomeDialogue ?? []),
    ]);
    const spokenLines = dialogueLines.filter((line) => line.text.trim());
    const linesWithAction = spokenLines.filter(
      (line) => line.actionBefore?.trim() || line.actionAfter?.trim(),
    );
    const standaloneActionCount = equipmentDayScenario.scenes.reduce(
      (sceneTotal, scene) =>
        sceneTotal +
        scene.choices.reduce(
          (choiceTotal, choice) =>
            choiceTotal + (choice.effect?.outcomeNarration ?? []).filter((text) => text.trim()).length,
          0,
        ),
      0,
    );
    const actionCounts = new Map<string, number>();

    for (const line of dialogueLines) {
      for (const action of [line.actionBefore, line.actionAfter]) {
        if (!action?.trim()) continue;
        actionCounts.set(action, (actionCounts.get(action) ?? 0) + 1);
      }
    }

    expect(linesWithAction.length / spokenLines.length).toBeGreaterThanOrEqual(0.3);
    expect(Math.max(...actionCounts.values())).toBeLessThan(3);
    expect(standaloneActionCount).toBe(48);
  });

  it("按当前第一选择路径可以推进到章节收束并完成核心标记", () => {
    let state = createEquipmentDayInitialState({ name: "林昭宁" });

    for (let step = 0; step < 120 && state.currentSceneId !== "ch4_terminal"; step += 1) {
      const scene = getEquipmentDayScene(state.currentSceneId);
      const choices = getVisibleEquipmentDayChoices(scene, state);
      const choice = choices[0];
      expect(choice, `Scene ${scene.id} should have a current choice`).toBeDefined();
      state = applyEquipmentDayChoice(state, choice);
    }

    expect(state.currentSceneId).toBe("ch4_terminal");
    expect(state.player.profession).toBe("潜行修");
    expect(state.player.weapon).toBe("匕首");
    expect(state.flags.equipment_day_completed).toBe(true);
    expect(state.flags.family_gift_bought).toBe(true);
    expect(state.flags.rib_guard_commissioned).toBe(true);
    expect(state.flags.relationship_tier).toBe("trusted_friends_and_field_partners");
  });

  it("保留第四章的两个检查点场景", () => {
    expect([...EQUIPMENT_DAY_CHECKPOINT_SCENE_IDS].sort()).toEqual([
      "ch4_20_lunch",
      "ch4_44_dinner_start",
    ]);
    for (const sceneId of EQUIPMENT_DAY_CHECKPOINT_SCENE_IDS) {
      expect(() => getEquipmentDayScene(sceneId)).not.toThrow();
    }
  });

  it("到达检查点后会写入对应的第四章存档", () => {
    withMockLocalStorage(() => {
      globalThis.localStorage.removeItem(EQUIPMENT_DAY_LUNCH_CHECKPOINT_SAVE_KEY);
      globalThis.localStorage.removeItem(EQUIPMENT_DAY_DINNER_CHECKPOINT_SAVE_KEY);

      let state = createEquipmentDayInitialState({ name: "林昭宁" });

      for (let step = 0; step < 80 && state.currentSceneId !== "ch4_20_lunch"; step += 1) {
        const scene = getEquipmentDayScene(state.currentSceneId);
        const choices = getVisibleEquipmentDayChoices(scene, state);
        state = applyEquipmentDayChoice(state, choices[0]);
      }

      expect(state.currentSceneId).toBe("ch4_20_lunch");
      expect(loadEquipmentDayCheckpointGame("lunch")?.currentSceneId).toBe("ch4_20_lunch");

      for (
        let step = 0;
        step < 80 && state.currentSceneId !== "ch4_44_dinner_start";
        step += 1
      ) {
        const scene = getEquipmentDayScene(state.currentSceneId);
        const choices = getVisibleEquipmentDayChoices(scene, state);
        state = applyEquipmentDayChoice(state, choices[0]);
      }

      expect(state.currentSceneId).toBe("ch4_44_dinner_start");
      expect(loadEquipmentDayCheckpointGame("dinner")?.currentSceneId).toBe(
        "ch4_44_dinner_start",
      );
    });
  });
});
