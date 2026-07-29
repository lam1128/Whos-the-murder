export type FirstAcquaintanceProfession = "潜行修";
export type FirstAcquaintanceWeapon = "匕首";

export type FirstAcquaintanceDialogueLine = {
  speakerId: string;
  speakerName: string;
  text: string;
  actionBefore?: string;
  actionAfter?: string;
};

export type FirstAcquaintanceChoice = {
  id: string;
  label: "1" | "2" | "3" | "4";
  text: string;
  nextSceneId: string | null;
  notice?: string | null;
  isSelectedPath?: boolean;
  branchType?: string | null;
  effect?: {
    setFlags?: Record<string, unknown>;
    outcomeNarration?: string[];
    outcomeDialogue?: FirstAcquaintanceDialogueLine[];
  };
};

export type FirstAcquaintanceScene = {
  id: string;
  title: string;
  phase: string;
  location: string;
  presentCharacters?: string[];
  narration: string[];
  npcDialogue: FirstAcquaintanceDialogueLine[];
  controlPrompt: string | null;
  choices: FirstAcquaintanceChoice[];
  freeInputEnabled: boolean;
  terminal?: boolean;
};

export type FirstAcquaintanceHistoryEntry = {
  id: string;
  sceneId: string;
  source: "choice" | "free_input" | "system";
  text: string;
  createdAt: string;
};

export type FirstAcquaintanceTransitionOutcome = {
  narration: string[];
  npcDialogue: FirstAcquaintanceDialogueLine[];
};

export type FirstAcquaintanceState = {
  player: {
    name: string;
    profession: FirstAcquaintanceProfession;
    weapon: FirstAcquaintanceWeapon;
  };
  currentSceneId: string;
  flags: Record<string, unknown>;
  history: FirstAcquaintanceHistoryEntry[];
  transitionOutcome: FirstAcquaintanceTransitionOutcome;
  lastFeedback: string | null;
  updatedAt: string;
};

export type FirstAcquaintanceScenario = {
  id: string;
  title: string;
  startSceneId: string;
  scenes: FirstAcquaintanceScene[];
  routeOrder: string[];
  initialFlags: Record<string, unknown>;
};
