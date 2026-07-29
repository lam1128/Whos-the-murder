import { createElement } from "react";
import { describe, expect, it } from "vitest";
import OldSluiceSceneView from "../components/OldSluiceSceneView";
import rawOldSluiceData from "../data/old_sluice_current.json";
import {
  applyChoice,
  applyFreeInput,
  CHECKPOINT_SCENE_IDS,
  createCheckpointSnapshot,
  createInitialGameState,
  oldSluiceData,
  getScene,
  getVisibleChoices,
} from "../lib/oldSluiceEngine";
import { getPlayerAddress } from "../lib/playerAddress";
import { OldSluiceDataSchema, GameStateSchema, SceneSchema } from "../lib/oldSluiceTypes";

const renderToStaticMarkup: (element: ReturnType<typeof createElement>) => string =
  require("react-dom/server").renderToStaticMarkup;

describe("玩家称呼", () => {
  it("根据实际输入姓名生成何炅与王鸥使用的称呼", () => {
    expect(getPlayerAddress("林昭宁")).toEqual({
      formal: "林姑娘",
      familiar: "昭宁",
    });
  });

  it("能够识别常见复姓", () => {
    expect(getPlayerAddress("欧阳昭")).toEqual({
      formal: "欧阳姑娘",
      familiar: "昭",
    });
  });

  it("饭桌主动改称呼时使用玩家输入名，而不是退回姑娘", () => {
    const mealChoice = getScene("post_task_meal").choices.find(
      (choice) => choice.id === "meal_correct_address",
    )!;
    const html = renderToStaticMarkup(
      createElement(OldSluiceSceneView, {
        scene: getScene("recheck_hook"),
        outcome: {
          narration: [],
          npcDialogue: mealChoice.effect.outcomeDialogue,
        },
        playerName: "林昭宁",
        playerProfession: "潜行修",
        playerIntroduced: false,
        flags: { corrected_address_at_meal: true },
      }),
    );

    expect(html).toContain("叫我昭宁就好");
    expect(html).toContain("好，昭宁");
    expect(html).not.toContain("叫我姑娘就好");
  });
});

