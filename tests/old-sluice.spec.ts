import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import OldSluiceOptionList from "../components/OldSluiceOptionList";
import OldSluiceSceneView from "../components/OldSluiceSceneView";
import rawOldSluiceData from "../data/old_sluice_current.json";
import {
  applyChoice,
  applyFreeInput,
  CHECKPOINT_SCENE_IDS,
  createInitialGameState,
  getScene,
  getVisibleChoices,
  oldSluiceData,
} from "../lib/oldSluiceEngine";
import {
  GameStateSchema,
  OldSluiceDataSchema,
  SceneSchema,
} from "../lib/oldSluiceTypes";

const player = {
  name: "Test Player",
  profession: oldSluiceData.playerCreation.professions[2],
  weapon: oldSluiceData.playerCreation.weapons[1],
};

describe("old sluice authoritative data", () => {
  it("validates the current runtime data and latest knowledge source", () => {
    expect(() => OldSluiceDataSchema.parse(rawOldSluiceData)).not.toThrow();
    expect(oldSluiceData.metadata.id).toBe("old_sluice_v1");
    expect(oldSluiceData.metadata.knowledgeVersion).toBe("6.0");
    expect(oldSluiceData.metadata.canonicalSource).toBe("project_knowledge_v6.0.json");
  });

  it("has unique scene ids and no dangling choice references", () => {
    const sceneIds = new Set(oldSluiceData.scenes.map((scene) => scene.id));

    expect(sceneIds.size).toBe(oldSluiceData.scenes.length);
    expect(sceneIds.has(oldSluiceData.startSceneId)).toBe(true);

    for (const scene of oldSluiceData.scenes) {
      for (const choice of scene.choices) {
        if (choice.nextSceneId) expect(sceneIds.has(choice.nextSceneId)).toBe(true);
        for (const clueId of choice.effect.addClueIds) {
          const catalog = [...oldSluiceData.initialClues, ...oldSluiceData.discoverableClues];
          expect(catalog.some((clue) => clue.id === clueId)).toBe(true);
        }
      }
    }
  });

  it("keeps the current checkpoint scenes in the runtime graph", () => {
    expect([...CHECKPOINT_SCENE_IDS].sort()).toEqual(["post_task_meal", "withdrawal_converges"]);
    for (const sceneId of CHECKPOINT_SCENE_IDS) {
      expect(() => getScene(sceneId)).not.toThrow();
    }
  });
});

describe("old sluice current flow", () => {
  it("creates a valid initial state from the latest start scene", () => {
    const state = createInitialGameState(player);

    expect(() => GameStateSchema.parse(state)).not.toThrow();
    expect(state.currentSceneId).toBe(oldSluiceData.startSceneId);
    expect(state.presentCharacters).toEqual(getScene(oldSluiceData.startSceneId).presentCharacters);
  });

  it("applies the first current choice and records the transition", () => {
    const state = createInitialGameState(player);
    const opening = getScene(state.currentSceneId);
    const choice = getVisibleChoices(opening, state)[0];
    const nextState = applyChoice(state, choice);

    expect(nextState.currentSceneId).toBe(choice.nextSceneId);
    expect(nextState.history).toHaveLength(state.history.length + 1);
    expect(nextState.transitionOutcome.narration).toEqual(choice.effect.outcomeNarration);
  });

  it("records free input without changing the current scene", () => {
    const state = createInitialGameState(player);
    const nextState = applyFreeInput(state, "a current investigation note");

    expect(nextState.currentSceneId).toBe(state.currentSceneId);
    expect(nextState.history).toHaveLength(state.history.length + 1);
    expect(nextState.history.at(-1)?.text).toBe("a current investigation note");
    expect(() => GameStateSchema.parse(nextState)).not.toThrow();
  });

  it("allows the latest interaction nodes to use their complete choice ranges", () => {
    const interactionScenes = oldSluiceData.scenes.filter((scene) => scene.interactionPoint);

    expect(interactionScenes.length).toBeGreaterThan(0);
    for (const scene of interactionScenes) {
      expect(scene.choices.length).toBeGreaterThanOrEqual(2);
      expect(scene.choices.length).toBeLessThanOrEqual(6);
      expect(scene.freeInputEnabled).toBe(true);
      expect(scene.controlPrompt).toBeTruthy();
    }
  });

  it("keeps the latest branch targets and supported choice intents", () => {
    const intents = new Set([
      "语言",
      "态度",
      "关系回应",
      "个人行动",
      "专业行动",
      "个人选择",
    ]);
    const sceneIds = new Set(oldSluiceData.scenes.map((scene) => scene.id));

    for (const scene of oldSluiceData.scenes) {
      for (const choice of scene.choices) {
        expect(intents.has(choice.intent)).toBe(true);
        if (choice.nextSceneId) expect(sceneIds.has(choice.nextSceneId)).toBe(true);
      }
    }

    const route = getScene("rescue_route_confirmed");
    expect(route.choices.length).toBeGreaterThanOrEqual(3);
    expect(route.choices.every((choice) => choice.nextSceneId)).toBe(true);
    expect(new Set(route.choices.map((choice) => choice.nextSceneId)).size).toBeGreaterThanOrEqual(3);
  });
});

describe("old sluice current UI contract", () => {
  it("renders numeric option labels for the current opening choices", () => {
    const state = createInitialGameState(player);
    const scene = getScene(state.currentSceneId);
    const choices = getVisibleChoices(scene, state);
    const html = renderToStaticMarkup(
      createElement(OldSluiceOptionList, {
        choices,
        prompt: scene.controlPrompt,
        onChoose: () => undefined,
      }),
    );

    expect((html.match(/option-index/g) ?? []).length).toBe(choices.length);
    expect(html).toContain('class="option-index">1</span>');
    expect(html).toContain(`>${choices.length}</span>`);
  });

  it("renders the latest scene and transition outcome through the shared scene view", () => {
    const scene = getScene("monster_restrained");
    const html = renderToStaticMarkup(
      createElement(OldSluiceSceneView, {
        scene,
        outcome: { narration: [], npcDialogue: [] },
        playerName: player.name,
        playerProfession: player.profession,
        playerIntroduced: true,
        flags: {},
      }),
    );

    expect(html).toContain(scene.title);
    expect(html).toContain("dialogue-title");
  });

  it("rejects an interaction scene that has lost its required choices", () => {
    const scene = oldSluiceData.scenes.find((item) => item.interactionPoint)!;
    const result = SceneSchema.safeParse({ ...scene, choices: [scene.choices[0]] });

    expect(result.success).toBe(false);
  });
});
