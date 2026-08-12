import { describe, expect, it } from "vitest";
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

    expect(westernMiningTripSourceVersion).toBe("v1.0.0");
    expect(westernMiningTripScenario.scenes).toHaveLength(72);
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

    for (let step = 0; step < 100 && state.currentSceneId !== "ch5_72_chapter_close"; step += 1) {
      const scene = getWesternMiningTripScene(state.currentSceneId);
      expect(scene.choices.length, `${scene.id} should have a choice`).toBeGreaterThan(0);
      state = applyWesternMiningTripChoice(state, scene.choices[0]);
    }

    expect(state.currentSceneId).toBe("ch5_72_chapter_close");
    expect(state.scenarioId).toBe("chapter5_western_mining_trip");
    expect(state.scenarioVersion).toBe("v1.0.0");
    expect(state.flags.western_mining_trip_completed).toBe(true);
    expect(state.flags.chapter5_returned_to_linchuan).toBe(true);
    expect(state.flags.sand_badger_incident_resolved).toBe(true);
    expect(state.inventory.some((item) => item.id === "ore_batch_western_mine")).toBe(false);
    expect(state.inventory.some((item) => item.id === "camp_pot")).toBe(false);
  });
});
