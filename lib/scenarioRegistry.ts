export const scenarioIds = [
  "old-sluice",
  "first-acquaintance",
  "misplaced-river-lights",
  "xuanjia-lizard-hunt",
  "equipment-day",
  "chapter5-western-mining-trip",
  "chapter6-three-year-sword-echo",
] as const;

export type ScenarioId = (typeof scenarioIds)[number];

export type ScenarioSummary = {
  id: ScenarioId;
  chapterLabel: string;
  chapterTitle: string;
  cardDescription: string;
  professionMode: "full" | "stealth-only";
  defaultProfession: "炼丹师" | "潜行修";
  defaultWeapon: "剑" | "匕首";
};

export const landingIntroduction = [
  "这是一个灵力与妖兽真实存在的世界。每个人在求学阶段都会学习一种基础自保方式——长剑、匕首、长枪，或以拳脚、步法与身体强化进行近身作战的体术。在此基础上，修士还可以选择更加专门的修炼方向，例如剑术、药毒、符术、阵法、御灵与潜行等。",
  "修士并不脱离普通人的生活。他们同样需要工作、吃饭、照顾家人，并为自己的选择承担后果。车马、舟船与书信仍是日常的一部分。",
  "故事始于一座普通小城——临川城。城东临河，南接农田与官道，北面通向妖兽活动的森林，西面则是丘陵与林木。官署维持城市秩序，承务所受理民间委托。危险并不遥远，却也没有淹没人们平静而具体的日常。你十九岁，出身临川城一个普通河运家庭，去年刚完成学业。平日只替家里跑腿、清点货物，既没有真正参与河运，也未正式接取过委托。",
];

export const scenarioSummaries: Record<ScenarioId, ScenarioSummary> = {
  "old-sluice": {
    id: "old-sluice",
    chapterLabel: "第一章",
    chapterTitle: "失踪的货箱",
    cardDescription: "从旧水闸开始，第一次真正接触承务所相关的危险委托。",
    professionMode: "full",
    defaultProfession: "炼丹师",
    defaultWeapon: "剑",
  },
  "first-acquaintance": {
    id: "first-acquaintance",
    chapterLabel: "第二章",
    chapterTitle: "妹宝！妹宝！",
    cardDescription: "延续临川城日常与委托余波，进入更贴近人物关系的一段经历。",
    professionMode: "stealth-only",
    defaultProfession: "潜行修",
    defaultWeapon: "匕首",
  },
  "misplaced-river-lights": {
    id: "misplaced-river-lights",
    chapterLabel: "第三章",
    chapterTitle: "错位的河灯",
    cardDescription: "第一次由主角主动加入四人正式委托，在熟悉的河运领域里并肩调查与救援。",
    professionMode: "full",
    defaultProfession: "炼丹师",
    defaultWeapon: "剑",
  },
  "xuanjia-lizard-hunt": {
    id: "xuanjia-lizard-hunt",
    chapterLabel: "第三章",
    chapterTitle: "玄甲林蜥",
    cardDescription: "另一条第三章路线：从第二次换药之后出发，进入三人正式材料狩猎与森林同行。",
    professionMode: "stealth-only",
    defaultProfession: "潜行修",
    defaultWeapon: "匕首",
  },
  "equipment-day": {
    id: "equipment-day",
    chapterLabel: "第四章",
    chapterTitle: "添置",
    cardDescription: "承接玄甲林蜥委托后的恢复期，在一整天的装备更新与普通同行里推进关系。",
    professionMode: "stealth-only",
    defaultProfession: "潜行修",
    defaultWeapon: "匕首",
  },
  "chapter5-western-mining-trip": {
    id: "chapter5-western-mining-trip",
    chapterLabel: "第五章",
    chapterTitle: "西原矿区换班路",
    cardDescription: "承接第四章添置装备后的护送委托，前往西原矿区完成换班与返程护送。",
    professionMode: "stealth-only",
    defaultProfession: "潜行修",
    defaultWeapon: "匕首",
  },
  "chapter6-three-year-sword-echo": {
    id: "chapter6-three-year-sword-echo",
    chapterLabel: "第六章",
    chapterTitle: "三年后的剑声",
    cardDescription: "第五章长途行动后回到临川城，在一顿饭、一场木剑和一次意外重逢里继续认识彼此的日常生活。",
    professionMode: "stealth-only",
    defaultProfession: "潜行修",
    defaultWeapon: "匕首",
  },
};

export function isScenarioId(value: string): value is ScenarioId {
  return (scenarioIds as readonly string[]).includes(value);
}

export function parseScenarioId(value: string | string[] | undefined): ScenarioId | null {
  if (typeof value !== "string") {
    return null;
  }

  return isScenarioId(value) ? value : null;
}

export function getScenarioSummary(scenarioId: ScenarioId): ScenarioSummary {
  return scenarioSummaries[scenarioId];
}
