import Link from "next/link";

type MenuCard = {
  href: string;
  title: string;
  description: string;
  emoji: string;
};

const MENU: MenuCard[] = [
  {
    href: "/inventory",
    title: "在庫一覧",
    description: "現在庫数・有効期限・発注点をまとめて確認",
    emoji: "📦",
  },
  {
    href: "/inventory?action=in",
    title: "入庫",
    description: "納品物品の入庫登録（ロット・期限）",
    emoji: "📥",
  },
  {
    href: "/inventory?action=out",
    title: "出庫",
    description: "診療・処置で使用した物品を記録",
    emoji: "📤",
  },
  {
    href: "/stocktake",
    title: "棚卸",
    description: "実在庫と帳簿在庫の差異を記録",
    emoji: "📋",
  },
  {
    href: "/orders",
    title: "発注",
    description: "発注点を下回った物品の自動発注案",
    emoji: "🛒",
  },
  {
    href: "/reports",
    title: "レポート",
    description: "消費量・廃棄・期限切れの集計",
    emoji: "📊",
  },
  {
    href: "/settings",
    title: "設定",
    description: "クリニック・スタッフ・通知設定",
    emoji: "⚙️",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-[--background]">
      <header className="bg-white border-b border-zinc-200">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#00b5ad] text-white text-lg font-bold"
            >
              P
            </span>
            <div>
              <h1 className="text-xl font-bold text-[#00b5ad] tracking-tight">
                PecoStock
              </h1>
              <p className="text-xs text-zinc-500">
                PECO動物病院 在庫管理システム
              </p>
            </div>
          </div>
          <nav className="text-sm text-zinc-600">
            <span className="hidden sm:inline">PECO Animal Hospital</span>
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-10">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-zinc-900">
            メニュー
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            iPad での操作に最適化されています。
          </p>
        </section>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MENU.map((card) => (
            <li key={card.href}>
              <Link
                href={card.href}
                className="block min-h-[120px] rounded-2xl bg-white border border-zinc-200 p-5 transition hover:border-[#00b5ad] hover:shadow-md active:scale-[0.99]"
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl" aria-hidden>
                    {card.emoji}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900">
                      {card.title}
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1">
                      {card.description}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <section className="mt-12 border-t border-zinc-200 pt-8">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
            他システム
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <a
              href="#"
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 hover:border-[#00b5ad] min-h-[64px]"
            >
              <div>
                <div className="font-medium text-zinc-900">診断支援</div>
                <div className="text-xs text-zinc-500">
                  Diagnosis Assistant
                </div>
              </div>
              <span className="text-zinc-400" aria-hidden>
                →
              </span>
            </a>
            <a
              href="#"
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 hover:border-[#00b5ad] min-h-[64px]"
            >
              <div>
                <div className="font-medium text-zinc-900">SFA</div>
                <div className="text-xs text-zinc-500">Sales Force</div>
              </div>
              <span className="text-zinc-400" aria-hidden>
                →
              </span>
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 text-xs text-zinc-500 flex justify-between">
          <span>© PECO Animal Hospital</span>
          <span>v0.1 · Phase 0</span>
        </div>
      </footer>
    </div>
  );
}
