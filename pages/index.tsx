import Head from "next/head";
import Link from "next/link";
import { landingIntroduction, scenarioIds, scenarioSummaries } from "../lib/scenarioRegistry";

export default function HomePage() {
  return (
    <>
      <Head>
        <title>临川城故事入口</title>
        <meta name="description" content="临川城统一剧情选择入口" />
      </Head>
      <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-5xl space-y-8">
          <section className="text-center">
            <h1 className="display-title text-4xl text-stone-900 sm:text-5xl">大侦探：仙侠篇</h1>
            <p className="mt-4 text-base leading-7 text-stone-600 sm:text-lg">
              一段关于委托、相遇与日常生活的仙侠故事
            </p>
          </section>

          <section className="paper-panel p-6 sm:p-8">
            <p className="text-xs font-semibold tracking-[0.3em] text-blue-700">世界与来处</p>
            <div className="mt-6 space-y-5 text-base leading-8 text-stone-700">
              {landingIntroduction.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            {scenarioIds.map((scenarioId) => {
              const scenario = scenarioSummaries[scenarioId];

              return (
                <Link
                  key={scenario.id}
                  href={`/create-character?scenario=${scenario.id}`}
                  className="paper-panel block p-6 transition hover:-translate-y-0.5 hover:border-cyan-300"
                >
                  <p className="text-xs font-semibold tracking-[0.24em] text-cyan-800">
                    {scenario.chapterLabel}
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-stone-900">
                    {scenario.chapterTitle}
                  </h2>
                  <p className="mt-3 leading-7 text-stone-600">{scenario.cardDescription}</p>
                  <p className="mt-6 text-sm font-semibold text-blue-700">进入创建角色 →</p>
                </Link>
              );
            })}
          </section>
        </div>
      </main>
    </>
  );
}
