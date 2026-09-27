import React from "react";
import { getDialogueClassName } from "../lib/dialoguePresentation";
import { Profession, Scene, TransitionOutcome } from "../lib/oldSluiceTypes";
import { getPlayerAddress } from "../lib/playerAddress";

export default function OldSluiceSceneView({
  scene,
  outcome,
  playerName,
  playerProfession,
  playerIntroduced,
  flags,
}: {
  scene: Scene;
  outcome: TransitionOutcome;
  playerName: string;
  playerProfession: Profession;
  playerIntroduced: boolean;
  flags: Record<string, boolean>;
}) {
  const skillSummaries: Record<Profession, string> = {
    炼丹师: "我能判断常见材料和污浊，也会做简单的应急处理。",
    机关傀儡师: "我能看绳索、齿轮和简单机关，也会使用基础工具。",
    潜行修: "我擅长控制脚步、观察出入口，也能做短距离侦察。",
  };
  const playerAddress = getPlayerAddress(playerName);
  const renderText = (text: string) =>
    text
      .replaceAll("{{playerName}}", playerName)
      .replaceAll("{{playerFormalAddress}}", playerAddress.formal)
      .replaceAll("{{playerGivenName}}", playerAddress.familiar)
      .replaceAll("{{playerKnownAddress}}", playerIntroduced ? playerAddress.formal : "姑娘")
      .replaceAll("{{playerPreferredAddress}}", playerAddress.familiar)
      .replaceAll("{{playerFamiliarAddress}}", playerIntroduced ? playerAddress.familiar : "姑娘")
      .replaceAll("{{rescueHandoffActors}}", flags.secured_trapped_guard ? "你和王鸥" : "何炅和王鸥")
      .replaceAll(
        "{{controlRetreatSummary}}",
        flags.took_control_signal_post ||
          flags.lit_control_retreat ||
          flags.cleared_control_rope ||
          flags.warned_wang_turn
          ? "何炅和王鸥退到第一道弯，与你汇合。确认妖兽已被迟缓药和粗绳可靠限制、暂时起不了身后，你们三人一起沿灯光回到入口，再走出检修道。"
          : "何炅和王鸥退回入口。确认妖兽已被迟缓药和粗绳可靠限制、暂时起不了身后，他们与你在入口汇合，再一起走出检修道。",
      )
      .replaceAll(
        "{{controlMeetingLocation}}",
        flags.took_control_signal_post ||
          flags.lit_control_retreat ||
          flags.cleared_control_rope ||
          flags.warned_wang_turn
          ? "第一道弯口"
          : "入口",
      )
      .replaceAll("{{playerProfession}}", playerProfession)
      .replaceAll("{{playerSkillSummary}}", skillSummaries[playerProfession]);
  const renderSpeakerName = (line: Scene["npcDialogue"][number]) =>
    line.speakerId === "player" ? playerName : renderText(line.speakerName);

  const renderDialogue = (lines: Scene["npcDialogue"]) => {
    const groups = lines.reduce<(typeof lines)[]>((result, line) => {
      const lastGroup = result.at(-1);
      if (lastGroup?.[0]?.speakerId === line.speakerId) {
        lastGroup.push(line);
      } else {
        result.push([line]);
      }
      return result;
    }, []);

    return groups.map((group, index) => {
      const firstLine = group[0];
      const speakerClass = getDialogueClassName(firstLine);

      return (
        <div
          key={`${firstLine.speakerId}-${index}`}
          className={`dialogue-line ${speakerClass}`}
        >
          <p className="mb-1 text-sm font-semibold text-stone-950">{renderSpeakerName(firstLine)}</p>
          <div className="space-y-1">
            {group.map((line, lineIndex) => (
              <div key={`${line.speakerId}-${lineIndex}`} className="space-y-1">
                {line.actionBefore && (
                  <p className="leading-7 text-stone-800">{renderText(line.actionBefore)}</p>
                )}
                <p className="dialogue-text leading-7">{renderText(line.text)}</p>
                {line.actionAfter && (
                  <p className="leading-7 text-stone-800">{renderText(line.actionAfter)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="space-y-5">
      {(outcome.narration.length > 0 || outcome.npcDialogue.length > 0) && (
        <section className="paper-panel overflow-hidden">
          <div className="border-b border-stone-200 px-5 py-4 sm:px-7">
            <p className="text-xs tracking-[0.24em] text-blue-700">人物对白</p>
          </div>
          {outcome.narration.length > 0 && (
            <div className="space-y-4 px-5 py-5 text-[1.02rem] leading-8 text-stone-700 sm:px-7">
              {outcome.narration.map((paragraph, index) => (
                <p key={`${index}-${paragraph}`}>{renderText(paragraph)}</p>
              ))}
            </div>
          )}
          {outcome.npcDialogue.length > 0 && (
            <div className="space-y-3 border-t border-stone-100 px-5 py-5 sm:px-7">
              {renderDialogue(outcome.npcDialogue)}
            </div>
          )}
        </section>
      )}

      <section className="paper-panel overflow-hidden">
        <div className="border-b border-stone-200 px-5 py-4 sm:px-7">
          <p className="text-xs tracking-[0.24em] text-blue-700">剧情文本</p>
          <h2 className="display-title mt-1 text-3xl text-stone-900">{scene.title}</h2>
        </div>
        <div className="space-y-4 px-5 py-6 text-[1.02rem] leading-8 text-stone-700 sm:px-7">
          {[scene.phase, ...scene.narration].map((paragraph, index) => (
            <p key={`${index}-${paragraph}`}>{renderText(paragraph)}</p>
          ))}
        </div>
      </section>

      <section className="paper-panel overflow-hidden" aria-labelledby="dialogue-title">
        <div className="border-b border-stone-200 px-5 py-4 sm:px-7">
          <p id="dialogue-title" className="text-xs tracking-[0.24em] text-blue-700">
            人物对白
          </p>
        </div>
        {scene.npcDialogue.length > 0 ? (
          <div className="space-y-3 px-5 py-5 sm:px-6">{renderDialogue(scene.npcDialogue)}</div>
        ) : (
          <p className="px-5 py-5 text-sm leading-6 text-stone-500 sm:px-6">
            这里暂时没有其他人回应。风穿过破损栅门，远处只有持续的水声。
          </p>
        )}
      </section>
    </div>
  );
}
