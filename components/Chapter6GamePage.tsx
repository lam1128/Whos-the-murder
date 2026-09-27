import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import FreeInput from "./FreeInput";
import SaveLoadControls from "./SaveLoadControls";
import XuanjiaLizardHuntOptionList from "./XuanjiaLizardHuntOptionList";
import XuanjiaLizardHuntSceneView from "./XuanjiaLizardHuntSceneView";
import {
  applyChapter6Choice,
  applyChapter6FreeInput,
  CHAPTER6_SAVE_KEY,
  clearChapter6Save,
  createChapter6InitialState,
  getChapter6RuntimeScene,
  loadChapter6Game,
  saveChapter6Game,
  Chapter6State,
} from "../lib/chapter6Engine";
import {
  chapter6Scenario,
  chapter6SourceVersion,
  getChapter6Dialogue,
  getChapter6Narration,
  getVisibleChapter6Choices,
} from "../lib/chapter6Scenario";
import { XuanjiaLizardHuntChoice } from "../lib/xuanjiaLizardHuntTypes";

function getPresentCharacters(state: Chapter6State): string[] {
  const scene = getChapter6RuntimeScene(state.currentSceneId);
  const dialogue = getChapter6Dialogue(scene, state);
  return ["你", ...(scene.presentCharacters ?? []), ...dialogue.map((line) => line.speakerName)].filter(
    (name, index, list) => Boolean(name) && list.indexOf(name) === index,
  );
}

function Sidebar({ state }: { state: Chapter6State }) {
  const scene = getChapter6RuntimeScene(state.currentSceneId);
  const completed = Boolean(state.flags.chapter6_three_year_sword_echo_completed);

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
        <h2 className="section-title">章节状态</h2>
        <p className="mt-3 text-sm leading-6 text-stone-500">
          {completed
            ? "本章已收束：重逢、木剑切磋与一天的同行都已完成。"
            : "本章不接取正式委托，重点是城市日常、人物重逢与关系细节。"}
        </p>
      </section>

      <section className="paper-panel p-5">
        <h2 className="section-title">简单背包</h2>
        <ul className="mt-3 space-y-2 text-sm text-stone-700">
          {state.inventory.length > 0 ? state.inventory.map((item) => (
            <li key={item.id} className="flex justify-between gap-4">
              <span>{item.name}</span><span className="text-stone-400">x{item.quantity}</span>
            </li>
          )) : <li className="text-stone-500">空</li>}
        </ul>
      </section>
    </aside>
  );
}

function cloneStateSnapshot(source: Chapter6State): Chapter6State {
  return JSON.parse(JSON.stringify(source)) as Chapter6State;
}

export default function Chapter6GamePage() {
  const router = useRouter();
  const [state, setState] = useState<Chapter6State | null>(null);
  const [undoStack, setUndoStack] = useState<Chapter6State[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    const loaded = loadChapter6Game();
    setState(loaded);
    setHasSave(Boolean(globalThis.localStorage?.getItem(CHAPTER6_SAVE_KEY)));
    setReady(true);
  }, []);

  const scene = useMemo(
    () => (state ? getChapter6RuntimeScene(state.currentSceneId) : null),
    [state],
  );
  const visibleChoices = useMemo(
    () => (state && scene ? getVisibleChapter6Choices(scene, state) : []),
    [scene, state],
  );
  const narration = useMemo(
    () => (state && scene ? getChapter6Narration(scene, state) : []),
    [scene, state],
  );
  const dialogue = useMemo(
    () => (state && scene ? getChapter6Dialogue(scene, state) : []),
    [scene, state],
  );

  function handleChoice(choice: XuanjiaLizardHuntChoice) {
    if (!state) return;
    setUndoStack((current) => [...current, cloneStateSnapshot(state)]);
    const updated = applyChapter6Choice(state, choice);
    setState(updated);
    setNotice(updated.lastFeedback);
    globalThis.requestAnimationFrame?.(() => globalThis.scrollTo({ top: 0, behavior: "smooth" }));
  }

  function handleFreeInput(text: string) {
    if (!state) return;
    setUndoStack((current) => [...current, cloneStateSnapshot(state)]);
    setState(applyChapter6FreeInput(state, text));
  }

  function handleRestart() {
    if (!globalThis.confirm("确定重新开始第六章吗？这只会清除当前章节的本地存档。")) return;
    clearChapter6Save();
    setHasSave(false);
    setUndoStack([]);
    setState(createChapter6InitialState({ name: "林昭宁" }));
    void router.push("/create-character?scenario=chapter6-three-year-sword-echo");
  }

  if (!ready) return <main className="grid min-h-screen place-items-center text-stone-500" />;

  if (!state || !scene) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <section className="paper-panel max-w-xl p-8 text-center sm:p-12">
          <p className="text-xs tracking-[0.3em] text-blue-700">第六章</p>
          <h1 className="display-title mt-4 text-4xl text-stone-900">三年后的剑声</h1>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link href="/create-character?scenario=chapter6-three-year-sword-echo" className="primary-button w-full">创建角色</Link>
            <Link href="/" className="secondary-button w-full">返回首页</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>{scene.title} | 第六章：三年后的剑声</title>
        <meta name="description" content={`${chapter6Scenario.title} ${chapter6SourceVersion}`} />
      </Head>
      <main className="min-h-screen px-4 py-5 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-6 flex flex-col gap-4 border-b border-stone-300 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs tracking-[0.26em] text-cyan-800">第六章</p>
              <h1 className="display-title mt-1 text-3xl text-stone-900">三年后的剑声</h1>
              <p className="mt-1 text-sm text-stone-500">{state.player.name} · {state.player.profession} · 基础自保：匕首</p>
            </div>
            <SaveLoadControls
              onSave={() => { const saved = saveChapter6Game(state); setState(saved); setHasSave(true); }}
              onLoad={() => { const loaded = loadChapter6Game(); if (loaded) { setState(loaded); setUndoStack([]); } }}
              onLoadRescueCheckpoint={() => undefined}
              onLoadMealCheckpoint={() => undefined}
              onRestart={handleRestart}
              hasSave={hasSave}
              hasRescueCheckpoint={false}
              hasMealCheckpoint={false}
              onUndoTurn={() => setUndoStack((current) => {
                const previous = current.at(-1);
                if (!previous) { setNotice("当前没有可回退的上一回合。"); return current; }
                setState(previous);
                return current.slice(0, -1);
              })}
              hasUndoTurn={undoStack.length > 0}
              rescueCheckpointLabel="读取章节存档"
              mealCheckpointLabel="读取章节存档"
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
