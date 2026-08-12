import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import FreeInput from "./FreeInput";
import MisplacedRiverLightsOptionList from "./MisplacedRiverLightsOptionList";
import MisplacedRiverLightsSceneView from "./MisplacedRiverLightsSceneView";
import SaveLoadControls from "./SaveLoadControls";
import {
  applyMisplacedRiverLightsChoice,
  applyMisplacedRiverLightsFreeInput,
  clearMisplacedRiverLightsSave,
  getMisplacedRiverLightsRuntimeScene,
  loadMisplacedRiverLightsCheckpointGame,
  loadMisplacedRiverLightsGame,
  MISPLACED_RIVER_LIGHTS_DAY_CHECKPOINT_SAVE_KEY,
  MISPLACED_RIVER_LIGHTS_NIGHT_CHECKPOINT_SAVE_KEY,
  MISPLACED_RIVER_LIGHTS_SAVE_KEY,
  saveMisplacedRiverLightsGame,
} from "../lib/misplacedRiverLightsEngine";
import {
  getMisplacedRiverLightsSidebarNotes,
  getResolvedMisplacedRiverLightsDialogue,
  getResolvedMisplacedRiverLightsNarration,
  getVisibleMisplacedRiverLightsChoices,
  misplacedRiverLightsScenario,
  misplacedRiverLightsSourceVersion,
} from "../lib/misplacedRiverLightsScenario";
import {
  MisplacedRiverLightsChoice,
  MisplacedRiverLightsState,
} from "../lib/misplacedRiverLightsTypes";
import { getWeaponLabel } from "../lib/weaponLabels";

function getPresentCharacters(state: MisplacedRiverLightsState): string[] {
  const scene = getMisplacedRiverLightsRuntimeScene(state.currentSceneId);
  const resolvedDialogue = getResolvedMisplacedRiverLightsDialogue(scene, state);
  const sceneCharacters = scene.presentCharacters ?? [];
  const dialogueCharacters = resolvedDialogue.map((line) => line.speakerName);
  const mergedCharacters = ["你", ...sceneCharacters, ...dialogueCharacters];

  return mergedCharacters.filter(
    (name, index, list) => Boolean(name) && list.indexOf(name) === index,
  );
}

function getStatusText(state: MisplacedRiverLightsState): { description: string; severity: string } {
  if (state.flags.river_hazard_removed) {
    return { description: "奔波一整夜，但没有留下需要继续处理的明显伤势", severity: "稳定" };
  }

  return { description: "今晚需要长时间留守与奔跑，请保持体力和判断", severity: "稳定" };
}

