import React from "react";
import { getDialogueClassName } from "../lib/dialoguePresentation";
import {
  FirstAcquaintanceDialogueLine,
  FirstAcquaintanceProfession,
  FirstAcquaintanceScene,
  FirstAcquaintanceTransitionOutcome,
} from "../lib/firstAcquaintanceTypes";
import { getPlayerAddress } from "../lib/playerAddress";

function groupDialogue(lines: FirstAcquaintanceDialogueLine[]): FirstAcquaintanceDialogueLine[][] {
  return lines.reduce<FirstAcquaintanceDialogueLine[][]>((groups, line) => {
    const lastGroup = groups.at(-1);
    if (lastGroup?.[0]?.speakerId === line.speakerId) {
      lastGroup.push(line);
    } else {
      groups.push([line]);
    }
    return groups;
  }, []);
}

export default function FirstAcquaintanceSceneView({
  scene,
  outcome,
  narration,
  dialogue,
  playerName,
  playerProfession,
}: {
  scene: FirstAcquaintanceScene;
  outcome: FirstAcquaintanceTransitionOutcome;
  narration?: string[];
  dialogue?: FirstAcquaintanceDialogueLine[];
  playerName: string;
  playerProfession: FirstAcquaintanceProfession;
}) {
  const playerAddress = getPlayerAddress(playerName);
  const sceneNarration = narration ?? scene.narration;
  const sceneDialogue = dialogue ?? scene.npcDialogue;

  const renderText = (text: string) =>
    text
      .replaceAll("{{playerName}}", playerName)
      .replaceAll("{{playerFormalAddress}}", playerAddress.formal)
      .replaceAll("{{playerGivenName}}", playerAddress.familiar)
      .replaceAll("{{playerPreferredAddress}}", playerAddress.familiar)
      .replaceAll("{{playerKnownAddress}}", playerAddress.formal)
      .replaceAll("{{playerFamiliarAddress}}", playerAddress.familiar)
      .replaceAll("{{playerProfession}}", playerProfession)
      .replaceAll("{{playerWeapon}}", "匕首");

  const renderSpeakerName = (line: FirstAcquaintanceDialogueLine) =>
    line.speakerId === "player" ? playerName : renderText(line.speakerName);

  const renderDialogue = (lines: FirstAcquaintanceDialogueLine[]) =>
    groupDialogue(lines).map((group, index) => {
      const firstLine = group[0];
      return (
        <div
          key={`${firstLine.speakerId}-${index}`}
          className={`dialogue-line ${getDialogueClassName(firstLine)}`}
        >
          <p className="mb-1 text-sm font-semibold text-stone-950">{renderSpeakerName(firstLine)}</p>
          <div className="space-y-1">
            {group.map((line, lineIndex) => (
              <div key={`${line.speakerId}-${lineIndex}`} className="space-y-1">
                {line.actionBefore ? (
                  <p className="leading-7 text-stone-800">{renderText(line.actionBefore)}</p>
                ) : null}
                {typeof line.text === "string" && line.text.trim() ? (
                  <p className="dialogue-text leading-7">{renderText(line.text)}</p>
                ) : null}
                {line.actionAfter ? (
                  <p className="leading-7 text-stone-800">{renderText(line.actionAfter)}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      );
    });

  return (
    <div className="space-y-5">
      {(outcome.narration.length > 0 || outcome.npcDialogue.length > 0) && (
        <section className="paper-panel overflow-hidden">
          <div className="border-b border-stone-200 px-5 py-4 sm:px-7">
            <p className="text-xs tracking-[0.24em] text-blue-700">人物对白</p>
          </div>
          {outcome.narration.length > 0 ? (
            <div className="space-y-4 px-5 py-5 text-[1.02rem] leading-8 text-stone-700 sm:px-7">
              {outcome.narration.map((paragraph, index) => (
                <p key={`${index}-${paragraph}`}>{renderText(paragraph)}</p>
              ))}
            </div>
          ) : null}
          {outcome.npcDialogue.length > 0 ? (
            <div className="space-y-3 border-t border-stone-100 px-5 py-5 sm:px-7">
              {renderDialogue(outcome.npcDialogue)}
            </div>
          ) : null}
        </section>
      )}

      <section className="paper-panel overflow-hidden">
        <div className="border-b border-stone-200 px-5 py-4 sm:px-7">
          <p className="text-xs tracking-[0.24em] text-blue-700">剧情文本</p>
          <h2 className="display-title mt-1 text-3xl text-stone-900">{scene.title}</h2>
        </div>
        <div className="space-y-4 px-5 py-6 text-[1.02rem] leading-8 text-stone-700 sm:px-7">
          {sceneNarration.map((paragraph, index) => (
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
        {sceneDialogue.length > 0 ? (
          <div className="space-y-3 px-5 py-5 sm:px-6">{renderDialogue(sceneDialogue)}</div>
        ) : null}
      </section>
    </div>
  );
}
