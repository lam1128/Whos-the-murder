import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import FreeInput from "./FreeInput";
import SaveLoadControls from "./SaveLoadControls";
import XuanjiaLizardHuntOptionList from "./XuanjiaLizardHuntOptionList";
import XuanjiaLizardHuntSceneView from "./XuanjiaLizardHuntSceneView";
import {
  applyXuanjiaLizardHuntChoice,
  applyXuanjiaLizardHuntFreeInput,
  clearXuanjiaLizardHuntSave,
  createXuanjiaLizardHuntInitialState,
  getXuanjiaLizardHuntRuntimeScene,
  loadXuanjiaLizardHuntGame,
  saveXuanjiaLizardHuntGame,
  XUANJIA_LIZARD_HUNT_SAVE_KEY,
} from "../lib/xuanjiaLizardHuntEngine";
import {
  getResolvedXuanjiaLizardHuntDialogue,
  getResolvedXuanjiaLizardHuntNarration,
  getVisibleXuanjiaLizardHuntChoices,
  xuanjiaLizardHuntScenario,
  xuanjiaLizardHuntSourceVersion,
} from "../lib/xuanjiaLizardHuntScenario";
import {
  XuanjiaLizardHuntChoice,
  XuanjiaLizardHuntState,
} from "../lib/xuanjiaLizardHuntTypes";

function getPresentCharacters(state: XuanjiaLizardHuntState): string[] {
  const scene = getXuanjiaLizardHuntRuntimeScene(state.currentSceneId);
  const resolvedDialogue = getResolvedXuanjiaLizardHuntDialogue(scene, state);
  const sceneCharacters = scene.presentCharacters ?? [];
  const dialogueCharacters = resolvedDialogue.map((line) => line.speakerName);
  const mergedCharacters = ["你", ...sceneCharacters, ...dialogueCharacters];

  return mergedCharacters.filter(
    (name, index, list) => Boolean(name) && list.indexOf(name) === index,
  );
}

function getInjuryStatus(state: XuanjiaLizardHuntState): { description: string; severity: string } {
  if (state.flags.player_injury === "light_scrapes_recovering") {
    return { description: "肩背与腿侧轻微擦撞伤，正在恢复", severity: "稳定" };
  }

  if (state.flags.formal_commission_accepted) {
    return { description: "长时间奔走与实战后需留意肩背与体力", severity: "留意" };
  }

  return { description: "前臂伤口正在恢复，暂时不宜勉强发力", severity: "稳定" };
}

function getNotes(state: XuanjiaLizardHuntState): Array<{ id: string; title: string; detail: string }> {
  const notes: Array<{ id: string; title: string; detail: string }> = [];

  if (state.flags.formal_commission_requested) {
    notes.push({
      id: "request",
      title: "第一次主动请缨",
      detail: "你已经主动提出要加入正式委托，不再只是被卷入事件的旁观者。",
    });
  }

  if (state.flags.formal_commission_accepted) {
    notes.push({
      id: "accepted",
      title: "正式三人委托",
      detail: "这次委托是纯材料狩猎，不含案件调查，重点在共同准备、追踪和实战磨合。",
    });
  }

  if (state.flags.needle_skill_revealed) {
    notes.push({
      id: "needle",
      title: "封药细针",
      detail: "王鸥已经在实战里向你展示过封药细针与送药时机。",
    });
  }

  if (state.flags.xuanjia_lizard_hunt_completed) {
    notes.push({
      id: "completed",
      title: "共同完成委托",
      detail: "你们已经一起完成了第一份正式三人委托，关系从熟悉推进到真正能共担风险。",
    });
  }

  return notes;
}

function Sidebar({ state }: { state: XuanjiaLizardHuntState }) {
  const scene = getXuanjiaLizardHuntRuntimeScene(state.currentSceneId);
  const notes = getNotes(state);
  const injuryStatus = getInjuryStatus(state);
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
            这条剧情以准备、追踪和狩猎合作为主，重要变化会逐步体现在这里。
          </p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <div className="paper-panel p-5">
          <h2 className="section-title">主角伤势</h2>
          <div className="mt-3 flex items-center justify-between gap-4">
            <span className="text-sm text-stone-700">{injuryStatus.description}</span>
            <span className="status-safe shrink-0 whitespace-nowrap text-center">
              {injuryStatus.severity}
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
            这一章更强调三个人第一次真正以正式委托搭档的方式同行。
          </p>
        )}
      </section>
    </aside>
  );
}

function cloneStateSnapshot(source: XuanjiaLizardHuntState): XuanjiaLizardHuntState {
  return JSON.parse(JSON.stringify(source)) as XuanjiaLizardHuntState;
}

