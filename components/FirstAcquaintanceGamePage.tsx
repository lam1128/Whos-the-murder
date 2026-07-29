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
  createFirstAcquaintanceInitialState,
  FIRST_ACQUAINTANCE_SAVE_KEY,
  getFirstAcquaintanceRuntimeScene,
  loadFirstAcquaintanceGame,
  saveFirstAcquaintanceGame,
} from "../lib/firstAcquaintanceEngine";
import {
  firstAcquaintanceScenario,
  firstAcquaintanceSourceVersion,
  getFirstAcquaintanceSidebarNotes,
} from "../lib/firstAcquaintanceScenario";
import { FirstAcquaintanceChoice, FirstAcquaintanceState } from "../lib/firstAcquaintanceTypes";

function getPresentCharacters(state: FirstAcquaintanceState): string[] {
  const scene = getFirstAcquaintanceRuntimeScene(state.currentSceneId);
  const sceneCharacters = scene.presentCharacters ?? [];
  const dialogueCharacters = scene.npcDialogue.map((line) => line.speakerName);
  const mergedCharacters = ["你", ...sceneCharacters, ...dialogueCharacters];

  return mergedCharacters.filter(
    (name, index, list) => Boolean(name) && list.indexOf(name) === index,
  );
}

function Sidebar({ state }: { state: FirstAcquaintanceState }) {
  const scene = getFirstAcquaintanceRuntimeScene(state.currentSceneId);
  const notes = getFirstAcquaintanceSidebarNotes(state.flags);
  const inventory = state.flags.medicine_supplies_replenished
    ? [{ id: "medicine-supplies", name: "补齐的换药与常用药材", quantity: 1 }]
    : [];
  const injuryDescription = state.flags.player_wound_status
    ? String(state.flags.player_wound_status)
    : "前臂伤口待换药";
  const injurySeverity = state.flags.round_complete ? "稳定" : "轻伤";
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
            <span className="text-sm text-stone-700">{injuryDescription}</span>
            <span className="status-safe">{injurySeverity}</span>
          </div>
        </div>
        <div className="paper-panel p-5">
          <h2 className="section-title">简单背包</h2>
          <ul className="mt-3 space-y-2 text-sm text-stone-700">
            {inventory.length > 0 ? (
              inventory.map((item) => (
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
            尚未与其他人物建立印象。这里不会显示数值化好感度。
          </p>
        )}
      </section>
    </aside>
  );
}

export default function FirstAcquaintanceGamePage() {
  const router = useRouter();
  const [state, setState] = useState<FirstAcquaintanceState | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    const loaded = loadFirstAcquaintanceGame();
    setState(loaded);
    setHasSave(Boolean(globalThis.localStorage?.getItem(FIRST_ACQUAINTANCE_SAVE_KEY)));
    setReady(true);
  }, []);

  const scene = useMemo(
    () => (state ? getFirstAcquaintanceRuntimeScene(state.currentSceneId) : null),
    [state],
  );

  function handleChoice(choice: FirstAcquaintanceChoice) {
    if (!state) return;
    const updated = applyFirstAcquaintanceChoice(state, choice);
    setState(updated);
    setNotice(updated.lastFeedback);
    globalThis.requestAnimationFrame?.(() => {
      globalThis.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function handleFreeInput(text: string) {
    if (!state) return;
    const updated = applyFirstAcquaintanceFreeInput(state, text);
    setState(updated);
    setNotice(updated.lastFeedback);
  }

  function handleSave() {
    if (!state) return;
    const saved = saveFirstAcquaintanceGame(state);
    setState(saved);
    setHasSave(true);
    setNotice("第二章的本地存档已经保存。");
  }

  function handleLoad() {
    const loaded = loadFirstAcquaintanceGame();
    if (!loaded) {
      setNotice("没有找到第二章的本地存档。");
      return;
    }
    setState(loaded);
    setNotice("已读取第二章的本地存档。");
  }

  function handleRestart() {
    if (!globalThis.confirm("确定重新开始第二章吗？这只会清除当前剧情的本地存档。")) {
      return;
    }
    clearFirstAcquaintanceSave();
    setHasSave(false);
    setState(createFirstAcquaintanceInitialState({ name: state?.player.name ?? "林昭宁" }));
    setNotice("第二章已经重新开始。");
    globalThis.requestAnimationFrame?.(() => {
      globalThis.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (!ready) {
    return <main className="grid min-h-screen place-items-center text-stone-500">正在读取本地存档…</main>;
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
            <p className="mt-5 leading-7 text-stone-600">
              当前还没有这一章的角色存档。先完成角色创建，再进入第二章。
            </p>
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
              onLoadRescueCheckpoint={() => setNotice("第二章当前没有额外断点存档。")}
              onLoadMealCheckpoint={() => setNotice("第二章当前没有额外断点存档。")}
              onRestart={handleRestart}
              hasSave={hasSave}
              hasRescueCheckpoint={false}
              hasMealCheckpoint={false}
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
              <FirstAcquaintanceSceneView
                scene={scene}
                outcome={state.transitionOutcome}
                playerName={state.player.name}
                playerProfession={state.player.profession}
              />
              <FirstAcquaintanceOptionList
                choices={scene.choices}
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