describe("旧水闸最小数据集", () => {
  it("通过完整的 Zod 数据校验", () => {
    expect(() => OldSluiceDataSchema.parse(rawOldSluiceData)).not.toThrow();
    expect(oldSluiceData.metadata.knowledgeVersion).toBe("6.0");
    expect(oldSluiceData.metadata.canonicalSource).toBe("project_knowledge_v6.0.json");
  });

  it("王鸥在游戏数据中只使用新版固定的短匕首", () => {
    const serialized = JSON.stringify(oldSluiceData);
    expect(serialized).toContain("短匕首");
    expect(serialized).not.toContain("轻剑");
  });

  it("只删除点名的两个控制结果，不影响其他分支的结果显示数据", () => {
    const controlChoice = getScene("monster_control_plan").choices.find(
      (choice) => choice.id === "control_take_signal_post",
    );
    const ropeChoice = getScene("control_at_first_bend").choices.find(
      (choice) => choice.id === "bend_clear_rope",
    );
    const lampChoice = getScene("control_at_first_bend").choices.find(
      (choice) => choice.id === "bend_raise_lamp",
    );

    expect(controlChoice?.effect.outcomeNarration).toEqual([]);
    expect(controlChoice?.effect.outcomeDialogue).toEqual([]);
    expect(ropeChoice?.effect.outcomeNarration).toEqual([]);
    expect(lampChoice?.effect.outcomeNarration.length).toBeGreaterThan(0);
  });

  it("受困看守自行说明腿部感受，且救援动作顺序成立", () => {
    const insideScene = getScene("guard_reached_inside");
    const guardReport = insideScene.npcDialogue.find(
      (line) => line.speakerId === "secondary_guard",
    );
    const convergence = getScene("withdrawal_converges");
    const wangAssessment = convergence.npcDialogue.find(
      (line) => line.speakerId === "wang_ou",
    );

    expect(guardReport?.text).toContain("就是麻");
    expect(guardReport?.actionAfter).toContain("短匕首收回腰侧");
    expect(wangAssessment?.actionBefore).toContain("躺稳");
    expect(wangAssessment?.actionBefore).toContain("进了值守房");
    expect(wangAssessment?.text).not.toContain("先让他平躺");
    expect(convergence.narration[0]).toContain("从{{rescueHandoffActors}}手里接过人");
  });

  it("先显示上一回合的扶起结果，再显示撤回入口后的检查", () => {
    const html = renderToStaticMarkup(
      createElement(OldSluiceSceneView, {
        scene: getScene("withdrawal_converges"),
        outcome: {
          narration: ["你和王鸥扶住受困看守。"],
          npcDialogue: [
            {
              speakerId: "wang_ou",
              speakerName: "王鸥",
              text: "位置对了。慢慢起，我扶着你，不用硬撑那条腿。",
            },
          ],
        },
        playerName: "林昭宁",
        playerProfession: "潜行修",
        playerIntroduced: true,
        flags: { secured_trapped_guard: true },
      }),
    );

    expect(html).not.toContain("上一步结果");
    expect(html).toContain("人物对白");
    expect(html).toContain("从你和王鸥手里接过人");
    expect(html.indexOf("位置对了")).toBeLessThan(html.indexOf("几分钟后"));
    expect(html.indexOf("几分钟后")).toBeLessThan(html.indexOf("进了值守房"));
  });

  it("控制方案不再包含已指定删除的两处文字", () => {
    const controlPlan = JSON.stringify(getScene("monster_control_plan"));
    expect(controlPlan).not.toContain("不往水里撒");
    expect(controlPlan).not.toContain("你顾药和伤口");
  });

  it("妖兽受限后会按主角所在位置渲染汇合与撤出", () => {
    const scene = getScene("monster_restrained");
    const baseProps = {
      scene,
      outcome: { narration: [], npcDialogue: [] },
      playerName: "林昭宁",
      playerProfession: "潜行修" as const,
      playerIntroduced: true,
    };
    const firstBendHtml = renderToStaticMarkup(
      createElement(OldSluiceSceneView, { ...baseProps, flags: { took_control_signal_post: true } }),
    );
    const entranceHtml = renderToStaticMarkup(
      createElement(OldSluiceSceneView, { ...baseProps, flags: { watched_control_signal: true } }),
    );

    expect(firstBendHtml).toContain("与你汇合");
    expect(firstBendHtml).toContain("你们三人一起沿灯光回到入口");
    expect(entranceHtml).toContain("他们与你在入口汇合");
  });

  it("使用权威设定中的单独到场开场", () => {
    const scene = getScene(oldSluiceData.startSceneId);
    expect(scene.presentCharacters).toEqual(["你"]);
    expect(oldSluiceData.fixedFacts.playerArrival).toContain("早到约一刻钟");
    expect(JSON.stringify(scene)).not.toContain("何炅");
    expect(JSON.stringify(scene)).not.toContain("王鸥");
  });

  it("自由探索期间不会提前出现何炅与王鸥", () => {
    const soloSceneIds = [
      "sluice_arrival",
      "after_inspect_shed",
      "after_knock_guard",
      "after_inspect_winch",
      "after_inspect_tracks",
    ];

    for (const sceneId of soloSceneIds) {
      const sceneText = JSON.stringify(getScene(sceneId));
      expect(sceneText).not.toContain("何炅");
      expect(sceneText).not.toContain("王鸥");
    }
  });
});

