import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import FreeInput from "./FreeInput";
import SaveLoadControls from "./SaveLoadControls";
import XuanjiaLizardHuntOptionList from "./XuanjiaLizardHuntOptionList";
import XuanjiaLizardHuntSceneView from "./XuanjiaLizardHuntSceneView";
import {
  applyWesternMiningTripChoice,
  applyWesternMiningTripFreeInput,
  clearWesternMiningTripSave,
  createWesternMiningTripInitialState,
  getWesternMiningTripRuntimeScene,
  loadWesternMiningTripGame,
  saveWesternMiningTripGame,
  WESTERN_MINING_TRIP_SAVE_KEY,
} from "../lib/westernMiningTripEngine";
import {
  getResolvedWesternMiningTripDialogue,
  getResolvedWesternMiningTripNarration,
  getVisibleWesternMiningTripChoices,
  westernMiningTripScenario,
  westernMiningTripSourceVersion,
} from "../lib/westernMiningTripScenario";
import {
  WesternMiningTripChoice,
  WesternMiningTripState,
} from "../lib/westernMiningTripTypes";

function getPresentCharacters(state: WesternMiningTripState): string[] {
  const scene = getWesternMiningTripRuntimeScene(state.currentSceneId);
  const dialogue = getResolvedWesternMiningTripDialogue(scene, state);
  return ["你", ...(scene.presentCharacters ?? []), ...dialogue.map((line) => line.speakerName)].filter(
    (name, index, list) => Boolean(name) && list.indexOf(name) === index,
  );
}

