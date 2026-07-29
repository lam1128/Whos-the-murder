import { useRouter } from "next/router";
import { useEffect } from "react";

export default function FirstAcquaintanceLegacyIndexPage() {
  const router = useRouter();

  useEffect(() => {
    void router.replace("/play/first-acquaintance");
  }, [router]);

  return <main className="grid min-h-screen place-items-center text-stone-500">正在跳转到统一入口…</main>;
}
