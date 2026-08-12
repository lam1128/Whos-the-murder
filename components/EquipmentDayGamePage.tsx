import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import FreeInput from "./FreeInput";
import SaveLoadControls from "./SaveLoadControls";
import XuanjiaLizardHuntOptionList from "./XuanjiaLizardHuntOptionList";
import XuanjiaLizardHuntSceneView from "./XuanjiaLizardHuntSceneView";
import {
  applyEquipmentDayChoice,
  applyEquipmentDayFreeInput,
  clearEquipmentDaySave,
  createEquipmentDayInitialState,
  EQUIPMENT_DAY_DINNER_CHECKPOINT_SAVE_KEY,
  EQUIPMENT_DAY_LUNCH_CHECKPOINT_SAVE_KEY,
  EQUIPMENT_DAY_SAVE_KEY,
  getEquipmentDayRuntimeScene,
  loadEquipmentDayCheckpointGame,
  loadEquipmentDayGame,
  saveEquipmentDayGame,
} from "../lib/equipmentDayEngine";
import {
  equipmentDayScenario,
  equipmentDaySourceVersion,
  getResolvedEquipmentDayDialogue,
  getResolvedEquipmentDayNarration,
  getVisibleEquipmentDayChoices,
} from "../lib/equipmentDayScenario";
import { EquipmentDayChoice, EquipmentDayState } from "../lib/equipmentDayTypes";

function getPresentCharacters(state: EquipmentDayState): string[] {
  const scene = getEquipmentDayRuntimeScene(state.currentSceneId);
  const resolvedDialogue = getResolvedEquipmentDayDialogue(scene, state);
  const sceneCharacters = scene.presentCharacters ?? [];
  const dialogueCharacters = resolvedDialogue.map((line) => line.speakerName);
  const mergedCharacters = ["你", ...sceneCharacters, ...dialogueCharacters];

  return mergedCharacters.filter(
    (name, index, list) => Boolean(name) && list.indexOf(name) === index,
  );
}

function getPlayerStatus(state: EquipmentDayState): { description: string; severity: string } {
  if (state.flags.equipment_day_completed) {
    return { description: "擦撞伤已恢复，新靴与刀鞘调整完成", severity: "就绪" };
  }

  if (state.flags.player_boots_purchased) {
    return { description: "身体已无大碍，正在适应新靴与更新后的佩戴方式", severity: "稳定" };
  }

  return { description: "轻微擦撞伤基本恢复，适合城内慢慢走一整天", severity: "恢复中" };
}

function getNotes(state: EquipmentDayState): Array<{ id: string; title: string; detail: string }> {
  const notes: Array<{ id: string; title: string; detail: string }> = [];

  if (state.flags.player_boots_purchased) {
    notes.push({
      id: "boots",
      title: "新靴入手",
      detail: "你第一次用自己的正式委托收入购入职业靴，开始真正形成自己的出任务配置。",
    });
  }

  if (state.flags.player_sheath_repair_completed || state.flags.player_sheath_adjusted) {
    notes.push({
      id: "sheath",
      title: "刀鞘已调整",
      detail: "旧匕首继续使用，但刀鞘软衬、防晃固定带和佩戴位置已经按潜行修习惯重新处理。",
    });
  }

  if (state.flags.wang_rib_guard_ordered || state.flags.rib_guard_commissioned) {
    notes.push({
      id: "rib-guard",
      title: "肋侧护片",
      detail: "何炅想到把玄甲薄鳞做成轻型护片，王鸥本人确认了动作需求并下了单。",
    });
  }

  if (state.flags.wuxin_basic_gear_purchased || state.flags.wu_xin_supplies_purchased) {
    notes.push({
      id: "wuxin",
      title: "吴昕的基础符具",
      detail: "吴昕已经补齐准备正式低风险委托所需的防潮符袋、纸墨和基础收纳。",
    });
  }

  if (state.flags.family_gift_purchased || state.flags.family_gift_bought) {
    notes.push({
      id: "gift",
      title: "给家里的礼物",
      detail: "你已经用第一次正式委托后的收入，给家里买了茶和熟食带回去。",
    });
  }

  if (state.flags.wang_family_background_shared) {
    notes.push({
      id: "dinner",
      title: "晚饭后的谈话",
      detail: "你和王鸥在日常里自然谈到了她独自生活的来处，而不是把那段经历变成被围观的重点。",
    });
  }

  return notes;
}

