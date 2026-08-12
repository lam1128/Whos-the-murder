import Link from "next/link";
import { useRouter } from "next/router";
import EquipmentDayGamePage from "../../components/EquipmentDayGamePage";
import FirstAcquaintanceGamePage from "../../components/FirstAcquaintanceGamePage";
import MisplacedRiverLightsGamePage from "../../components/MisplacedRiverLightsGamePage";
import OldSluiceGamePage from "../../components/OldSluiceGamePage";
import XuanjiaLizardHuntGamePage from "../../components/XuanjiaLizardHuntGamePage";
import WesternMiningTripGamePage from "../../components/WesternMiningTripGamePage";
import { parseScenarioId } from "../../lib/scenarioRegistry";

export default function ScenarioPlayPage() {
  const router = useRouter();
  const scenarioId = parseScenarioId(router.query.scenario);

  if (!scenarioId) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <section className="paper-panel max-w-xl p-8 text-center sm:p-12">
          <p className="text-xs tracking-[0.3em] text-blue-700">剧情入口</p>
          <h1 className="display-title mt-4 text-4xl text-stone-900">未找到对应剧情</h1>
          <p className="mt-5 leading-7 text-stone-600">请先回到首页，从正式章节列表中选择要游玩的剧情。</p>
          <Link href="/" className="primary-button mt-8 w-full">
            返回首页
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>
    );
  }

  if (scenarioId === "old-sluice") {
    return <OldSluiceGamePage />;
  }

  if (scenarioId === "misplaced-river-lights") {
    return <MisplacedRiverLightsGamePage />;
  }

  if (scenarioId === "xuanjia-lizard-hunt") {
    return <XuanjiaLizardHuntGamePage />;
  }

  if (scenarioId === "equipment-day") {
    return <EquipmentDayGamePage />;
  }

  if (scenarioId === "chapter5-western-mining-trip") {
    return <WesternMiningTripGamePage />;
  }

  return <FirstAcquaintanceGamePage />;
}