describe("交互节点规则", () => {
  it.each(oldSluiceData.scenes.filter((scene) => scene.interactionPoint).map((scene) => [scene.id, scene]))(
    "场景 %s 有 2—4 个选项并保留自由输入",
    (_id, scene) => {
      expect(scene.choices.length).toBeGreaterThanOrEqual(2);
      expect(scene.choices.length).toBeLessThanOrEqual(4);
      expect(scene.freeInputEnabled).toBe(true);
      expect(scene.controlPrompt).toBeTruthy();
    },
  );

  it("拒绝缺少选项的交互节点", () => {
    const validScene = oldSluiceData.scenes[0];
    const result = SceneSchema.safeParse({
      ...validScene,
      choices: [validScene.choices[0]],
    });
    expect(result.success).toBe(false);
  });

  it("所有选项只描述主角自己的控制范围", () => {
    const allowedIntents = new Set(["语言", "态度", "关系回应", "个人行动"]);
    for (const scene of oldSluiceData.scenes) {
      for (const choice of scene.choices) {
        expect(allowedIntents.has(choice.intent)).toBe(true);
        expect(choice.text).not.toMatch(/命令何炅|命令王鸥|让全队|决定全队/);
      }
    }
  });

  it("所有后续场景引用都存在，且首选项进入四条不同结果", () => {
    const sceneIds = new Set(oldSluiceData.scenes.map((scene) => scene.id));
    for (const scene of oldSluiceData.scenes) {
      for (const choice of scene.choices) {
        if (choice.nextSceneId) {
          expect(sceneIds.has(choice.nextSceneId)).toBe(true);
        }
      }
    }

    const opening = getScene(oldSluiceData.startSceneId);
    expect(new Set(opening.choices.map((choice) => choice.nextSceneId)).size).toBe(4);
  });

  it("只有主动进入检修道的探索选项会触发两名接取者出现", () => {
    const soloSceneIds = [
      "after_inspect_shed",
      "after_knock_guard",
      "after_inspect_winch",
      "after_inspect_tracks",
    ];

    for (const sceneId of soloSceneIds) {
      const scene = getScene(sceneId);
      for (const choice of scene.choices) {
        if (choice.nextSceneId === "tunnel_entry_meeting") {
          expect(choice.text).toContain("进入检修道");
        } else {
          expect(choice.nextSceneId).not.toBe("tunnel_entry_meeting");
        }
      }
    }
  });

  it("同一节点的各选项具有不同的状态后果", () => {
    for (const scene of oldSluiceData.scenes) {
      const consequences = scene.choices.map((choice) =>
        JSON.stringify({
          nextSceneId: choice.nextSceneId,
          flags: choice.effect.setFlags,
          impressions: choice.effect.impressionTags,
        }),
      );
      expect(new Set(consequences).size).toBe(consequences.length);
    }
  });

  it("何炅在完成介绍后称王鸥为“鸥”，且正文不含主持规则口吻", () => {
    const laterScenes = ["tunnel_entry_meeting", "joint_assessment"].map(getScene);
    const heLines = laterScenes.flatMap((scene) =>
      scene.npcDialogue.filter((line) => line.speakerId === "he_jiong"),
    );
    const addressingLines = heLines.filter((line) => !line.text.includes("我叫何炅"));

    expect(addressingLines.some((line) => line.text.includes("鸥"))).toBe(true);
    expect(JSON.stringify(laterScenes)).not.toContain("你不需要替我们决定");
  });

  it("选项引用的线索都在固定线索目录中", () => {
    const clueIds = new Set(
      [...oldSluiceData.initialClues, ...oldSluiceData.discoverableClues].map((clue) => clue.id),
    );
    for (const scene of oldSluiceData.scenes) {
      for (const choice of scene.choices) {
        for (const clueId of choice.effect.addClueIds) {
          expect(clueIds.has(clueId)).toBe(true);
        }
      }
    }
  });

  it("除当前开发边界外，所有交互选项都会进入下一场景", () => {
    for (const scene of oldSluiceData.scenes) {
      if (scene.id === "monster_restrained") continue;
      for (const choice of scene.choices) {
        expect(choice.nextSceneId, `${scene.id}/${choice.id}`).not.toBeNull();
      }
    }
  });

  it("三种救援位置都能救出第二名看守并重新汇合", () => {
    const routeScene = getScene("rescue_route_confirmed");
    expect(routeScene.choices.map((choice) => choice.nextSceneId)).toEqual([
      "guard_reached_inside",
      "guard_reached_relay",
      "guard_reached_surface",
    ]);

    for (const branchId of [
      "guard_reached_inside",
      "guard_reached_relay",
      "guard_reached_surface",
    ]) {
      const branch = getScene(branchId);
      expect(branch.choices.every((choice) => choice.nextSceneId === "withdrawal_converges")).toBe(
        true,
      );
      expect(
        branch.choices.every((choice) =>
          choice.effect.addClueIds.includes("clue_trapped_guard_located"),
        ),
      ).toBe(true);
    }
  });

  it("妖兽控制方案会按主角所处位置分流，并重新汇入断齿节点", () => {
    const plan = getScene("monster_control_plan");
    expect(plan.choices.map((choice) => choice.nextSceneId)).toEqual([
      "control_at_first_bend",
      "control_from_entrance",
      "control_from_entrance",
    ]);

    for (const sceneId of ["control_at_first_bend", "control_from_entrance"]) {
      const scene = getScene(sceneId);
      expect(scene.choices.every((choice) => choice.nextSceneId === "monster_restrained")).toBe(
        true,
      );
      expect(
        scene.choices.every((choice) =>
          choice.effect.addClueIds.includes("clue_broken_trap_fragment"),
        ),
      ).toBe(true);
    }
  });

  it("救援汇合后与到达饭桌后都会触发测试存档", () => {
    expect(CHECKPOINT_SCENE_IDS).toEqual(new Set(["withdrawal_converges", "post_task_meal"]));
    expect(CHECKPOINT_SCENE_IDS.has("monster_control_plan")).toBe(false);
    expect(CHECKPOINT_SCENE_IDS.has("monster_restrained")).toBe(false);
  });

  it("妖兽默认按委托处理，捕兽夹原因作为留给承务所的物证问题", () => {
    const scene = getScene("monster_restrained");
    expect(scene.npcDialogue.some((line) => line.text.includes("按委托处理掉"))).toBe(true);
    expect(scene.choices.some((choice) => choice.id === "restrained_ask_wait_investigation")).toBe(
      true,
    );
  });

  it("救援后测试存档只保留核心线索，并标记为可继续测试", () => {
    const initial = createInitialGameState({
      name: "林昭宁",
      profession: "潜行修",
      weapon: "匕首",
    });
    const checkpoint = createCheckpointSnapshot({
      ...initial,
      knownClues: [...oldSluiceData.initialClues, ...oldSluiceData.discoverableClues],
      currentSceneId: "monster_restrained",
    });
    const allowed = new Set([
      "clue_missing_cargo",
      "clue_guard_testimony",
      "clue_winch_water",
      "clue_injured_creature_tracks",
      "clue_monster_metal_wound",
    ]);

    expect(checkpoint.knownClues.length).toBeLessThan(oldSluiceData.initialClues.length + oldSluiceData.discoverableClues.length);
    expect(checkpoint.knownClues.every((clue) => allowed.has(clue.id))).toBe(true);
    expect(checkpoint.knownClues.some((clue) => clue.id === "clue_broken_trap_fragment")).toBe(false);
    expect(checkpoint.flags.checkpoint_rescue_complete).toBe(true);
    expect(checkpoint.lastFeedback).toContain("救援汇合");
  });

  it("进入控制分流时当前界面同步使用精简后的测试存档线索", () => {
    const initial = createInitialGameState({
      name: "林昭宁",
      profession: "潜行修",
      weapon: "匕首",
    });
    const rescueBranch = getScene("guard_reached_inside");
    const stateWithAllClues = {
      ...initial,
      knownClues: [...oldSluiceData.initialClues, ...oldSluiceData.discoverableClues],
    };

    const checkpointState = applyChoice(
      stateWithAllClues,
      rescueBranch.choices.find((choice) => choice.id === "inside_fit_safety_rope")!,
    );

    expect(checkpointState.currentSceneId).toBe("withdrawal_converges");
    expect(checkpointState.knownClues.map((clue) => clue.id)).toEqual([
      "clue_missing_cargo",
      "clue_guard_testimony",
      "clue_winch_water",
      "clue_injured_creature_tracks",
      "clue_monster_metal_wound",
    ]);
  });

  it("进入共餐场景时自动保存第二个测试存档，并只保留任务后关键信息", () => {
    const initial = createInitialGameState({
      name: "林昭宁",
      profession: "潜行修",
      weapon: "匕首",
    });
    const injuryState = applyChoice(initial, getScene("monster_restrained").choices[0]);
    const handoffState = applyChoice(injuryState, getScene("injury_treatment").choices[0]);
    const mealState = applyChoice(handoffState, getScene("commission_handoff").choices[0]);

    expect(mealState.currentSceneId).toBe("post_task_meal");
    expect(mealState.knownClues.map((clue) => clue.id)).toEqual([
      "clue_cargo_damage_result",
      "clue_trap_evidence_handed_over",
    ]);
    expect(mealState.flags.checkpoint_meal_ready).toBe(true);
    expect(mealState.lastFeedback).toContain("饭桌");
  });

  it("妖兽处理后会进入承务所交接、共餐并留下复查钩子", () => {
    const restrained = getScene("monster_restrained");
    expect(restrained.choices.some((choice) => choice.id === "restrained_focus_public_safety")).toBe(
      false,
    );
    expect(restrained.choices.every((choice) => choice.nextSceneId === "injury_treatment")).toBe(
      true,
    );
    expect(getScene("injury_treatment").choices.every((choice) => choice.nextSceneId === "commission_handoff")).toBe(
      true,
    );
    expect(getScene("commission_handoff").phase).toBe("承务所交接");
    expect(getScene("post_task_meal").phase).toBe("三人共餐");
    expect(getScene("post_task_meal").choices).toHaveLength(4);
    expect(getScene("recheck_hook").interactionPoint).toBe(false);
  });
});

