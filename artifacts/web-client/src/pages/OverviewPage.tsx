import { useEffect, useState } from "react";
import { apiStats, apiUsers, photoUrl } from "../api/client";
import type { User } from "../api/client";

interface Stats {
  totalUsers: number; activeUsers: number; totalMatches: number;
  newToday: number; maleCount: number; femaleCount: number; avgAge: number;
}

interface StatCardProps {
  icon: string; label: string; value: number | string; color: string; sub?: string;
}

function StatCard({ icon, label, value, color, sub }: StatCardProps) {
  return (
    <div className={`bg-gray-900 border ${color} rounded-xl p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-1">{label}</p>
          <p className="text-white text-3xl font-bold">{value}</p>
          {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

interface Props { token: string; onUnauth: () => void; onNavigateUsers: () => void; }

export default function OverviewPage({ onUnauth, onNavigateUsers }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, u] = await Promise.all([apiStats(), apiUsers({ page: 1, limit: 5 })]);
        setStats(s);
        setRecentUsers(u.users);
      } catch (e: unknown) {
        if (e instanceof Error && e.message === "UNAUTHORIZED") onUnauth();
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [onUnauth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm animate-pulse">Memuat data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-xl font-bold">Overview</h1>
        <p className="text-gray-400 text-sm">Ringkasan statistik SwipeyBot</p>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="👥" label="Total Pengguna" value={stats.totalUsers} color="border-blue-800/50" sub={`${stats.maleCount} pria · ${stats.femaleCount} wanita`} />
            <StatCard icon="✅" label="Pengguna Aktif" value={stats.activeUsers} color="border-green-800/50" sub={`${stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}% dari total`} />
            <StatCard icon="💑" label="Total Match" value={stats.totalMatches} color="border-pink-800/50" />
            <StatCard icon="🆕" label="Daftar Hari Ini" value={stats.newToday} color="border-orange-800/50" sub="24 jam terakhir" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">Distribusi Gender</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🧔</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: stats.totalUsers ? `${(stats.maleCount / stats.totalUsers) * 100}%` : "0%" }} />
                  </div>
                  <span className="text-white text-sm font-medium w-8 text-right">{stats.maleCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">👩</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-2">
                    <div className="bg-pink-500 h-2 rounded-full" style={{ width: stats.totalUsers ? `${(stats.femaleCount / stats.totalUsers) * 100}%` : "0%" }} />
                  </div>
                  <span className="text-white text-sm font-medium w-8 text-right">{stats.femaleCount}</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col justify-center">
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Rata-rata Usia</p>
              <p className="text-white text-4xl font-bold">{stats.avgAge}</p>
              <p className="text-gray-500 text-xs mt-1">tahun</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col justify-center">
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Tingkat Aktivitas</p>
              <p className="text-white text-4xl font-bold">
                {stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%
              </p>
              <p className="text-gray-500 text-xs mt-1">pengguna aktif</p>
            </div>
          </div>
        </>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="text-white font-semibold text-sm">Pengguna Terbaru</h3>
          <button onClick={onNavigateUsers} className="text-pink-400 hover:text-pink-300 text-xs">Lihat semua →</button>
        </div>
        <div className="divide-y divide-gray-800">
          {recentUsers.map((u) => (
            <div key={u.telegramId} className="flex items-center gap-3 px-5 py-3">
              {u.photoFileId ? (
                <img src={photoUrl(u.photoFileId)} alt={u.name} className="w-9 h-9 rounded-full object-cover bg-gray-800" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-sm">
                  {u.gender === "pria" ? "🧔" : "👩"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{u.name}</p>
                <p className="text-gray-500 text-xs">{u.gender === "pria" ? "Pria" : "Wanita"} · {u.age} tahun</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${u.isActive ? "bg-green-900/40 text-green-400 border border-green-800" : "bg-gray-800 text-gray-500"}`}>
                {u.isActive ? "Aktif" : "Nonaktif"}
              </span>
            </div>
          ))}
          {recentUsers.length === 0 && (
            <div className="px-5 py-8 text-center text-gray-500 text-sm">Belum ada pengguna</div>
          )}
        </div>
      </div>
    </div>
  );
}