export default function XuanjiaLizardHuntGamePage() {
  const router = useRouter();
  const [state, setState] = useState<XuanjiaLizardHuntState | null>(null);
  const [undoStack, setUndoStack] = useState<XuanjiaLizardHuntState[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    const loaded = loadXuanjiaLizardHuntGame();
    setState(loaded);
    setHasSave(Boolean(globalThis.localStorage?.getItem(XUANJIA_LIZARD_HUNT_SAVE_KEY)));
    setReady(true);
  }, []);

  const scene = useMemo(
    () => (state ? getXuanjiaLizardHuntRuntimeScene(state.currentSceneId) : null),
    [state],
  );
  const visibleChoices = useMemo(
    () => (state && scene ? getVisibleXuanjiaLizardHuntChoices(scene, state) : []),
    [scene, state],
  );
  const resolvedNarration = useMemo(
    () => (state && scene ? getResolvedXuanjiaLizardHuntNarration(scene, state) : []),
    [scene, state],
  );
  const resolvedDialogue = useMemo(
    () => (state && scene ? getResolvedXuanjiaLizardHuntDialogue(scene, state) : []),
    [scene, state],
  );

  function handleChoice(choice: XuanjiaLizardHuntChoice) {
    if (!state) return;
    setUndoStack((current) => [...current, cloneStateSnapshot(state)]);
    const updated = applyXuanjiaLizardHuntChoice(state, choice);
    setState(updated);
    setNotice(updated.lastFeedback);
    globalThis.requestAnimationFrame?.(() => {
      globalThis.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function handleFreeInput(text: string) {
    if (!state) return;
    setUndoStack((current) => [...current, cloneStateSnapshot(state)]);
    const updated = applyXuanjiaLizardHuntFreeInput(state, text);
    setState(updated);
    setNotice(updated.lastFeedback);
  }

  function handleSave() {
    if (!state) return;
    const saved = saveXuanjiaLizardHuntGame(state);
    setState(saved);
    setHasSave(true);
    setNotice(null);
  }

  function handleLoad() {
    const loaded = loadXuanjiaLizardHuntGame();
    if (!loaded) {
      setNotice("没有找到这条第三章的本地存档。");
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
    if (!globalThis.confirm("确定重新开始这条第三章吗？这只会清除当前剧情的本地存档。")) {
      return;
    }

    clearXuanjiaLizardHuntSave();
    setHasSave(false);
    setUndoStack([]);
    setState(createXuanjiaLizardHuntInitialState({ name: "林昭宁" }));
    void router.push("/create-character?scenario=xuanjia-lizard-hunt");
  }

  if (!ready) {
    return <main className="grid min-h-screen place-items-center text-stone-500" />;
  }

  if (!state || !scene) {
    return (
      <>
        <Head>
          <title>第三章：玄甲林蜥</title>
        </Head>
        <main className="grid min-h-screen place-items-center px-6">
          <section className="paper-panel max-w-xl p-8 text-center sm:p-12">
            <p className="text-xs tracking-[0.3em] text-blue-700">第三章</p>
            <h1 className="display-title mt-4 text-4xl text-stone-900">玄甲林蜥</h1>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link
                href="/create-character?scenario=xuanjia-lizard-hunt"
                className="primary-button w-full"
              >
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
        <title>{scene.title} | 第三章：玄甲林蜥</title>
        <meta
          name="description"
          content={`${xuanjiaLizardHuntScenario.title} ${xuanjiaLizardHuntSourceVersion}`}
        />
      </Head>
      <main className="min-h-screen px-4 py-5 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-6 flex flex-col gap-4 border-b border-stone-300 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs tracking-[0.26em] text-cyan-800">第三章</p>
              <h1 className="display-title mt-1 text-3xl text-stone-900">玄甲林蜥</h1>
              <p className="mt-1 text-sm text-stone-500">
                {state.player.name} · {state.player.profession} · 基础自保：匕首
              </p>
            </div>
            <SaveLoadControls
              onSave={handleSave}
              onLoad={handleLoad}
              onLoadRescueCheckpoint={() => undefined}
              onLoadMealCheckpoint={() => undefined}
              onRestart={handleRestart}
              hasSave={hasSave}
              hasRescueCheckpoint={false}
              hasMealCheckpoint={false}
              onUndoTurn={handleUndoTurn}
              hasUndoTurn={undoStack.length > 0}
              rescueCheckpointLabel="读取宿营存档"
              mealCheckpointLabel="读取返程存档"
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
