export type MisplacedRiverLightsProfession = "炼丹师" | "机关傀儡师" | "潜行修";
export type MisplacedRiverLightsWeapon = "剑" | "匕首" | "枪" | "体";

export type MisplacedRiverLightsVisibility =
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
      playerProfession: MisplacedRiverLightsProfession;
    };

export type MisplacedRiverLightsDialogueLine = {
  speakerId: string;
  speakerName: string;
  text: string;
  actionBefore?: string;
  actionAfter?: string;
  visibility?: MisplacedRiverLightsVisibility;
};

export type MisplacedRiverLightsSceneEffect = {
  setFlags?: Record<string, unknown>;
  outcomeNarration?: string[];
  outcomeDialogue?: MisplacedRiverLightsDialogueLine[];
};

export type MisplacedRiverLightsChoice = {
  id: string;
  label: "1" | "2" | "3" | "4";
  text: string;
  nextSceneId: string | null;
  notice?: string | null;
  branchType?: string | null;
  visibility?: MisplacedRiverLightsVisibility;
  effect?: MisplacedRiverLightsSceneEffect;
};

export type MisplacedRiverLightsScene = {
  id: string;
  title: string;
  phase: string;
  location: string;
  presentCharacters?: string[];
  narration: string[];
  conditionalNarration?: Array<{
    text: string;
    visibility: MisplacedRiverLightsVisibility;
  }>;
  npcDialogue: MisplacedRiverLightsDialogueLine[];
  conditionalDialogue?: MisplacedRiverLightsDialogueLine[];
  onEnterEffect?: MisplacedRiverLightsSceneEffect;
  controlPrompt: string | null;
  choices: MisplacedRiverLightsChoice[];
  freeInputEnabled: boolean;
  terminal?: boolean;
};

export type MisplacedRiverLightsHistoryEntry = {
  id: string;
  sceneId: string;
  source: "choice" | "free_input" | "system";
  text: string;
  createdAt: string;
};

export type MisplacedRiverLightsTransitionOutcome = {
  narration: string[];
  npcDialogue: MisplacedRiverLightsDialogueLine[];
};

export type MisplacedRiverLightsInventoryItem = {
  id: string;
  name: string;
  description: string;
  quantity: number;
};

export type MisplacedRiverLightsState = {
  player: {
    name: string;
    profession: MisplacedRiverLightsProfession;
    weapon: MisplacedRiverLightsWeapon;
  };
  currentSceneId: string;
  flags: Record<string, unknown>;
  inventory: MisplacedRiverLightsInventoryItem[];
  history: MisplacedRiverLightsHistoryEntry[];
  transitionOutcome: MisplacedRiverLightsTransitionOutcome;
  lastFeedback: string | null;
  updatedAt: string;
};

export type MisplacedRiverLightsScenario = {
  id: string;
  title: string;
  startSceneId: string;
  scenes: MisplacedRiverLightsScene[];
  routeOrder: string[];
  initialFlags: Record<string, unknown>;
  initialInventory: MisplacedRiverLightsInventoryItem[];
  sidebarNotes: Array<{
    id: string;
    flag: string;
    title: string;
    detail: string;
  }>;
};
