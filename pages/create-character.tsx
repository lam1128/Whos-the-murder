import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createFirstAcquaintanceInitialState,
  saveFirstAcquaintanceGame,
} from "../lib/firstAcquaintanceEngine";
import { createInitialGameState, oldSluiceData, saveGame } from "../lib/oldSluiceEngine";
import { Profession, ProfessionSchema, Weapon, WeaponSchema } from "../lib/oldSluiceTypes";
import { getScenarioSummary, parseScenarioId } from "../lib/scenarioRegistry";
import { getWeaponLabel } from "../lib/weaponLabels";

const professionDescriptions: Record<Profession, string> = {
  炼丹师: "熟悉药材、材料状态与基础应急调配，但不会取代专业医师的诊断。",
  机关傀儡师: "熟悉工具、绳索、齿轮与简单机关，擅长理解并安全处理结构问题。",
  潜行修: "擅长控制脚步、利用遮挡、短距离侦察与匕首近战，并不等于真正隐身。",
};

const chapterDescriptions = {
  "old-sluice": [
    "家中一批货物在城东北的旧水闸迟迟没有完成交接。你受家人所托前去核对，不过，这似乎并不只是一次普通的跑腿。",
    "你接受过完整的学堂教育。除进阶专业与基础自保训练外，也学过灵力控制、基础防护、常见妖兽与灵植、简单急救、野外辨识，以及历史、地理和自然常识。你并非毫无准备，却从未想过自己会这么快真正面对危险。",
  ],
  "first-acquaintance": [
    "旧水闸的风波暂时告一段落。你与何炅、王鸥一同处理了失踪的货箱和水闸中的异常，也第一次真正经历了委托中的危险。",
    "临别前，王鸥约你第二天在春汀小馆碰面，重新检查前臂的伤口；何炅也会一同前来。新的相处、新的观察与新的选择，正从这次约定开始。",
  ],
} as const;