function Sidebar({ state }: { state: EquipmentDayState }) {
  const scene = getEquipmentDayRuntimeScene(state.currentSceneId);
  const notes = getNotes(state);
  const playerStatus = getPlayerStatus(state);
  const relationshipDetail =
    state.flags.relationship_context ?? state.flags.relationship_tier ?? null;

  return (
    <aside className="space-y-4">
      <section className="paper-panel p-5">
        <p className="text-xs tracking-[0.2em] text-stone-500">当前位置</p>
        <p className="mt-2 font-semibold text-stone-900">{scene.location}</p>
        <div className="mt-5 border-t border-stone-200 pt-4">
          <p className="text-xs tracking-[0.2em] text-stone-500">在场人物</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {getPresentCharacters(state).map((character) => (
              <span key={character} className="tag">
                {character}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="paper-panel p-5">
        <h2 className="section-title">已知线索</h2>
        {notes.length > 0 ? (
          <ul className="mt-4 space-y-4">
            {notes.map((note) => (
              <li key={note.id} className="border-l border-blue-300 pl-3">
                <p className="text-sm font-semibold text-stone-800">{note.title}</p>
                <p className="mt-1 text-xs leading-5 text-stone-500">{note.detail}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm leading-6 text-stone-500">
            这一章没有新案件和战斗，重要变化会体现在装备、预算和日常相处里。
          </p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <div className="paper-panel p-5">
          <h2 className="section-title">主角状态</h2>
          <div className="mt-3 flex items-center justify-between gap-4">
            <span className="text-sm text-stone-700">{playerStatus.description}</span>
            <span className="status-safe shrink-0 whitespace-nowrap text-center">
              {playerStatus.severity}
            </span>
          </div>
        </div>
        <div className="paper-panel p-5">
          <h2 className="section-title">简单背包</h2>
          <ul className="mt-3 space-y-2 text-sm text-stone-700">
            {state.inventory.length > 0 ? (
              state.inventory.map((item) => (
                <li key={item.id} className="flex justify-between gap-4">
                  <span>{item.name}</span>
                  <span className="text-stone-400">x{item.quantity}</span>
                </li>
              ))
            ) : (
              <li className="text-stone-500">空</li>
            )}
          </ul>
        </div>
      </section>

      <section className="paper-panel p-5">
        <h2 className="section-title">人物印象</h2>
        {relationshipDetail ? (
          <p className="mt-3 text-sm leading-6 text-stone-500">{String(relationshipDetail)}</p>
        ) : (
          <p className="mt-3 text-sm leading-6 text-stone-500">
            这一章更强调四个人在没有危险催促时，怎样把合作真正落回普通日常。
          </p>
        )}
      </section>
    </aside>
  );
}

function cloneStateSnapshot(source: EquipmentDayState): EquipmentDayState {
  return JSON.parse(JSON.stringify(source)) as EquipmentDayState;
}

export default function EquipmentDayGamePage() {
  const router = useRouter();
  const [state, setState] = useState<EquipmentDayState | null>(null);
  const [undoStack, setUndoStack] = useState<EquipmentDayState[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [hasSave, setHasSave] = useState(false);
  const [hasLunchCheckpoint, setHasLunchCheckpoint] = useState(false);
  const [hasDinnerCheckpoint, setHasDinnerCheckpoint] = useState(false);

  useEffect(() => {
    const loaded = loadEquipmentDayGame();
    setState(loaded);
    setHasSave(Boolean(globalThis.localStorage?.getItem(EQUIPMENT_DAY_SAVE_KEY)));
    setHasLunchCheckpoint(
      Boolean(globalThis.localStorage?.getItem(EQUIPMENT_DAY_LUNCH_CHECKPOINT_SAVE_KEY)),
    );
    setHasDinnerCheckpoint(
      Boolean(globalThis.localStorage?.getItem(EQUIPMENT_DAY_DINNER_CHECKPOINT_SAVE_KEY)),
    );
    setReady(true);
  }, []);

  const scene = useMemo(
    () => (state ? getEquipmentDayRuntimeScene(state.currentSceneId) : null),
    [state],
  );
  const visibleChoices = useMemo(
    () => (state && scene ? getVisibleEquipmentDayChoices(scene, state) : []),
    [scene, state],
  );
  const resolvedNarration = useMemo(
    () => (state && scene ? getResolvedEquipmentDayNarration(scene, state) : []),
    [scene, state],
  );
  const resolvedDialogue = useMemo(
    () => (state && scene ? getResolvedEquipmentDayDialogue(scene, state) : []),
    [scene, state],
  );

  function refreshCheckpointStatus() {
    setHasLunchCheckpoint(
      Boolean(globalThis.localStorage?.getItem(EQUIPMENT_DAY_LUNCH_CHECKPOINT_SAVE_KEY)),
    );
    setHasDinnerCheckpoint(
      Boolean(globalThis.localStorage?.getItem(EQUIPMENT_DAY_DINNER_CHECKPOINT_SAVE_KEY)),
    );
  }

  function handleChoice(choice: EquipmentDayChoice) {
    if (!state) return;
    setUndoStack((current) => [...current, cloneStateSnapshot(state)]);
    const updated = applyEquipmentDayChoice(state, choice);
    setState(updated);
    setNotice(updated.lastFeedback);
    refreshCheckpointStatus();
    globalThis.requestAnimationFrame?.(() => {
      globalThis.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function handleFreeInput(text: string) {
    if (!state) return;
    setUndoStack((current) => [...current, cloneStateSnapshot(state)]);
    const updated = applyEquipmentDayFreeInput(state, text);
    setState(updated);
    setNotice(updated.lastFeedback);
  }

  function handleSave() {
    if (!state) return;
    const saved = saveEquipmentDayGame(state);
    setState(saved);
    setHasSave(true);
    setNotice(null);
  }

  function handleLoad() {
    const loaded = loadEquipmentDayGame();
    if (!loaded) {
      setNotice("没有找到这条第四章的本地存档。");
      return;
    }
    setState(loaded);
    setUndoStack([]);
    setNotice(null);
  }

  function handleLoadLunchCheckpoint() {
    const loaded = loadEquipmentDayCheckpointGame("lunch");
    if (!loaded) {
      setNotice("没有找到第四章午饭存档。");
      return;
    }
    setState(loaded);
    setUndoStack([]);
    setNotice(null);
  }

  function handleLoadDinnerCheckpoint() {
    const loaded = loadEquipmentDayCheckpointGame("dinner");
    if (!loaded) {
      setNotice("没有找到第四章晚饭存档。");
      return;
    }
    setState(loaded);
    setUndoStack([]);
    setNotice(null);
  }

  function handleUndoTurn() {
    setUndoStack((current) => {
      if (current.length === 0) {
        setNotice("当前没有可回退的上一回合。");
        return current;
      }

      setState(current[current.length - 1]);
      setNotice(null);
      return current.slice(0, -1);
    });
  }

  function handleRestart() {
    if (!globalThis.confirm("确定重新开始这条第四章吗？这只会清除当前剧情的本地存档。")) {
      return;
    }

    clearEquipmentDaySave();
    setHasSave(false);
    setUndoStack([]);
    setState(createEquipmentDayInitialState({ name: "林昭宁" }));
    void router.push("/create-character?scenario=equipment-day");
  }

  if (!ready) {
    return <main className="grid min-h-screen place-items-center text-stone-500" />;
  }

  if (!state || !scene) {
    return (
      <>
        <Head>
          <title>第四章：添置</title>
        </Head>
        <main className="grid min-h-screen place-items-center px-6">
          <section className="paper-panel max-w-xl p-8 text-center sm:p-12">
            <p className="text-xs tracking-[0.3em] text-blue-700">第四章</p>
            <h1 className="display-title mt-4 text-4xl text-stone-900">添置</h1>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link href="/create-character?scenario=equipment-day" className="primary-button w-full">
                创建角色
                <span aria-hidden="true">→</span>
              </Link>
              <Link href="/" className="secondary-button w-full">
                返回首页
              </Link>
            </div>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{scene.title} | 第四章：添置</title>
        <meta
          name="description"
          content={`${equipmentDayScenario.title} ${equipmentDaySourceVersion}`}
        />
      </Head>
      <main className="min-h-screen px-4 py-5 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-6 flex flex-col gap-4 border-b border-stone-300 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs tracking-[0.26em] text-cyan-800">第四章</p>
              <h1 className="display-title mt-1 text-3xl text-stone-900">添置</h1>
              <p className="mt-1 text-sm text-stone-500">
                {state.player.name} · {state.player.profession} · 基础自保：匕首
              </p>
            </div>
            <SaveLoadControls
              onSave={handleSave}
              onLoad={handleLoad}
              onLoadRescueCheckpoint={handleLoadLunchCheckpoint}
              onLoadMealCheckpoint={handleLoadDinnerCheckpoint}
              onRestart={handleRestart}
              hasSave={hasSave}
              hasRescueCheckpoint={hasLunchCheckpoint}
              hasMealCheckpoint={hasDinnerCheckpoint}
              onUndoTurn={handleUndoTurn}
              hasUndoTurn={undoStack.length > 0}
              rescueCheckpointLabel="读取午饭存档"
              mealCheckpointLabel="读取晚饭存档"
            />
          </header>

          {notice ? (
            <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice(null)} aria-label="关闭提示">
                ×
              </button>
            </div>
          ) : null}

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
            <div className="space-y-5">
              <XuanjiaLizardHuntSceneView
                scene={scene}
                outcome={state.transitionOutcome}
                narration={resolvedNarration}
                dialogue={resolvedDialogue}
                playerName={state.player.name}
                playerProfession={state.player.profession}
              />
              <XuanjiaLizardHuntOptionList
                choices={visibleChoices}
                prompt={scene.controlPrompt}
                onChoose={handleChoice}
              />
              <FreeInput enabled={scene.freeInputEnabled} onSubmit={handleFreeInput} />
            </div>
            <Sidebar state={state} />
          </div>
        </div>
      </main>
    </>
  );
}
