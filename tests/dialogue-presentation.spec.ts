import { describe, expect, it } from "vitest";
import { getDialogueClassName } from "../lib/dialoguePresentation";
import { westernMiningTripScenario } from "../lib/westernMiningTripScenario";

describe("对白颜色映射", () => {
  it("给主要人物使用专属颜色，其他人物统一为灰色", () => {
    expect(getDialogueClassName({ speakerId: "he_jiong", dialogueColorToken: "blue" })).toBe(
      "dialogue-he",
    );
    expect(getDialogueClassName({ speakerId: "wang_ou", dialogueColorToken: "pink" })).toBe(
      "dialogue-wang",
    );
    expect(getDialogueClassName({ speakerId: "wu_xin", dialogueColorToken: "purple" })).toBe(
      "dialogue-wu",
    );
    expect(getDialogueClassName({ speakerId: "player", dialogueColorToken: "neutral" })).toBe(
      "dialogue-player",
    );
    expect(getDialogueClassName({ speakerId: "sa_beining", dialogueColorToken: "orange" })).toBe(
      "dialogue-sa",
    );
    expect(getDialogueClassName({ speakerId: "han_ming", dialogueColorToken: "green" })).toBe(
      "dialogue-neutral",
    );
    expect(getDialogueClassName({ speakerId: "tang_xiaoman", dialogueColorToken: "amber" })).toBe(
      "dialogue-neutral",
    );
  });

  it("第五章的新增人物对白不抢占核心人物颜色", () => {
    const lines = westernMiningTripScenario.scenes.flatMap((scene) => [
      ...scene.npcDialogue,
      ...(scene.conditionalDialogue ?? []),
      ...scene.choices.flatMap((choice) => choice.effect?.outcomeDialogue ?? []),
    ]);

    expect(lines.some((line) => line.speakerId === "han_ming")).toBe(true);
    expect(lines.some((line) => line.speakerId === "tang_xiaoman")).toBe(true);
    expect(lines.some((line) => line.speakerId === "zhao_cheng")).toBe(true);
    for (const line of lines.filter((line) => !["he_jiong", "wang_ou", "wu_xin", "player"].includes(line.speakerId))) {
      expect(getDialogueClassName(line)).toBe("dialogue-neutral");
    }
  });
});