export default function CreateCharacterPage() {
  const router = useRouter();
  const scenarioId = parseScenarioId(router.query.scenario);
  const scenario = scenarioId ? getScenarioSummary(scenarioId) : null;

  const [name, setName] = useState("林昭宁");
  const [profession, setProfession] = useState<Profession>("炼丹师");
  const [weapon, setWeapon] = useState<Weapon>("剑");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scenario) {
      return;
    }

    setName("林昭宁");
    setProfession(scenario.defaultProfession);
    setWeapon(scenario.defaultWeapon);
    setError(null);
  }, [scenario]);

  const weaponLocked = profession === "潜行修";
  const actualWeapon = useMemo<Weapon>(
    () => (weaponLocked ? oldSluiceData.playerCreation.stealthWeapon : weapon),
    [weapon, weaponLocked],
  );

  function chooseProfession(value: string) {
    if (!scenario) return;
    const parsed = ProfessionSchema.safeParse(value);
    if (!parsed.success) return;
    if (scenario.professionMode === "stealth-only" && parsed.data !== "潜行修") return;

    setProfession(parsed.data);
    if (parsed.data === "潜行修") {
      setWeapon("匕首");
    }
  }

  function chooseWeapon(value: string) {
    const parsed = WeaponSchema.safeParse(value);
    if (parsed.success) setWeapon(parsed.data);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!scenarioId || !scenario) {
      setError("请先回到首页选择要游玩的章节。");
      return;
    }

    const cleanName = name.trim();
    if (!cleanName) {
      setError("请填写主角姓名。");
      return;
    }
    if (cleanName.length > 12) {
      setError("姓名请控制在 12 个字以内。");
      return;
    }

    if (scenarioId === "old-sluice") {
      const initialState = createInitialGameState({
        name: cleanName,
        profession,
        weapon: actualWeapon,
      });
      saveGame(initialState);
    } else {
      const initialState = createFirstAcquaintanceInitialState({ name: cleanName });
      saveFirstAcquaintanceGame(initialState);
    }

    void router.push(`/play/${scenarioId}`);
  }

  if (!scenarioId || !scenario) {
    return (
      <>
        <Head>
          <title>选择章节</title>
        </Head>
        <main className="grid min-h-screen place-items-center px-6">
          <section className="paper-panel max-w-xl p-8 text-center sm:p-12">
            <p className="text-xs tracking-[0.3em] text-blue-700">角色创建</p>
            <h1 className="display-title mt-4 text-4xl text-stone-900">请先选择章节</h1>
            <p className="mt-5 leading-7 text-stone-600">
              当前没有指定有效剧情。请回到首页，从第一章或第二章进入统一创建流程。
            </p>
            <Link href="/" className="primary-button mt-8 w-full">
              返回首页
              <span aria-hidden="true">→</span>
            </Link>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{scenario.chapterLabel}：{scenario.chapterTitle} | 角色创建</title>
        <meta name="description" content={`${scenario.chapterLabel} ${scenario.chapterTitle} 角色创建`} />
      </Head>
      <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex items-center gap-3 text-sm tracking-[0.2em] text-cyan-800">
            <span className="h-px w-10 bg-cyan-700/40" />
            {scenario.chapterLabel} · {scenario.chapterTitle}
          </div>

          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="paper-panel flex min-h-[40rem] flex-col p-6 sm:p-8">
              <div>
                <p className="mb-3 text-xs font-semibold tracking-[0.3em] text-blue-700">章节简介</p>
                <h1 className="display-title mb-6 text-4xl text-stone-900 sm:text-5xl">
                  {scenario.chapterTitle}
                </h1>
                <div className="space-y-4 text-base leading-8 text-stone-700">
                  {chapterDescriptions[scenarioId].map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>

              <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-stone-200 pt-6 text-sm">
                <div>
                  <dt className="text-stone-500">固定身份</dt>
                  <dd className="mt-1 text-stone-800">女性 · 19 岁</dd>
                </div>
                <div>
                  <dt className="text-stone-500">出身</dt>
                  <dd className="mt-1 text-stone-800">普通河运家庭</dd>
                </div>
                <div>
                  <dt className="text-stone-500">身高与发型</dt>
                  <dd className="mt-1 text-stone-800">165 厘米 · 长发</dd>
                </div>
                <div>
                  <dt className="text-stone-500">经历</dt>
                  <dd className="mt-1 text-stone-800">初次危险事件</dd>
                </div>
              </dl>
            </section>

            <form onSubmit={handleSubmit} className="paper-panel p-6 sm:p-8">
              <div className="mb-7">
                <p className="text-xs font-semibold tracking-[0.25em] text-cyan-800">角色创建</p>
                <h2 className="mt-2 text-2xl font-semibold text-stone-900">留下你的名字</h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  创建阶段不预设性格，你的言行会逐步形成别人对你的具体印象。
                </p>
              </div>

              <label className="block">
                <span className="form-label">姓名</span>
                <input
                  autoFocus
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setError(null);
                  }}
                  className="field"
                  maxLength={12}
                  placeholder="输入主角姓名"
                />
              </label>

              <fieldset className="mt-7">
                <legend className="form-label">
                  进阶专业
                  {scenario.professionMode === "stealth-only" && (
                    <span className="ml-2 font-normal text-blue-700">本章节固定为潜行修</span>
                  )}
                </legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {oldSluiceData.playerCreation.professions.map((item) => {
                    const disabled = scenario.professionMode === "stealth-only" && item !== "潜行修";

                    return (
                      <label
                        key={item}
                        className={`choice-card ${
                          profession === item ? "choice-card-active" : ""
                        } ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
                      >
                        <input
                          className="sr-only"
                          type="radio"
                          name="profession"
                          value={item}
                          checked={profession === item}
                          disabled={disabled}
                          onChange={(event) => chooseProfession(event.target.value)}
                        />
                        <span className="block font-semibold text-stone-900">{item}</span>
                        <span className="mt-2 block text-xs leading-5 text-stone-600">
                          {professionDescriptions[item]}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="mt-7">
                <legend className="form-label">
                  基础自保方式
                  {weaponLocked && (
                    <span className="ml-2 font-normal text-blue-700">潜行修固定为匕首</span>
                  )}
                </legend>
                <div className="grid grid-cols-4 gap-2">
                  {oldSluiceData.playerCreation.weapons.map((item) => {
                    const disabled = weaponLocked && item !== "匕首";

                    return (
                      <label
                        key={item}
                        className={`weapon-chip ${
                          actualWeapon === item ? "weapon-chip-active" : ""
                        } ${disabled ? "cursor-not-allowed opacity-30" : "cursor-pointer"}`}
                      >
                        <input
                          className="sr-only"
                          type="radio"
                          name="weapon"
                          value={item}
                          checked={actualWeapon === item}
                          disabled={disabled}
                          onChange={(event) => chooseWeapon(event.target.value)}
                        />
                        {getWeaponLabel(item)}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {error && (
                <p role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <button type="submit" className="primary-button w-full">
                  进入{scenario.chapterLabel}
                  <span aria-hidden="true">→</span>
                </button>
                <Link href="/" className="secondary-button w-full">
                  返回首页
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
