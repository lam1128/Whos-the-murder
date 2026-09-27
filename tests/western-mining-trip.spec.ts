import { describe, expect, it } from "vitest";
import rawWesternMiningTripScenario from "../data/chapter5_western_mining_trip_current.json";
import {
  applyWesternMiningTripChoice,
  createWesternMiningTripInitialState,
} from "../lib/westernMiningTripEngine";
import {
  getWesternMiningTripScene,
  westernMiningTripScenario,
  westernMiningTripSourceVersion,
} from "../lib/westernMiningTripScenario";

describe("第五章｜西原矿区换班路", () => {
  it("加载定稿版本并保持完整场景图闭合", () => {
    const sceneIds = new Set(westernMiningTripScenario.scenes.map((scene) => scene.id));

    expect(westernMiningTripSourceVersion).toBe("v2.5");
    expect(westernMiningTripScenario.scenes).toHaveLength(74);
    expect(sceneIds.has(westernMiningTripScenario.startSceneId)).toBe(true);

    for (const scene of westernMiningTripScenario.scenes) {
      for (const choice of scene.choices) {
        expect(["1", "2", "3", "4"]).toContain(choice.id);
        expect(choice.nextSceneId === null || sceneIds.has(choice.nextSceneId)).toBe(true);
      }
    }
  });

  it("沿默认第一选项路线抵达终章并结算终章效果", () => {
    let state = createWesternMiningTripInitialState({ name: "林昭宁" });

    for (let step = 0; step < 100 && state.currentSceneId !== "ch5_73_wuxin_story_close"; step += 1) {
      const scene = getWesternMiningTripScene(state.currentSceneId);
      expect(scene.choices.length, `${scene.id} should have a choice`).toBeGreaterThan(0);
      state = applyWesternMiningTripChoice(state, scene.choices[0]);
    }

    expect(state.currentSceneId).toBe("ch5_73_wuxin_story_close");
    expect(state.scenarioId).toBe("chapter5_western_mining_trip");
    expect(state.scenarioVersion).toBe("v2.5");
    expect(state.flags.western_mining_trip_completed).toBe(true);
    expect(state.flags.chapter5_returned_to_linchuan).toBe(true);
    expect(state.flags.sand_badger_incident_resolved).toBe(true);
    expect(state.flags.wu_xin_first_commission_completed).toBe(true);
    expect(state.flags.wang_ou_feeling_self_awareness).toBe(true);
  });

  it("把新版 setFlags 和 setState 都纳入统一运行状态", () => {
    let state = createWesternMiningTripInitialState({ name: "林昭宁" });

    for (let step = 0; step < 100 && state.currentSceneId !== "ch5_48_rain_first"; step += 1) {
      const scene = getWesternMiningTripScene(state.currentSceneId);
      state = applyWesternMiningTripChoice(state, scene.choices[0]);
    }

    expect(state.currentSceneId).toBe("ch5_48_rain_first");
    expect(state.flags.return_storm_started).toBe(true);
    expect(state.flags.weather).toBe("突发强降雨");
  });

  it("玩家队伍的可见文本使用沉浸式称呼", () => {
    const visibleTexts = westernMiningTripScenario.scenes.flatMap((scene) => [
      scene.title,
      scene.location,
      ...scene.narration,
      ...scene.npcDialogue.map((line) => line.text),
      ...scene.choices.flatMap((choice) => [
        choice.text,
        ...(choice.effect?.outcomeNarration ?? []),
        ...(choice.effect?.outcomeDialogue ?? []).map((line) => line.text),
      ]),
    ]);
    const playerGroupCountingPattern = /三人|三个人|三个|三位|你们三|我们三|四人/;

    expect(visibleTexts.filter((text) => playerGroupCountingPattern.test(text))).toEqual([]);
  });

  it("西门集合使用玩家姓名并完成轻快的集合问候", () => {
    const dialogue = getWesternMiningTripScene("ch5_07_west_gate_morning").npcDialogue;

    expect(dialogue.map((line) => line.speakerId)).toEqual([
      "han_ming",
      "he_jiong",
      "han_ming",
      "player",
      "tang_xiaoman",
      "wang_ou",
    ]);
    expect(dialogue[0].text).toContain("{{playerName}}");
    expect(dialogue[1].text).toBe("早，各位。我们没来晚吧？");
    expect(dialogue[3].text).toContain("西原");
    expect(dialogue[4].speakerId).toBe("tang_xiaoman");
    expect(dialogue[5].speakerId).toBe("wang_ou");
  });

  it("灰尘首次出现和返程时间线保持连续", () => {
    const dustSceneIndex = westernMiningTripScenario.scenes.findIndex(
      (scene) => scene.id === "ch5_13_dust_welcome",
    );
    const physicalDustBeforeFirstWind = westernMiningTripScenario.scenes
      .slice(0, dustSceneIndex)
      .flatMap((scene) => [
        ...scene.narration,
        ...scene.npcDialogue.flatMap((line) => [line.actionBefore, line.actionAfter]),
        ...scene.choices.flatMap((choice) => [
          ...(choice.effect?.outcomeNarration ?? []),
          ...(choice.effect?.outcomeDialogue ?? []).flatMap((line) => [line.actionBefore, line.actionAfter]),
        ]),
      ])
      .filter((text): text is string => Boolean(text))
      .filter((text) => /灰扑扑|那一脚灰|落下一点灰|拍掉手上的灰/.test(text));

    expect(physicalDustBeforeFirstWind).toEqual([]);
    expect(
      rawWesternMiningTripScenario.scenes.find((scene) => scene.id === "ch5_49b_evacuation_role")?.timeOfDay,
    ).toBe("中午");
    expect(
      rawWesternMiningTripScenario.scenes.find((scene) => scene.id === "ch5_50_wagon_slip")?.timeOfDay,
    ).toBe("中午");
  });

  it("旁白和动作说明不替角色猜测内心", () => {
    const narrationAndActions = westernMiningTripScenario.scenes.flatMap((scene) => [
      ...scene.narration,
      ...(scene.conditionalNarration ?? []).map((entry) => entry.text),
      ...scene.npcDialogue.flatMap((line) => [line.actionBefore, line.actionAfter]),
      ...scene.choices.flatMap((choice) => [
        ...(choice.effect?.outcomeNarration ?? []),
        ...(choice.effect?.outcomeDialogue ?? []).flatMap((line) => [line.actionBefore, line.actionAfter]),
      ]),
    ]).filter((text): text is string => Boolean(text));
    const speculativeNarrationPattern = /像是|似乎|仿佛|好像|显然|预感|神情里|神色里/;

    expect(narrationAndActions.filter((text) => speculativeNarrationPattern.test(text))).toEqual([]);
  });
});
