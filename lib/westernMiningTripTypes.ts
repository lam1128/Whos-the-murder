import type {
  XuanjiaLizardHuntDialogueLine,
  XuanjiaLizardHuntProfession,
  XuanjiaLizardHuntVisibility,
  XuanjiaLizardHuntWeapon,
} from "./xuanjiaLizardHuntTypes";

export type WesternMiningTripProfession = XuanjiaLizardHuntProfession;
export type WesternMiningTripWeapon = XuanjiaLizardHuntWeapon;
export type WesternMiningTripVisibility = XuanjiaLizardHuntVisibility;
export type WesternMiningTripDialogueLine = XuanjiaLizardHuntDialogueLine;

export type WesternMiningTripInventoryItem = {
  id: string;
  name: string;
  description: string;
  quantity: number;
};

export type WesternMiningTripInventoryChange = {
  id: string;
  quantity: number;
  reason?: string;
};

export type WesternMiningTripSceneEffect = {
  setFlags?: Record<string, unknown>;
  addInventoryIds?: string[];
  inventoryChanges?: WesternMiningTripInventoryChange[];
  outcomeNarration?: string[];
  outcomeDialogue?: WesternMiningTripDialogueLine[];
  completion?: string;
};

export type WesternMiningTripChoice = {
  id: string;
  label: "1" | "2" | "3" | "4";
  text: string;
  nextSceneId: string | null;
  notice?: string | null;
  branchType?: string | null;
  visibility?: WesternMiningTripVisibility;
  effect?: WesternMiningTripSceneEffect;
};

export type WesternMiningTripScene = {
  id: string;
  title: string;
  phase: string;
  location: string;
  presentCharacters?: string[];
  narration: string[];
  conditionalNarration?: Array<{
    text: string;
    visibility: WesternMiningTripVisibility;
  }>;
  npcDialogue: WesternMiningTripDialogueLine[];
  conditionalDialogue?: WesternMiningTripDialogueLine[];
  onEnterEffect?: WesternMiningTripSceneEffect;
  controlPrompt: string | null;
  choices: WesternMiningTripChoice[];
  freeInputEnabled: boolean;
  terminal?: boolean;
};

export type WesternMiningTripHistoryEntry = {
  id: string;
  sceneId: string;
  source: "choice" | "free_input" | "system";
  text: string;
  createdAt: string;
};

export type WesternMiningTripTransitionOutcome = {
  narration: string[];
  npcDialogue: WesternMiningTripDialogueLine[];
};

export type WesternMiningTripState = {
  scenarioId: "chapter5_western_mining_trip";
  scenarioVersion: string;
  player: {
    name: string;
    profession: WesternMiningTripProfession;
    weapon: WesternMiningTripWeapon;
  };
  currentSceneId: string;
  flags: Record<string, unknown>;
  inventory: WesternMiningTripInventoryItem[];
  history: WesternMiningTripHistoryEntry[];
  transitionOutcome: WesternMiningTripTransitionOutcome;
  lastFeedback: string | null;
  updatedAt: string;
};

export type WesternMiningTripScenario = {
  id: string;
  title: string;
  startSceneId: string;
  scenes: WesternMiningTripScene[];
  routeOrder: string[];
  initialFlags: Record<string, unknown>;
  initialInventory: WesternMiningTripInventoryItem[];
  inventoryDefinitions: Record<string, WesternMiningTripInventoryItem>;
};