function Sidebar({ state }: { state: WesternMiningTripState }) {
  const scene = getWesternMiningTripRuntimeScene(state.currentSceneId);
  const completed = Boolean(state.flags.western_mining_trip_completed);
  const relationship = state.flags.relationship_tier ?? state.flags.relationship_context;

  return (
    <aside className="space-y-4">
      <section className="paper-panel p-5">
        <p className="text-xs tracking-[0.2em] text-stone-500">当前位置</p>
        <p className="mt-2 font-semibold text-stone-900">{scene.location}</p>
        <div className="mt-5 border-t border-stone-200 pt-4">
          <p className="text-xs tracking-[0.2em] text-stone-500">在场人物</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {getPresentCharacters(state).map((character) => (
              <span key={character} className="tag">{character}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="paper-panel p-5">
        <h2 className="section-title">已知线索</h2>
        <p className="mt-3 text-sm leading-6 text-stone-500">
          {completed
            ? "护送委托已完成，人员、主货和返程记录已经收束。"
            : "这一章的重要变化会体现在护送安排、队伍状态和返程记录里。"}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <div className="paper-panel p-5">
          <h2 className="section-title">队伍状态</h2>
          <div className="mt-3 flex items-center justify-between gap-4">
            <span className="text-sm text-stone-700">
              {String(state.flags.party_condition ?? "护送途中，保持队形")}
            </span>
            <span className="status-safe shrink-0 whitespace-nowrap text-center">
              {completed ? "已完成" : "进行中"}
            </span>
          </div>
        </div>
        <div className="paper-panel p-5">
          <h2 className="section-title">简单背包</h2>
          <ul className="mt-3 space-y-2 text-sm text-stone-700">
            {state.inventory.length > 0 ? state.inventory.map((item) => (
              <li key={item.id} className="flex justify-between gap-4">
                <span>{item.name}</span><span className="text-stone-400">x{item.quantity}</span>
              </li>
            )) : <li className="text-stone-500">空</li>}
          </ul>
        </div>
      </section>

      <section className="paper-panel p-5">
        <h2 className="section-title">人物印象</h2>
        <p className="mt-3 text-sm leading-6 text-stone-500">
          {String(relationship ?? "这次同行会把熟悉关系推进到真正的护送搭档。")}
        </p>
      </section>
    </aside>
  );
}

function cloneStateSnapshot(source: WesternMiningTripState): WesternMiningTripState {
  return JSON.parse(JSON.stringify(source)) as WesternMiningTripState;
}

export default function WesternMiningTripGamePage() {
  const router = useRouter();
  const [state, setState] = useState<WesternMiningTripState | null>(null);
  const [undoStack, setUndoStack] = useState<WesternMiningTripState[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    const loaded = loadWesternMiningTripGame();
    setState(loaded);
    setHasSave(Boolean(globalThis.localStorage?.getItem(WESTERN_MINING_TRIP_SAVE_KEY)));
    setReady(true);
  }, []);

  const scene = useMemo(
    () => (state ? getWesternMiningTripRuntimeScene(state.currentSceneId) : null),
    [state],
  );
  const visibleChoices = useMemo(
    () => (state && scene ? getVisibleWesternMiningTripChoices(scene, state) : []),
    [scene, state],
  );
  const narration = useMemo(
    () => (state && scene ? getResolvedWesternMiningTripNarration(scene, state) : []),
    [scene, state],
  );
  const dialogue = useMemo(
    () => (state && scene ? getResolvedWesternMiningTripDialogue(scene, state) : []),
    [scene, state],
  );

  function handleChoice(choice: WesternMiningTripChoice) {
    if (!state) return;
    setUndoStack((current) => [...current, cloneStateSnapshot(state)]);
    const updated = applyWesternMiningTripChoice(state, choice);
    setState(updated);
    setNotice(updated.lastFeedback);
    globalThis.requestAnimationFrame?.(() => globalThis.scrollTo({ top: 0, behavior: "smooth" }));
  }

  function handleFreeInput(text: string) {
    if (!state) return;
    setUndoStack((current) => [...current, cloneStateSnapshot(state)]);
    setState(applyWesternMiningTripFreeInput(state, text));
  }

  function handleRestart() {
    if (!globalThis.confirm("确定重新开始第五章吗？这只会清除当前剧情的本地存档。")) return;
    clearWesternMiningTripSave();
    setHasSave(false);
    setUndoStack([]);
    setState(createWesternMiningTripInitialState({ name: "林昭宁" }));
    void router.push("/create-character?scenario=chapter5-western-mining-trip");
  }

  if (!ready) return <main className="grid min-h-screen place-items-center text-stone-500" />;

  if (!state || !scene) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <section className="paper-panel max-w-xl p-8 text-center sm:p-12">
          <p className="text-xs tracking-[0.3em] text-blue-700">第五章</p>
          <h1 className="display-title mt-4 text-4xl text-stone-900">西原矿区换班路</h1>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link href="/create-character?scenario=chapter5-western-mining-trip" className="primary-button w-full">创建角色</Link>
            <Link href="/" className="secondary-button w-full">返回首页</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>{scene.title} | 第五章：西原矿区换班路</title>
        <meta name="description" content={`${westernMiningTripScenario.title} ${westernMiningTripSourceVersion}`} />
      </Head>
      <main className="min-h-screen px-4 py-5 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-6 flex flex-col gap-4 border-b border-stone-300 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs tracking-[0.26em] text-cyan-800">第五章</p>
              <h1 className="display-title mt-1 text-3xl text-stone-900">西原矿区换班路</h1>
              <p className="mt-1 text-sm text-stone-500">{state.player.name} · {state.player.profession} · 基础自保：匕首</p>
            </div>
            <SaveLoadControls
              onSave={() => { const saved = saveWesternMiningTripGame(state); setState(saved); setHasSave(true); }}
              onLoad={() => { const loaded = loadWesternMiningTripGame(); if (loaded) { setState(loaded); setUndoStack([]); } }}
              onLoadRescueCheckpoint={() => undefined}
              onLoadMealCheckpoint={() => undefined}
              onRestart={handleRestart}
              hasSave={hasSave}
              hasRescueCheckpoint={false}
              hasMealCheckpoint={false}
              onUndoTurn={() => setUndoStack((current) => { const previous = current.at(-1); if (!previous) { setNotice("当前没有可回退的上一回合。"); return current; } setState(previous); return current.slice(0, -1); })}
              hasUndoTurn={undoStack.length > 0}
              rescueCheckpointLabel="读取宿营存档"
              mealCheckpointLabel="读取返程存档"
            />
          </header>
          {notice ? <div className="mb-5 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">{notice}</div> : null}
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
            <div className="space-y-5">
              <XuanjiaLizardHuntSceneView
                scene={scene}
                outcome={state.transitionOutcome}
                narration={narration}
                dialogue={dialogue}
                playerName={state.player.name}
                playerProfession={state.player.profession}
                playerTravelNickname={String(state.flags.player_travel_nickname ?? "")}
              />
              <XuanjiaLizardHuntOptionList choices={visibleChoices} prompt={scene.controlPrompt} onChoose={handleChoice} />
              <FreeInput enabled={scene.freeInputEnabled} onSubmit={handleFreeInput} />
            </div>
            <Sidebar state={state} />
          </div>
        </div>
      </main>
    </>
  );
}
