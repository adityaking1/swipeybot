import { useState } from "react";

type Page = "overview" | "users" | "matches";

interface Props {
  page: Page;
  onNavigate: (p: Page) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const navItems: { id: Page; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "users", label: "Pengguna", icon: "👥" },
  { id: "matches", label: "Matches", icon: "💑" },
];

export default function Layout({ page, onNavigate, onLogout, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-gray-900 border-r border-gray-800 flex flex-col z-30 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800">
          <span className="text-3xl">💘</span>
          <div>
            <p className="text-white font-bold text-sm">SwipeyBot</p>
            <p className="text-gray-500 text-xs">Admin Dashboard</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { onNavigate(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                page === item.id
                  ? "bg-pink-600/20 text-pink-400 border border-pink-600/30"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-gray-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
          >
            <span className="text-lg">🚪</span>
            Keluar
          </button>
        </div>
      </aside>

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-4 sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white lg:hidden"
          >
            ☰
          </button>
          <h2 className="text-white font-semibold text-sm">
            {navItems.find((n) => n.id === page)?.icon}{" "}
            {navItems.find((n) => n.id === page)?.label}
          </h2>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
