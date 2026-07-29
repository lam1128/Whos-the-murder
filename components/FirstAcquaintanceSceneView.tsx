import React from "react";
import { getPlayerAddress } from "../lib/playerAddress";
import {
  FirstAcquaintanceDialogueLine,
  FirstAcquaintanceProfession,
  FirstAcquaintanceScene,
  FirstAcquaintanceTransitionOutcome,
} from "../lib/firstAcquaintanceTypes";

export default function FirstAcquaintanceSceneView({
  scene,
  outcome,
  playerName,
  playerProfession,
}: {
  scene: FirstAcquaintanceScene;
  outcome: FirstAcquaintanceTransitionOutcome;
  playerName: string;
  playerProfession: FirstAcquaintanceProfession;
}) {
  const playerAddress = getPlayerAddress(playerName);

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

  const renderDialogue = (lines: FirstAcquaintanceDialogueLine[]) => {
    const groups = lines.reduce<FirstAcquaintanceDialogueLine[][]>((result, line) => {
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
      const speakerClass =
        firstLine.speakerId === "he_jiong"
          ? "dialogue-he"
          : firstLine.speakerId === "wang_ou"
            ? "dialogue-wang"
            : firstLine.speakerId === "wu_xin"
              ? "dialogue-wu"
            : firstLine.speakerId === "player"
              ? "dialogue-player"
              : "dialogue-neutral";

      return (
        <div key={`${firstLine.speakerId}-${index}`} className={`dialogue-line ${speakerClass}`}>
          <p className="mb-1 text-sm font-semibold text-stone-950">
            {renderText(firstLine.speakerName)}
          </p>
          <div className="space-y-1">
            {group.map((line, lineIndex) => (
              <div key={`${line.speakerId}-${lineIndex}`} className="space-y-1">
                {line.actionBefore ? (
                  <p className="leading-7 text-stone-800">{renderText(line.actionBefore)}</p>
                ) : null}
                <p className="dialogue-text leading-7">{renderText(line.text)}</p>
                {line.actionAfter ? (
                  <p className="leading-7 text-stone-800">{renderText(line.actionAfter)}</p>
                ) : null}
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
          <p className="text-xs tracking-[0.24em] text-blue-700">{scene.phase}</p>
          <h2 className="display-title mt-1 text-3xl text-stone-900">{scene.title}</h2>
        </div>
        <div className="space-y-4 px-5 py-6 text-[1.02rem] leading-8 text-stone-700 sm:px-7">
          {scene.narration.map((paragraph, index) => (
            <p key={`${index}-${paragraph}`}>{renderText(paragraph)}</p>
          ))}
        </div>
      </section>

      <section className="paper-panel p-5 sm:p-6" aria-labelledby="dialogue-title">
        <div className="mb-4">
          <h3 id="dialogue-title" className="section-title">
            人物对白
          </h3>
        </div>
        {scene.npcDialogue.length > 0 ? (
          <div className="space-y-3">{renderDialogue(scene.npcDialogue)}</div>
        ) : (
          <p className="rounded-lg border border-dashed border-stone-300 px-4 py-5 text-sm text-stone-500">
            这一段暂时没有额外对白，更多变化会落在你的下一次回应里。
          </p>
        )}
      </section>
    </div>
  );
}
