import { useEffect, useState, useCallback } from "react";
import { apiMatches, photoUrl } from "../api/client";
import type { MatchEnriched, User } from "../api/client";

interface Props { token: string; onUnauth: () => void; }

function UserAvatar({ user }: { user: User | null }) {
  if (!user) return <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-sm">?</div>;
  if (user.photoFileId) return <img src={photoUrl(user.photoFileId)} alt={user.name} className="w-10 h-10 rounded-full object-cover bg-gray-800" />;
  return <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">{user.gender === "pria" ? "🧔" : "👩"}</div>;
}

export default function MatchesPage({ onUnauth }: Props) {
  const [matches, setMatches] = useState<MatchEnriched[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const data = await apiMatches({ page: p, limit: 20 });
      setMatches(data.matches);
      setTotal(data.total);
      setPages(data.pages);
      setPage(p);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "UNAUTHORIZED") onUnauth();
    } finally {
      setLoading(false);
    }
  }, [onUnauth]);

  useEffect(() => { load(1); }, [load]);

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-white text-xl font-bold">Matches</h1>
        <p className="text-gray-400 text-sm">{total} total pasangan yang match</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm animate-pulse">Memuat...</div>
        ) : matches.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-500 text-sm">Belum ada match</div>
        ) : (
          <div className="divide-y divide-gray-800">
            {matches.map((m) => (
              <div key={m._id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <UserAvatar user={m.user1} />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{m.user1?.name || "Tidak diketahui"}</p>
                    <p className="text-gray-500 text-xs">{m.user1?.gender === "pria" ? "Pria" : m.user1?.gender === "wanita" ? "Wanita" : "—"} · {m.user1?.age ?? "?"}thn</p>
                  </div>
                </div>
                <div className="flex flex-col items-center flex-shrink-0">
                  <span className="text-2xl">💘</span>
                  <p className="text-gray-600 text-xs mt-1">{formatDate(m.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                  <div className="min-w-0 text-right">
                    <p className="text-white text-sm font-medium truncate">{m.user2?.name || "Tidak diketahui"}</p>
                    <p className="text-gray-500 text-xs">{m.user2?.gender === "pria" ? "Pria" : m.user2?.gender === "wanita" ? "Wanita" : "—"} · {m.user2?.age ?? "?"}thn</p>
                  </div>
                  <UserAvatar user={m.user2} />
                </div>
              </div>
            ))}
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
    </div>
  );
}
