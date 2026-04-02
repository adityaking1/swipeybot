import { useEffect, useState, useCallback } from "react";
import { apiUsers, apiUserDetail, apiUpdateUser, apiDeleteUser, photoUrl } from "../api/client";
import type { User } from "../api/client";

interface UserDetailData {
  user: User; likesGiven: number; likesReceived: number; matchCount: number;
}

interface Props { token: string; onUnauth: () => void; }

export default function UsersPage({ onUnauth }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<UserDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const data = await apiUsers({ page: p, limit: 20, search, gender, status });
      setUsers(data.users);
      setTotal(data.total);
      setPages(data.pages);
      setPage(p);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "UNAUTHORIZED") onUnauth();
    } finally {
      setLoading(false);
    }
  }, [search, gender, status, onUnauth]);

  useEffect(() => { load(1); }, [load]);

  async function openDetail(telegramId: string) {
    setDetailLoading(true);
    setDetail(null);
    try {
      const data = await apiUserDetail(telegramId);
      setDetail(data);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "UNAUTHORIZED") onUnauth();
    } finally {
      setDetailLoading(false);
    }
  }

  async function toggleActive(u: User) {
    try {
      await apiUpdateUser(u.telegramId, { isActive: !u.isActive });
      setUsers((prev) => prev.map((x) => x.telegramId === u.telegramId ? { ...x, isActive: !u.isActive } : x));
      if (detail?.user.telegramId === u.telegramId) {
        setDetail((d) => d ? { ...d, user: { ...d.user, isActive: !d.user.isActive } } : d);
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "UNAUTHORIZED") onUnauth();
    }
  }

  async function deleteUser(telegramId: string) {
    try {
      await apiDeleteUser(telegramId);
      setUsers((prev) => prev.filter((x) => x.telegramId !== telegramId));
      setTotal((t) => t - 1);
      setConfirmDelete(null);
      if (detail?.user.telegramId === telegramId) setDetail(null);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "UNAUTHORIZED") onUnauth();
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-white text-xl font-bold">Pengguna</h1>
        <p className="text-gray-400 text-sm">{total} total pengguna terdaftar</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(1)}
          placeholder="Cari nama / username / ID..."
          className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
        <select value={gender} onChange={(e) => setGender(e.target.value)} className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
          <option value="">Semua Gender</option>
          <option value="pria">Pria</option>
          <option value="wanita">Wanita</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
        <button onClick={() => load(1)} className="bg-pink-600 hover:bg-pink-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
          Cari
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm animate-pulse">Memuat...</div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-500 text-sm">Tidak ada pengguna ditemukan</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Pengguna</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3 hidden sm:table-cell">Gender</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3 hidden md:table-cell">Usia</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3 hidden lg:table-cell">Limit Harian</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Status</th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map((u) => (
                  <tr key={u.telegramId} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.photoFileId ? (
                          <img src={photoUrl(u.photoFileId)} alt={u.name} className="w-8 h-8 rounded-full object-cover bg-gray-800 flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">{u.gender === "pria" ? "🧔" : "👩"}</div>
                        )}
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate max-w-[120px]">{u.name}</p>
                          {u.username && <p className="text-gray-500 text-xs">@{u.username}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-gray-300">{u.gender === "pria" ? "🧔 Pria" : "👩 Wanita"}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-300">{u.age} thn</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-gray-300">{u.dailyUsed}/{u.dailyLimit}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${u.isActive ? "bg-green-900/40 text-green-400 border border-green-800" : "bg-gray-800 text-gray-500"}`}>
                        {u.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openDetail(u.telegramId)} title="Detail" className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">👁</button>
                        <button onClick={() => toggleActive(u)} title={u.isActive ? "Nonaktifkan" : "Aktifkan"} className="p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-gray-700 rounded-lg transition-colors">
                          {u.isActive ? "🔇" : "✅"}
                        </button>
                        <button onClick={() => setConfirmDelete(u.telegramId)} title="Hapus" className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors">🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-gray-500 text-xs">Halaman {page} dari {pages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => load(page - 1)} className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-gray-400 hover:text-white disabled:opacity-40 text-sm transition-colors">← Sebelumnya</button>
            <button disabled={page >= pages} onClick={() => load(page + 1)} className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-gray-400 hover:text-white disabled:opacity-40 text-sm transition-colors">Selanjutnya →</button>
          </div>
        </div>
      )}

      {(detail || detailLoading) && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {detailLoading ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm animate-pulse">Memuat detail...</div>
            ) : detail && (
              <>
                <div className="relative">
                  {detail.user.photoFileId ? (
                    <img src={photoUrl(detail.user.photoFileId)} alt={detail.user.name} className="w-full h-56 object-cover rounded-t-2xl" />
                  ) : (
                    <div className="w-full h-56 bg-gray-800 rounded-t-2xl flex items-center justify-center text-6xl">
                      {detail.user.gender === "pria" ? "🧔" : "👩"}
                    </div>
                  )}
                  <button onClick={() => setDetail(null)} className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">✕</button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="text-white text-xl font-bold">{detail.user.name}</h3>
                    {detail.user.username && <p className="text-gray-400 text-sm">@{detail.user.username}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      { label: "Gender", value: detail.user.gender === "pria" ? "🧔 Pria" : "👩 Wanita" },
                      { label: "Usia", value: `${detail.user.age} tahun` },
                      { label: "Telegram ID", value: detail.user.telegramId },
                      { label: "Status", value: detail.user.isActive ? "✅ Aktif" : "❌ Nonaktif" },
                      { label: "Like Diberikan", value: String(detail.likesGiven) },
                      { label: "Like Diterima", value: String(detail.likesReceived) },
                      { label: "Total Match", value: String(detail.matchCount) },
                      { label: "Limit Harian", value: `${detail.user.dailyUsed}/${detail.user.dailyLimit}` },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-gray-800 rounded-lg p-3">
                        <p className="text-gray-500 text-xs mb-0.5">{label}</p>
                        <p className="text-white font-medium">{value}</p>
                      </div>
                    ))}
                  </div>
                  {detail.user.bio && (
                    <div className="bg-gray-800 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-1">Bio</p>
                      <p className="text-white text-sm">{detail.user.bio}</p>
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => toggleActive(detail.user)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${detail.user.isActive ? "bg-yellow-600/20 border border-yellow-700 text-yellow-400 hover:bg-yellow-600/30" : "bg-green-600/20 border border-green-700 text-green-400 hover:bg-green-600/30"}`}
                    >
                      {detail.user.isActive ? "🔇 Nonaktifkan" : "✅ Aktifkan"}
                    </button>
                    <button
                      onClick={() => { setDetail(null); setConfirmDelete(detail.user.telegramId); }}
                      className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-red-900/20 border border-red-800 text-red-400 hover:bg-red-900/30 transition-colors"
                    >
                      🗑 Hapus Akun
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-bold text-lg mb-2">Hapus Pengguna?</h3>
            <p className="text-gray-400 text-sm mb-5">Semua data termasuk likes dan matches akan dihapus permanen.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm font-medium transition-colors">Batal</button>
              <button onClick={() => deleteUser(confirmDelete)} className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
