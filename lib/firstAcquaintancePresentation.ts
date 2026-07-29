import { FirstAcquaintanceDialogueLine } from "./firstAcquaintanceTypes";

type SpeakerDefinition = {
  id: string;
  name: string;
  tokens: string[];
};

const speakers: SpeakerDefinition[] = [
  { id: "player", name: "{{playerName}}", tokens: ["主角"] },
  { id: "he_jiong", name: "何炅", tokens: ["何炅"] },
  { id: "wang_ou", name: "王鸥", tokens: ["王鸥", "她"] },
  { id: "shopkeeper_xu", name: "徐掌柜", tokens: ["徐掌柜"] },
];

const reportingPhrases = [
  "一本正经地说",
  "故作随意地说",
  "温和地解释",
  "无奈地说",
  "平常地说",
  "笑着答应",
  "自然询问",
  "明确表示",
  "立刻看向",
  "答得很自然",
  "随口问",
  "主动问",
  "笑着说",
  "笑问",
  "笑道",
  "答道",
  "接道",
  "回答",
  "解释",
  "说明",
  "表示",
  "提醒",
  "判断",
  "提议",
  "建议",
  "总结",
  "补充",
  "指出",
  "认为",
  "认同",
  "要求",
  "邀请",
  "赞同",
  "答应",
  "否认",
  "问",
  "答",
  "说",
  "让",
];

function cleanFragment(text: string): string {
  return text
    .trim()
    .replace(/^[，。；：、\s]+/u, "")
    .replace(/[：\s]+$/u, "")
    .trim();
}

function findSpeaker(context: string, fallback?: SpeakerDefinition): SpeakerDefinition | undefined {
  const cleaned = cleanFragment(context);
  let match: { speaker: SpeakerDefinition; index: number } | undefined;

  for (const speaker of speakers) {
    for (const token of speaker.tokens) {
      const index = cleaned.indexOf(token);
      if (index >= 0 && (!match || index < match.index)) {
        match = { speaker, index };
      }
    }
  }

  return match?.speaker ?? fallback;
}

function stripSpeakerToken(text: string, speaker: SpeakerDefinition): string {
  let cleaned = cleanFragment(text);
  for (const token of speaker.tokens) {
    if (cleaned.startsWith(token)) {
      cleaned = cleanFragment(cleaned.slice(token.length));
      break;
    }
  }
  return cleaned;
}

function normalizeSpeech(text: string, isQuestion: boolean): string {
  let speech = cleanFragment(text)
    .replace(/^自己/u, "我")
    .replace(/^主角/u, "你")
    .replace(/^让主角/u, "你")
    .trim();

  if (!speech) return speech;
  if (!/[。！？…]$/u.test(speech)) {
    speech += isQuestion ? "？" : "。";
  }
  return speech;
}

function parseQuotedParagraph(paragraph: string): FirstAcquaintanceDialogueLine[] {
  const quotePattern = /“([^”]+)”/gu;
  const matches = [...paragraph.matchAll(quotePattern)];
  if (matches.length === 0) return [];

  const lines: FirstAcquaintanceDialogueLine[] = [];
  let cursor = 0;
  let currentSpeaker: SpeakerDefinition | undefined;

  for (const match of matches) {
    const quoteStart = match.index ?? 0;
    const context = paragraph.slice(cursor, quoteStart);
    currentSpeaker = findSpeaker(context, currentSpeaker);
    if (!currentSpeaker) continue;

    const actionBefore = stripSpeakerToken(context, currentSpeaker);
    lines.push({
      speakerId: currentSpeaker.id,
      speakerName: currentSpeaker.name,
      text: match[1],
      ...(actionBefore ? { actionBefore } : {}),
    });
    cursor = quoteStart + match[0].length;
  }

  const suffix = cleanFragment(paragraph.slice(cursor));
  if (suffix && lines.length > 0) {
    lines[lines.length - 1].actionAfter = suffix;
  }

  return lines;
}

function parseReportedClause(clause: string): FirstAcquaintanceDialogueLine | null {
  const cleaned = cleanFragment(clause);
  const speaker = speakers.find((candidate) =>
    candidate.tokens.some((token) => cleaned.startsWith(token)),
  );
  if (!speaker) return null;

  const subjectToken = speaker.tokens.find((token) => cleaned.startsWith(token)) ?? "";
  const body = cleaned.slice(subjectToken.length);
  let report: { phrase: string; index: number } | undefined;

  for (const phrase of reportingPhrases) {
    const index = body.indexOf(phrase);
    if (index < 0) continue;
    if (!report || index < report.index || (index === report.index && phrase.length > report.phrase.length)) {
      report = { phrase, index };
    }
  }

  if (!report) return null;

  const rawSpeech = body.slice(report.index + report.phrase.length);
  const speech = normalizeSpeech(
    rawSpeech,
    report.phrase.includes("问") || report.phrase.includes("询问"),
  );
  if (!speech) return null;

  const actionLead = cleanFragment(body.slice(0, report.index));
  const expressiveReport = /笑|无奈|自然|立刻|故作|温和|一本正经/u.test(report.phrase)
    ? report.phrase
    : "";
  const actionBefore = cleanFragment([actionLead, expressiveReport].filter(Boolean).join("，"));

  return {
    speakerId: speaker.id,
    speakerName: speaker.name,
    text: speech,
    ...(actionBefore ? { actionBefore } : {}),
  };
}

function splitNarrativeParagraph(paragraph: string): string[] {
  return (paragraph.match(/[^。！？]+[。！？]?/gu) ?? [paragraph]).flatMap((sentence) =>
    sentence
      .replace(/([，；])(?=(?:主角|何炅|王鸥|徐掌柜))/gu, "$1\n")
      .split("\n")
      .map((part) => part.trim())
      .filter(Boolean),
  );
}

export function presentCanonicalNarrative(paragraphs: string[]): {
  narration: string[];
  dialogue: FirstAcquaintanceDialogueLine[];
} {
  const narration: string[] = [];
  const dialogue: FirstAcquaintanceDialogueLine[] = [];

  for (const paragraph of paragraphs) {
    const quotedLines = parseQuotedParagraph(paragraph);
    if (quotedLines.length > 0) {
      dialogue.push(...quotedLines);
      continue;
    }

    for (const clause of splitNarrativeParagraph(paragraph)) {
      const reportedLine = parseReportedClause(clause);
      if (reportedLine) {
        dialogue.push(reportedLine);
      } else {
        narration.push(clause);
      }
    }
  }

  return { narration, dialogue };
}

export function presentPlayerChoice(text: string): FirstAcquaintanceDialogueLine[] {
  const matches = [...text.matchAll(/“([^”]+)”/gu)];
  if (matches.length === 0) return [];

  const firstQuoteIndex = matches[0].index ?? 0;
  const actionBefore = cleanFragment(text.slice(0, firstQuoteIndex));
  return matches.map((match, index) => ({
    speakerId: "player",
    speakerName: "{{playerName}}",
    text: match[1],
    ...(index === 0 && actionBefore ? { actionBefore } : {}),
  }));
}