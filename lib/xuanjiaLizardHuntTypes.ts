export type XuanjiaLizardHuntProfession = "潜行修";
export type XuanjiaLizardHuntWeapon = "匕首";

export type XuanjiaLizardHuntVisibility =
  | {
      flag: string;
      equals: boolean;
    }
  | {
      any: Array<{
        flag: string;
        equals: boolean;
      }>;
    }
  | {
      playerProfession: XuanjiaLizardHuntProfession;
    };

export type XuanjiaLizardHuntDialogueLine = {
  speakerId: string;
  speakerName: string;
  text: string;
  dialogueColorToken?: string;
  dialogueColorHex?: string;
  actionBefore?: string;
  actionAfter?: string;
  visibility?: XuanjiaLizardHuntVisibility;
};

export type XuanjiaLizardHuntInventoryItem = {
  id: string;
  name: string;
  description: string;
  quantity: number;
};

export type XuanjiaLizardHuntSceneEffect = {
  setFlags?: Record<string, unknown>;
  addInventoryIds?: string[];
  outcomeNarration?: string[];
  outcomeDialogue?: XuanjiaLizardHuntDialogueLine[];
};

export type XuanjiaLizardHuntChoice = {
  id: string;
  label: "1" | "2" | "3" | "4";
  text: string;
  nextSceneId: string | null;
  notice?: string | null;
  branchType?: string | null;
  visibility?: XuanjiaLizardHuntVisibility;
  effect?: XuanjiaLizardHuntSceneEffect;
};

export type XuanjiaLizardHuntScene = {
  id: string;
  title: string;
  phase: string;
  location: string;
  presentCharacters?: string[];
  narration: string[];
  conditionalNarration?: Array<{
    text: string;
    visibility: XuanjiaLizardHuntVisibility;
  }>;
  npcDialogue: XuanjiaLizardHuntDialogueLine[];
  conditionalDialogue?: XuanjiaLizardHuntDialogueLine[];
  onEnterEffect?: XuanjiaLizardHuntSceneEffect;
  controlPrompt: string | null;
  choices: XuanjiaLizardHuntChoice[];
  freeInputEnabled: boolean;
  terminal?: boolean;
};

export type XuanjiaLizardHuntHistoryEntry = {
  id: string;
  sceneId: string;
  source: "choice" | "free_input" | "system";
  text: string;
  createdAt: string;
};

export type XuanjiaLizardHuntTransitionOutcome = {
  narration: string[];
  npcDialogue: XuanjiaLizardHuntDialogueLine[];
};

export type XuanjiaLizardHuntState = {
  player: {
    name: string;
    profession: XuanjiaLizardHuntProfession;
    weapon: XuanjiaLizardHuntWeapon;
  };
  currentSceneId: string;
  flags: Record<string, unknown>;
  inventory: XuanjiaLizardHuntInventoryItem[];
  history: XuanjiaLizardHuntHistoryEntry[];
  transitionOutcome: XuanjiaLizardHuntTransitionOutcome;
  lastFeedback: string | null;
  updatedAt: string;
};

export type XuanjiaLizardHuntScenario = {
  id: string;
  title: string;
  startSceneId: string;
  scenes: XuanjiaLizardHuntScene[];
  routeOrder: string[];
  initialFlags: Record<string, unknown>;
  initialInventory: XuanjiaLizardHuntInventoryItem[];
  inventoryDefinitions: Record<string, XuanjiaLizardHuntInventoryItem>;
};
