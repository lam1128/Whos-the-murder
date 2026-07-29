import { z } from "zod";

export const ProfessionSchema = z.enum(["炼丹师", "机关傀儡师", "潜行修"]);
export const WeaponSchema = z.enum(["剑", "匕首", "枪", "体"]);

export const DialogueLineSchema = z.object({
  speakerId: z.string().min(1),
  speakerName: z.string().min(1),
  actionBefore: z.string().min(1).optional(),
  text: z.string().min(1),
  actionAfter: z.string().min(1).optional(),
});

export const ChoiceEffectSchema = z.object({
  addClueIds: z.array(z.string().min(1)).default([]),
  addInventoryIds: z.array(z.string().min(1)).default([]),
  setFlags: z.record(z.string(), z.boolean()).default({}),
  outcomeNarration: z.array(z.string().min(1)).default([]),
  outcomeDialogue: z.array(DialogueLineSchema).default([]),
  impressionTags: z
    .array(
      z.object({
        characterId: z.string().min(1),
        tag: z.string().min(1),
        evidence: z.string().min(1),
      }),
    )
    .default([]),
});

const VisibilityConditionSchema = z.object({
  flag: z.string().min(1),
  equals: z.boolean(),
});

export const ChoiceSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  intent: z.enum(["语言", "态度", "关系回应", "个人行动", "专业行动", "个人选择"]),
  nextSceneId: z.string().min(1).nullable(),
  visibility: z
    .union([
      VisibilityConditionSchema,
      z.object({
        any: z.array(VisibilityConditionSchema).min(1),
      }),
      z.object({
        playerProfession: ProfessionSchema,
      }),
    ])
    .optional(),
  effect: ChoiceEffectSchema.default({
    addClueIds: [],
    addInventoryIds: [],
    setFlags: {},
    outcomeNarration: [],
    outcomeDialogue: [],
    impressionTags: [],
  }),
});

export const SceneSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    phase: z.enum([
      "序章",
      "旧水闸现场",
      "承务所交接",
      "三人共餐",
      "任务后收束",
      "任务后共餐",
      "结束",
    ]),
    location: z.string().min(1),
    presentCharacters: z.array(z.string().min(1)),
    narration: z.array(z.string().min(1)).min(1),
    npcDialogue: z.array(DialogueLineSchema).default([]),
    interactionPoint: z.boolean(),
    controlPrompt: z.string().min(1).nullable(),
    choices: z.array(ChoiceSchema),
    freeInputEnabled: z.boolean(),
  })
  .superRefine((scene, context) => {
    if (scene.interactionPoint && (scene.choices.length < 2 || scene.choices.length > 6)) {
      context.addIssue({
        code: "custom",
        path: ["choices"],
        message: "交互节点必须提供 2—6 个选项",
      });
    }
    if (scene.interactionPoint && !scene.freeInputEnabled) {
      context.addIssue({
        code: "custom",
        path: ["freeInputEnabled"],
        message: "交互节点必须允许自由输入",
      });
    }
    if (!scene.interactionPoint && scene.choices.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["choices"],
        message: "非交互场景不应包含玩家选项",
      });
    }
  });

export const RelationshipImpressionSchema = z.object({
  characterId: z.string().min(1),
  characterName: z.string().min(1),
  tags: z.array(z.string().min(1)),
  evidence: z.array(z.string().min(1)),
  updatedAt: z.string().datetime(),
});

export const ClueSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().min(1),
  discoveredInSceneId: z.string().min(1),
});

export const InventoryItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const InjurySchema = z.object({
  location: z.string().min(1),
  severity: z.enum(["无伤", "轻伤", "中伤", "重伤"]),
  description: z.string().min(1),
  treatment: z.string().min(1).nullable(),
  needsRecheck: z.boolean(),
});

export const HistoryEntrySchema = z.object({
  id: z.string().min(1),
  sceneId: z.string().min(1),
  source: z.enum(["选项", "自由输入", "系统"]),
  text: z.string().min(1),
  createdAt: z.string().datetime(),
});

export const TransitionOutcomeSchema = z.object({
  narration: z.array(z.string().min(1)).default([]),
  npcDialogue: z.array(DialogueLineSchema).default([]),
});

export const GameStateSchema = z.object({
  schemaVersion: z.literal(1),
  saveVersion: z.number().int().nonnegative(),
  player: z.object({
    name: z.string().trim().min(1).max(12),
    profession: ProfessionSchema,
    weapon: WeaponSchema,
    gender: z.literal("女性"),
    age: z.literal(19),
    heightCm: z.literal(165),
    hair: z.literal("长发"),
    background: z.literal("临川城普通河运家庭"),
    currentStatus: z.literal("已经完成学业，但尚未正式参加过危险委托"),
  }),
  phase: z.enum([
    "序章",
    "旧水闸现场",
    "承务所交接",
    "三人共餐",
    "任务后收束",
    "任务后共餐",
    "结束",
  ]),
  currentSceneId: z.string().min(1),
  location: z.string().min(1),
  presentCharacters: z.array(z.string().min(1)),
  knownClues: z.array(ClueSchema),
  injury: InjurySchema,
  inventory: z.array(InventoryItemSchema),
  relationships: z.array(RelationshipImpressionSchema),
  flags: z.record(z.string(), z.boolean()),
  history: z.array(HistoryEntrySchema),
  transitionOutcome: TransitionOutcomeSchema.default({
    narration: [],
    npcDialogue: [],
  }),
  pendingStoryHook: z.string().min(1).nullable(),
  lastFeedback: z.string().min(1).nullable(),
  updatedAt: z.string().datetime(),
});

export const OldSluiceDataSchema = z.object({
  metadata: z.object({
    id: z.enum(["old_sluice", "old_sluice_v1"]),
    title: z.string().min(1),
    knowledgeVersion: z.literal("6.0"),
    canonicalSource: z.literal("project_knowledge_v6.0.json"),
    extractionScope: z.string().min(1),
  }),
  canonicalRules: z.object({
    playerRole: z.string().min(1),
    npcAutonomy: z.string().min(1),
    informationBoundary: z.string().min(1),
    eventTruth: z.string().min(1),
    closure: z.string().min(1),
    recheckHook: z.string().min(1),
  }),
  playerCreation: z.object({
    worldIntroduction: z.array(z.string().min(1)).min(1),
    professions: z.array(ProfessionSchema).length(3),
    weapons: z.array(WeaponSchema).length(4),
    stealthWeapon: z.literal("匕首"),
  }),
  fixedFacts: z.object({
    playerArrival: z.string().min(1),
    missingCargo: z.array(z.string().min(1)).length(2),
    guards: z.array(z.string().min(1)).length(2),
    monster: z.string().min(1),
    winchCause: z.string().min(1),
  }),
  initialClues: z.array(ClueSchema),
  discoverableClues: z.array(ClueSchema),
  initialInventory: z.array(InventoryItemSchema),
  startSceneId: z.string().min(1),
  scenes: z.array(SceneSchema).min(1),
});

export type Profession = z.infer<typeof ProfessionSchema>;
export type Weapon = z.infer<typeof WeaponSchema>;
export type Choice = z.infer<typeof ChoiceSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type RelationshipImpression = z.infer<typeof RelationshipImpressionSchema>;
export type TransitionOutcome = z.infer<typeof TransitionOutcomeSchema>;
export type GameState = z.infer<typeof GameStateSchema>;
export type OldSluiceData = z.infer<typeof OldSluiceDataSchema>;
