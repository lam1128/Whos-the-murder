export type DialogueColorLine = {
  speakerId: string;
  dialogueColorToken?: string;
};

export function getDialogueClassName(line: DialogueColorLine): string {
  if (line.speakerId === "player") return "dialogue-player";
  if (line.speakerId === "he_jiong") return "dialogue-he";
  if (line.speakerId === "wang_ou") return "dialogue-wang";
  if (line.speakerId === "wu_xin") return "dialogue-wu";
  if (line.speakerId === "sa_beining") return "dialogue-sa";
  return "dialogue-neutral";
}
