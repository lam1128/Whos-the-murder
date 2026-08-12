import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import FirstAcquaintanceOptionList from "./FirstAcquaintanceOptionList";
import FirstAcquaintanceSceneView from "./FirstAcquaintanceSceneView";
import FreeInput from "./FreeInput";
import SaveLoadControls from "./SaveLoadControls";
import {
  applyFirstAcquaintanceChoice,
  applyFirstAcquaintanceFreeInput,
  clearFirstAcquaintanceSave,
  FIRST_ACQUAINTANCE_ACADEMY_CHECKPOINT_SAVE_KEY,
  FIRST_ACQUAINTANCE_REBANDAGE_CHECKPOINT_SAVE_KEY,
  FIRST_ACQUAINTANCE_SAVE_KEY,
  getFirstAcquaintanceRuntimeScene,
  loadFirstAcquaintanceCheckpointGame,
  loadFirstAcquaintanceGame,
  saveFirstAcquaintanceGame,
} from "../lib/firstAcquaintanceEngine";
import {
  firstAcquaintanceScenario,
  firstAcquaintanceSourceVersion,
  getFirstAcquaintanceSidebarNotes,
  getResolvedFirstAcquaintanceDialogue,
  getResolvedFirstAcquaintanceNarration,
  getVisibleFirstAcquaintanceChoices,
} from "../lib/firstAcquaintanceScenario";
import { FirstAcquaintanceChoice, FirstAcquaintanceState } from "../lib/firstAcquaintanceTypes";

function getPresentCharacters(state: FirstAcquaintanceState): string[] {
  const scene = getFirstAcquaintanceRuntimeScene(state.currentSceneId);
  const resolvedDialogue = getResolvedFirstAcquaintanceDialogue(scene, state);
  const sceneCharacters = scene.presentCharacters ?? [];
  const dialogueCharacters = resolvedDialogue.map((line) => line.speakerName);
  const mergedCharacters = ["你", ...sceneCharacters, ...dialogueCharacters];

  return mergedCharacters.filter(
    (name, index, list) => Boolean(name) && list.indexOf(name) === index,
  );
}

function getInjuryStatus(state: FirstAcquaintanceState): { description: string; severity: string } {
  const currentIndex = firstAcquaintanceScenario.routeOrder.indexOf(state.currentSceneId);
  const tomorrowReminderIndex = firstAcquaintanceScenario.routeOrder.indexOf("wang_home_rebandage_nervous");
  const rebandagedIndex = firstAcquaintanceScenario.routeOrder.indexOf("home_exam_end_reminder");

  if (
    state.flags.tomorrow_rebandage_scheduled ||
    (tomorrowReminderIndex !== -1 && currentIndex >= tomorrowReminderIndex)
  ) {
    return { description: "前臂伤口已换药，等待明日再次换药", severity: "稳定" };
  }

  if (state.flags.wound_rebandaged || (rebandagedIndex !== -1 && currentIndex >= rebandagedIndex)) {
    return { description: "前臂伤口已换药", severity: "稳定" };
  }

  return { description: "前臂伤口待换药", severity: "轻伤" };
}

function Sidebar({ state }: { state: FirstAcquaintanceState }) {
  const scene = getFirstAcquaintanceRuntimeScene(state.currentSceneId);
  const notes = getFirstAcquaintanceSidebarNotes(state.flags);
  const injuryStatus = getInjuryStatus(state);
  const relationshipDetail = state.flags.relationship_progress ?? state.flags.relationship_status;

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
          <p className="mt-3 text-sm leading-6 text-stone-500">这一段暂时还没有新的已知线索。</p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <div className="paper-panel p-5">
          <h2 className="section-title">主角伤势</h2>
          <div className="mt-3 flex items-center justify-between gap-4">
            <span className="text-sm text-stone-700">{injuryStatus.description}</span>
            <span className="status-safe shrink-0 whitespace-nowrap text-center">{injuryStatus.severity}</span>
          </div>
        </div>
        <div className="paper-panel p-5">
          <h2 className="section-title">简单背包</h2>
          <ul className="mt-3 space-y-2 text-sm text-stone-700">
            <li className="text-stone-500">空</li>
          </ul>
        </div>
      </section>

      <section className="paper-panel p-5">
        <h2 className="section-title">人物印象</h2>
        {relationshipDetail ? (
          <p className="mt-3 text-sm leading-6 text-stone-500">{String(relationshipDetail)}</p>
        ) : (
          <p className="mt-3 text-sm leading-6 text-stone-500">
            尚未与其他人物建立印象。这里不会显示数值化好感度。
          </p>
        )}
      </section>
    </aside>
  );
}

function cloneStateSnapshot(source: FirstAcquaintanceState): FirstAcquaintanceState {
  return JSON.parse(JSON.stringify(source)) as FirstAcquaintanceState;
}

