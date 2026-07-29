import { useRouter } from "next/router";
import { useEffect } from "react";

export default function FirstAcquaintanceLegacyCreateCharacterPage() {
  const router = useRouter();

  useEffect(() => {
    void router.replace("/create-character?scenario=first-acquaintance");
  }, [router]);

  return <main className="grid min-h-screen place-items-center text-stone-500">正在跳转到统一角色创建页…</main>;
}