function Sidebar({ state }: { state: MisplacedRiverLightsState }) {
  const scene = getMisplacedRiverLightsRuntimeScene(state.currentSceneId);
  const notes = getMisplacedRiverLightsSidebarNotes(state.flags);
  const status = getStatusText(state);
  const relationshipDetail = state.flags.relationship_progress;

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
          <p className="mt-3 text-sm leading-6 text-stone-500">线索会随着白天调查和夜间处理逐步补齐。</p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <div className="paper-panel p-5">
          <h2 className="section-title">主角伤势</h2>
          <div className="mt-3 flex items-center justify-between gap-4">
            <span className="text-sm text-stone-700">{status.description}</span>
            <span className="status-safe shrink-0 whitespace-nowrap text-center">{status.severity}</span>
          </div>
        </div>
        <div className="paper-panel p-5">
          <h2 className="section-title">简单背包</h2>
          <ul className="mt-3 space-y-2 text-sm text-stone-700">
            {state.inventory.map((item) => (
              <li key={item.id} className="flex justify-between gap-4">
                <span>{item.name}</span>
                <span className="text-stone-400">x{item.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="paper-panel p-5">
        <h2 className="section-title">人物印象</h2>
        {relationshipDetail ? (
          <p className="mt-3 text-sm leading-6 text-stone-500">{String(relationshipDetail)}</p>
        ) : (
          <p className="mt-3 text-sm leading-6 text-stone-500">
            这一章更强调四个人第一次正式并肩接委托时形成的默契。
          </p>
        )}
      </section>
    </aside>
  );
}

function cloneStateSnapshot(source: MisplacedRiverLightsState): MisplacedRiverLightsState {
  return JSON.parse(JSON.stringify(source)) as MisplacedRiverLightsState;
}

export default function MisplacedRiverLightsGamePage() {
  const router = useRouter();
  const [state, setState] = useState<MisplacedRiverLightsState | null>(null);
  const [undoStack, setUndoStack] = useState<MisplacedRiverLightsState[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [hasSave, setHasSave] = useState(false);
  const [hasDayCheckpoint, setHasDayCheckpoint] = useState(false);
  const [hasNightCheckpoint, setHasNightCheckpoint] = useState(false);

  useEffect(() => {
    const loaded = loadMisplacedRiverLightsGame();
    setState(loaded);
    setHasSave(Boolean(globalThis.localStorage?.getItem(MISPLACED_RIVER_LIGHTS_SAVE_KEY)));
    setHasDayCheckpoint(
      Boolean(globalThis.localStorage?.getItem(MISPLACED_RIVER_LIGHTS_DAY_CHECKPOINT_SAVE_KEY)),
    );
    setHasNightCheckpoint(
      Boolean(globalThis.localStorage?.getItem(MISPLACED_RIVER_LIGHTS_NIGHT_CHECKPOINT_SAVE_KEY)),
    );
    setReady(true);
  }, []);

  const scene = useMemo(
    () => (state ? getMisplacedRiverLightsRuntimeScene(state.currentSceneId) : null),
    [state],
  );
  const visibleChoices = useMemo(
    () => (state && scene ? getVisibleMisplacedRiverLightsChoices(scene, state) : []),
    [scene, state],
  );
  const resolvedNarration = useMemo(
    () => (state && scene ? getResolvedMisplacedRiverLightsNarration(scene, state) : []),
    [scene, state],
  );
  const resolvedDialogue = useMemo(
    () => (state && scene ? getResolvedMisplacedRiverLightsDialogue(scene, state) : []),
    [scene, state],
  );

  function refreshCheckpointStatus() {
    setHasDayCheckpoint(
      Boolean(globalThis.localStorage?.getItem(MISPLACED_RIVER_LIGHTS_DAY_CHECKPOINT_SAVE_KEY)),
    );
    setHasNightCheckpoint(
      Boolean(globalThis.localStorage?.getItem(MISPLACED_RIVER_LIGHTS_NIGHT_CHECKPOINT_SAVE_KEY)),
    );
  }

  function handleChoice(choice: MisplacedRiverLightsChoice) {
    if (!state) return;
    setUndoStack((current) => [...current, cloneStateSnapshot(state)]);
    const updated = applyMisplacedRiverLightsChoice(state, choice);
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
    const updated = applyMisplacedRiverLightsFreeInput(state, text);
    setState(updated);
    setNotice(updated.lastFeedback);
  }

  function handleSave() {
    if (!state) return;
    const saved = saveMisplacedRiverLightsGame(state);
    setState(saved);
    setHasSave(true);
    setNotice(null);
  }

  function handleLoad() {
    const loaded = loadMisplacedRiverLightsGame();
    if (!loaded) {
      setNotice("没有找到第三章的本地存档。");
      return;
    }
    setState(loaded);
    setUndoStack([]);
    setNotice(null);
  }

  function handleLoadDayCheckpoint() {
    const loaded = loadMisplacedRiverLightsCheckpointGame("day");
    if (!loaded) {
      setNotice("没有找到第三章河湾调查存档。");
      return;
    }
    setState(loaded);
    setUndoStack([]);
    setNotice(null);
  }

  function handleLoadNightCheckpoint() {
    const loaded = loadMisplacedRiverLightsCheckpointGame("night");
    if (!loaded) {
      setNotice("没有找到第三章夜守存档。");
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
    if (!globalThis.confirm("确定重新开始第三章吗？这只会清除当前剧情的本地存档。")) {
      return;
    }

    clearMisplacedRiverLightsSave();
    setHasSave(false);
    setUndoStack([]);
    void router.push("/create-character?scenario=misplaced-river-lights");
  }

  if (!ready) {
    return <main className="grid min-h-screen place-items-center text-stone-500" />;
  }

  if (!state || !scene) {
    return (
      <>
        <Head>
          <title>第三章：错位的河灯</title>
        </Head>
        <main className="grid min-h-screen place-items-center px-6">
          <section className="paper-panel max-w-xl p-8 text-center sm:p-12">
            <p className="text-xs tracking-[0.3em] text-blue-700">第三章</p>
            <h1 className="display-title mt-4 text-4xl text-stone-900">错位的河灯</h1>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link
                href="/create-character?scenario=misplaced-river-lights"
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
        <title>{scene.title} | 第三章：错位的河灯</title>
        <meta
          name="description"
          content={`${misplacedRiverLightsScenario.title} ${misplacedRiverLightsSourceVersion}`}
        />
      </Head>
      <main className="min-h-screen px-4 py-5 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-6 flex flex-col gap-4 border-b border-stone-300 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs tracking-[0.26em] text-cyan-800">第三章</p>
              <h1 className="display-title mt-1 text-3xl text-stone-900">错位的河灯</h1>
              <p className="mt-1 text-sm text-stone-500">
                {state.player.name} · {state.player.profession} · 基础自保：
                {getWeaponLabel(state.player.weapon)}
              </p>
            </div>
            <SaveLoadControls
              onSave={handleSave}
              onLoad={handleLoad}
              onLoadRescueCheckpoint={handleLoadDayCheckpoint}
              onLoadMealCheckpoint={handleLoadNightCheckpoint}
              onRestart={handleRestart}
              hasSave={hasSave}
              hasRescueCheckpoint={hasDayCheckpoint}
              hasMealCheckpoint={hasNightCheckpoint}
              onUndoTurn={handleUndoTurn}
              hasUndoTurn={undoStack.length > 0}
              rescueCheckpointLabel="读取河湾存档"
              mealCheckpointLabel="读取夜守存档"
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
              <MisplacedRiverLightsSceneView
                scene={scene}
                outcome={state.transitionOutcome}
                narration={resolvedNarration}
                dialogue={resolvedDialogue}
                playerName={state.player.name}
                playerProfession={state.player.profession}
                playerWeapon={state.player.weapon}
              />
              <MisplacedRiverLightsOptionList
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