export default function FirstAcquaintanceGamePage() {
  const router = useRouter();
  const [state, setState] = useState<FirstAcquaintanceState | null>(null);
  const [undoStack, setUndoStack] = useState<FirstAcquaintanceState[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [hasSave, setHasSave] = useState(false);
  const [hasRebandageCheckpoint, setHasRebandageCheckpoint] = useState(false);
  const [hasAcademyCheckpoint, setHasAcademyCheckpoint] = useState(false);

  useEffect(() => {
    const loaded = loadFirstAcquaintanceGame();
    setState(loaded);
    setHasSave(Boolean(globalThis.localStorage?.getItem(FIRST_ACQUAINTANCE_SAVE_KEY)));
    setHasRebandageCheckpoint(
      Boolean(globalThis.localStorage?.getItem(FIRST_ACQUAINTANCE_REBANDAGE_CHECKPOINT_SAVE_KEY)),
    );
    setHasAcademyCheckpoint(
      Boolean(globalThis.localStorage?.getItem(FIRST_ACQUAINTANCE_ACADEMY_CHECKPOINT_SAVE_KEY)),
    );
    setReady(true);
  }, []);

  const scene = useMemo(
    () => (state ? getFirstAcquaintanceRuntimeScene(state.currentSceneId) : null),
    [state],
  );
  const visibleChoices = useMemo(
    () => (state && scene ? getVisibleFirstAcquaintanceChoices(scene, state) : []),
    [scene, state],
  );
  const resolvedNarration = useMemo(
    () => (state && scene ? getResolvedFirstAcquaintanceNarration(scene, state) : []),
    [scene, state],
  );
  const resolvedDialogue = useMemo(
    () => (state && scene ? getResolvedFirstAcquaintanceDialogue(scene, state) : []),
    [scene, state],
  );

  function refreshCheckpointStatus() {
    setHasRebandageCheckpoint(
      Boolean(globalThis.localStorage?.getItem(FIRST_ACQUAINTANCE_REBANDAGE_CHECKPOINT_SAVE_KEY)),
    );
    setHasAcademyCheckpoint(
      Boolean(globalThis.localStorage?.getItem(FIRST_ACQUAINTANCE_ACADEMY_CHECKPOINT_SAVE_KEY)),
    );
  }

  function handleChoice(choice: FirstAcquaintanceChoice) {
    if (!state) return;
    setUndoStack((current) => [...current, cloneStateSnapshot(state)]);
    const updated = applyFirstAcquaintanceChoice(state, choice);
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
    const updated = applyFirstAcquaintanceFreeInput(state, text);
    setState(updated);
    setNotice(updated.lastFeedback);
  }

  function handleSave() {
    if (!state) return;
    const saved = saveFirstAcquaintanceGame(state);
    setState(saved);
    setHasSave(true);
    setNotice(null);
  }

  function handleLoad() {
    const loaded = loadFirstAcquaintanceGame();
    if (!loaded) {
      setNotice("没有找到第二章的本地存档。");
      return;
    }
    setState(loaded);
    setUndoStack([]);
    setNotice(null);
  }

  function handleLoadRebandageCheckpoint() {
    const loaded = loadFirstAcquaintanceCheckpointGame("rebandage");
    if (!loaded) {
      setNotice("没有找到第二章换药存档。");
      return;
    }
    setState(loaded);
    setUndoStack([]);
    setNotice(null);
  }

  function handleLoadAcademyCheckpoint() {
    const loaded = loadFirstAcquaintanceCheckpointGame("academy");
    if (!loaded) {
      setNotice("没有找到第二章接人存档。");
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
    if (!globalThis.confirm("确定重新开始第二章吗？这只会清除当前剧情的本地存档。")) {
      return;
    }

    clearFirstAcquaintanceSave();
    setHasSave(false);
    setUndoStack([]);
    void router.push("/create-character?scenario=first-acquaintance");
  }

  if (!ready) {
    return <main className="grid min-h-screen place-items-center text-stone-500" />;
  }

  if (!state || !scene) {
    return (
      <>
        <Head>
          <title>第二章：妹宝！妹宝！</title>
        </Head>
        <main className="grid min-h-screen place-items-center px-6">
          <section className="paper-panel max-w-xl p-8 text-center sm:p-12">
            <p className="text-xs tracking-[0.3em] text-blue-700">第二章</p>
            <h1 className="display-title mt-4 text-4xl text-stone-900">妹宝！妹宝！</h1>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link
                href="/create-character?scenario=first-acquaintance"
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
        <title>{scene.title} | 第二章：妹宝！妹宝！</title>
        <meta
          name="description"
          content={`${firstAcquaintanceScenario.title} ${firstAcquaintanceSourceVersion}`}
        />
      </Head>
      <main className="min-h-screen px-4 py-5 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-6 flex flex-col gap-4 border-b border-stone-300 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs tracking-[0.26em] text-cyan-800">第二章</p>
              <h1 className="display-title mt-1 text-3xl text-stone-900">妹宝！妹宝！</h1>
              <p className="mt-1 text-sm text-stone-500">
                {state.player.name} · {state.player.profession} · 基础自保：{state.player.weapon}
              </p>
            </div>
            <SaveLoadControls
              onSave={handleSave}
              onLoad={handleLoad}
              onLoadRescueCheckpoint={handleLoadRebandageCheckpoint}
              onLoadMealCheckpoint={handleLoadAcademyCheckpoint}
              onRestart={handleRestart}
              hasSave={hasSave}
              hasRescueCheckpoint={hasRebandageCheckpoint}
              hasMealCheckpoint={hasAcademyCheckpoint}
              onUndoTurn={handleUndoTurn}
              hasUndoTurn={undoStack.length > 0}
              rescueCheckpointLabel="读取换药存档"
              mealCheckpointLabel="读取接人存档"
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
              <FirstAcquaintanceSceneView
                scene={scene}
                outcome={state.transitionOutcome}
                narration={resolvedNarration}
                dialogue={resolvedDialogue}
                playerName={state.player.name}
                playerProfession={state.player.profession}
              />
              <FirstAcquaintanceOptionList
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
