import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import FreeInput from "./FreeInput";
import OldSluiceOptionList from "./OldSluiceOptionList";
import OldSluiceSceneView from "./OldSluiceSceneView";
import SaveLoadControls from "./SaveLoadControls";
import {
  applyChoice,
  applyFreeInput,
  clearSave,
  getScene,
  getVisibleChoices,
  loadCheckpointGame,
  loadGame,
  MEAL_CHECKPOINT_SAVE_KEY,
  oldSluiceData,
  RESCUE_CHECKPOINT_SAVE_KEY,
  saveGame,
  SAVE_KEY,
} from "../lib/oldSluiceEngine";
import { Choice, GameState } from "../lib/oldSluiceTypes";
import { getWeaponLabel } from "../lib/weaponLabels";

function Sidebar({ state }: { state: GameState }) {
  return (
    <aside className="space-y-4">
      <section className="paper-panel p-5">
        <p className="text-xs tracking-[0.2em] text-stone-500">当前位置</p>
        <p className="mt-2 font-semibold text-stone-900">{state.location}</p>
        <div className="mt-5 border-t border-stone-200 pt-4">
          <p className="text-xs tracking-[0.2em] text-stone-500">在场人物</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {state.presentCharacters.map((character) => (
              <span key={character} className="tag">
                {character}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="paper-panel p-5">
        <h2 className="section-title">已知线索</h2>
        <ul className="mt-4 space-y-4">
          {state.knownClues.map((clue) => (
            <li key={clue.id} className="border-l border-blue-300 pl-3">
              <p className="text-sm font-semibold text-stone-800">{clue.title}</p>
              <p className="mt-1 text-xs leading-5 text-stone-500">{clue.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <div className="paper-panel p-5">
          <h2 className="section-title">主角伤势</h2>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-stone-700">{state.injury.description}</span>
            <span className="status-safe">{state.injury.severity}</span>
          </div>
        </div>
        <div className="paper-panel p-5">
          <h2 className="section-title">简单背包</h2>
          <ul className="mt-3 space-y-2 text-sm text-stone-700">
            {state.inventory.length ? (
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
        {state.relationships.length ? (
          <div className="mt-3 space-y-3">
            {state.relationships.map((relationship) => (
              <div key={relationship.characterId}>
                <p className="text-sm font-semibold text-stone-800">
                  {relationship.characterName}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {relationship.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-stone-500">
            尚未与其他人物建立印象。这里不会显示数值化好感度。
          </p>
        )}
      </section>
    </aside>
  );
}

function cloneStateSnapshot(source: GameState): GameState {
  return JSON.parse(JSON.stringify(source)) as GameState;
}

export default function OldSluiceGamePage() {
  const router = useRouter();
  const [state, setState] = useState<GameState | null>(null);
  const [undoStack, setUndoStack] = useState<GameState[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [hasSave, setHasSave] = useState(false);
  const [hasRescueCheckpoint, setHasRescueCheckpoint] = useState(false);
  const [hasMealCheckpoint, setHasMealCheckpoint] = useState(false);

  useEffect(() => {
    const loaded = loadGame();
    setState(loaded);
    setHasSave(Boolean(globalThis.localStorage?.getItem(SAVE_KEY)));
    setHasRescueCheckpoint(Boolean(globalThis.localStorage?.getItem(RESCUE_CHECKPOINT_SAVE_KEY)));
    setHasMealCheckpoint(Boolean(globalThis.localStorage?.getItem(MEAL_CHECKPOINT_SAVE_KEY)));
    setReady(true);
  }, []);

  const scene = useMemo(() => (state ? getScene(state.currentSceneId) : null), [state]);

  function handleChoice(choice: Choice) {
    if (!state) return;
    setUndoStack((current) => [...current, cloneStateSnapshot(state)]);
    const updated = applyChoice(state, choice);
    setState(updated);
    setNotice(updated.lastFeedback);
    setHasRescueCheckpoint(Boolean(globalThis.localStorage?.getItem(RESCUE_CHECKPOINT_SAVE_KEY)));
    setHasMealCheckpoint(Boolean(globalThis.localStorage?.getItem(MEAL_CHECKPOINT_SAVE_KEY)));
    globalThis.requestAnimationFrame?.(() => {
      globalThis.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function handleFreeInput(text: string) {
    if (!state) return;
    setUndoStack((current) => [...current, cloneStateSnapshot(state)]);
    const updated = applyFreeInput(state, text);
    setState(updated);
    setNotice(updated.lastFeedback);
  }

  function handleSave() {
    if (!state) return;
    const saved = saveGame(state);
    setState(saved);
    setHasSave(true);
    setNotice(`已保存到浏览器本地存档（版本 ${saved.saveVersion}）。`);
  }

  function handleLoad() {
    const loaded = loadGame();
    if (!loaded) {
      setNotice("没有找到有效的本地存档。");
      return;
    }
    setState(loaded);
    setUndoStack([]);
    setNotice("已读取本地存档。");
  }

  function handleLoadRescueCheckpoint() {
    const loaded = loadCheckpointGame("rescue");
    if (!loaded) {
      setNotice("没有找到救援汇合后的测试存档。");
      return;
    }
    setState(loaded);
    setUndoStack([]);
    setNotice("已读取救援汇合后的测试存档。");
  }

  function handleLoadMealCheckpoint() {
    const loaded = loadCheckpointGame("meal");
    if (!loaded) {
      setNotice("没有找到共餐前的测试存档。");
      return;
    }
    setState(loaded);
    setUndoStack([]);
    setNotice("已读取共餐前的测试存档。");
  }

  function handleUndoTurn() {
    setUndoStack((current) => {
      if (current.length === 0) {
        setNotice("当前没有可回退的上一回合。");
        return current;
      }

      setState(current[current.length - 1]);
      setNotice("已回退到上一回合，方便继续检查其他选项。");
      return current.slice(0, -1);
    });
  }

  function handleRestart() {
    if (!globalThis.confirm("确定重新开始吗？当前剧情的浏览器本地存档会被清除。")) {
      return;
    }
    clearSave();
    setUndoStack([]);
    void router.push("/create-character?scenario=old-sluice");
  }

  if (!ready) {
    return <main className="grid min-h-screen place-items-center text-stone-500">正在读取本地存档…</main>;
  }

  if (!state || !scene) {
    return (
      <>
        <Head>
          <title>第一章：失踪的货箱</title>
        </Head>
        <main className="grid min-h-screen place-items-center px-6">
          <section className="paper-panel max-w-xl p-8 text-center sm:p-12">
            <p className="text-xs tracking-[0.3em] text-blue-700">第一章</p>
            <h1 className="display-title mt-4 text-4xl text-stone-900">失踪的货箱</h1>
            <p className="mt-5 leading-7 text-stone-600">
              当前还没有这一章的角色存档。先完成角色创建，再进入旧水闸事件。
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link href="/create-character?scenario=old-sluice" className="primary-button w-full">
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
        <title>{scene.title} | 第一章：失踪的货箱</title>
        <meta name="description" content={oldSluiceData.metadata.title} />
      </Head>
      <main className="min-h-screen px-4 py-5 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-6 flex flex-col gap-4 border-b border-stone-300 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs tracking-[0.26em] text-cyan-800">第一章</p>
              <h1 className="display-title mt-1 text-3xl text-stone-900">失踪的货箱</h1>
              <p className="mt-1 text-sm text-stone-500">
                {state.player.name} · {state.player.profession} · 基础自保：{getWeaponLabel(state.player.weapon)}
              </p>
            </div>
            <SaveLoadControls
              onSave={handleSave}
              onLoad={handleLoad}
              onLoadRescueCheckpoint={handleLoadRescueCheckpoint}
              onLoadMealCheckpoint={handleLoadMealCheckpoint}
              onRestart={handleRestart}
              hasSave={hasSave}
              hasRescueCheckpoint={hasRescueCheckpoint}
              hasMealCheckpoint={hasMealCheckpoint}
              onUndoTurn={handleUndoTurn}
              hasUndoTurn={undoStack.length > 0}
            />
          </header>

          {notice && (
            <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice(null)} aria-label="关闭提示">
                ×
              </button>
            </div>
          )}

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
            <div className="space-y-5">
              <OldSluiceSceneView
                scene={scene}
                outcome={state.transitionOutcome}
                playerName={state.player.name}
                playerProfession={state.player.profession}
                playerIntroduced={Boolean(state.flags.introduced_self)}
                flags={state.flags}
              />
              <OldSluiceOptionList
                choices={getVisibleChoices(scene, state)}
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