describe("游戏状态", () => {
  const player = {
    name: "昭宁",
    profession: "潜行修" as const,
    weapon: "匕首" as const,
  };

  it("创建的新游戏状态通过 Zod 校验并保留固定身份", () => {
    const state = createInitialGameState(player);
    expect(() => GameStateSchema.parse(state)).not.toThrow();
    expect(state.player.gender).toBe("女性");
    expect(state.player.age).toBe(19);
    expect(state.relationships).toEqual([]);
    expect(state.injury.severity).toBe("无伤");
  });

  it("选项和自由输入都会写入历史，但不会替玩家补写内心", () => {
    const initial = createInitialGameState(player);
    const scene = getScene(initial.currentSceneId);
    const afterChoice = applyChoice(initial, scene.choices[0]);
    const afterInput = applyFreeInput(afterChoice, "我先听一听值守房里有没有动静。");

    expect(afterChoice.history.at(-1)?.source).toBe("选项");
    expect(afterInput.history.at(-1)?.source).toBe("自由输入");
    expect(afterInput.history.at(-1)?.text).toBe("我先听一听值守房里有没有动静。");
    expect(() => GameStateSchema.parse(afterInput)).not.toThrow();
  });

  it("后续选择会更新场景、线索与文字印象", () => {
    const initial = createInitialGameState(player);
    const opening = getScene(initial.currentSceneId);
    const afterInvestigation = applyChoice(initial, opening.choices[0]);
    const explorationScene = getScene(afterInvestigation.currentSceneId);
    const afterEntering = applyChoice(afterInvestigation, explorationScene.choices[0]);
    const meetingScene = getScene(afterEntering.currentSceneId);
    const afterResponse = applyChoice(afterEntering, meetingScene.choices[0]);

    expect(afterInvestigation.currentSceneId).toBe("after_inspect_shed");
    expect(afterInvestigation.knownClues.some((clue) => clue.id === "clue_cargo_dragged")).toBe(
      true,
    );
    expect(afterEntering.currentSceneId).toBe("tunnel_entry_meeting");
    expect(afterResponse.currentSceneId).toBe("joint_assessment");
    expect(afterResponse.relationships.map((item) => item.characterName)).toEqual([
      "何炅",
      "王鸥",
    ]);
    expect(afterResponse.relationships[0].tags).toContain("愿意沟通");
    expect(afterResponse.transitionOutcome.narration[0]).toContain("报上姓名");
    expect(afterResponse.transitionOutcome.npcDialogue).toHaveLength(2);
    expect(afterResponse.transitionOutcome.npcDialogue[0].text).toContain(
      "{{playerFormalAddress}}",
    );
  });

  it("撤离后单独处理前臂划伤，并在进入交接时保留复查状态", () => {
    const initial = createInitialGameState(player);
    const restrained = getScene("monster_restrained");
    const injuryState = applyChoice(initial, restrained.choices[0]);
    expect(injuryState.currentSceneId).toBe("injury_treatment");
    expect(injuryState.injury.severity).toBe("轻伤");
    expect(injuryState.injury.needsRecheck).toBe(true);

    const handoffState = applyChoice(injuryState, getScene("injury_treatment").choices[0]);
    expect(handoffState.currentSceneId).toBe("commission_handoff");
    expect(handoffState.injury.description).toContain("较深划口");

    const mealState = applyChoice(handoffState, getScene("commission_handoff").choices[0]);
    const finalState = applyChoice(mealState, getScene("post_task_meal").choices[0]);
    expect(finalState.currentSceneId).toBe("recheck_hook");
    expect(finalState.pendingStoryHook).toContain("徐记药材铺");
  });

  it("饭桌改称呼会记录主角已主动给出名字", () => {
    const initial = createInitialGameState(player);
    const mealState = {...initial, currentSceneId: "post_task_meal"};
    const choice = getScene("post_task_meal").choices.find(
      (item) => item.id === "meal_correct_address",
    )!;
    const finalState = applyChoice(mealState, choice);

    expect(finalState.flags.corrected_address_at_meal).toBe(true);
    expect(finalState.flags.introduced_self).toBe(true);
  });

  it("是否已经报过姓名会改变共同判断节点的自我介绍选项", () => {
    const initial = createInitialGameState(player);
    const opening = getScene(initial.currentSceneId);
    const afterInvestigation = applyChoice(initial, opening.choices[0]);
    const explorationScene = getScene(afterInvestigation.currentSceneId);
    const afterEntering = applyChoice(afterInvestigation, explorationScene.choices[0]);
    const meetingScene = getScene(afterEntering.currentSceneId);

    const introducedState = applyChoice(afterEntering, meetingScene.choices[0]);
    const anonymousState = applyChoice(afterEntering, meetingScene.choices[1]);
    const jointScene = getScene("joint_assessment");
    const introducedChoices = getVisibleChoices(jointScene, introducedState);
    const anonymousChoices = getVisibleChoices(jointScene, anonymousState);

    expect(introducedChoices).toHaveLength(3);
    expect(anonymousChoices).toHaveLength(3);
    expect(introducedChoices.some((choice) => choice.text.startsWith("报上姓名"))).toBe(false);
    expect(anonymousChoices.some((choice) => choice.text.startsWith("报上姓名"))).toBe(true);

    const introduceChoice = anonymousChoices.find((choice) => choice.text.startsWith("报上姓名"));
    expect(introduceChoice).toBeDefined();
    const afterIntroduction = applyChoice(anonymousState, introduceChoice!);
    expect(afterIntroduction.transitionOutcome.npcDialogue[0].speakerId).toBe("player");
    expect(afterIntroduction.transitionOutcome.npcDialogue[0].text).toContain(
      "{{playerProfession}}",
    );
    expect(afterIntroduction.flags.introduced_self).toBe(true);
  });
});
