import { useState } from "react";
import type { UserInfo } from "../App";

interface Props {
  onStart: (info: UserInfo) => void;
}

export default function LandingPage({ onStart }: Props) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nama tidak boleh kosong");
      return;
    }
    if (!gender) {
      setError("Pilih jenis kelamin");
      return;
    }
    onStart({ name: name.trim(), gender });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">💬</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            SwipeyBot
          </h1>
          <p className="text-gray-400 mt-2 text-lg">Random Chat</p>
          <p className="text-gray-500 text-sm mt-1">
            Ngobrol dengan orang baru secara anonim
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl"
        >
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nama atau Nama Panggilan
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="Contoh: Budi, Siti, Anonymous..."
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Jenis Kelamin
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setGender("Pria");
                  setError("");
                }}
                className={`py-3 rounded-xl border font-medium transition text-sm ${
                  gender === "Pria"
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-gray-800 border-gray-700 text-gray-300 hover:border-blue-600"
                }`}
              >
                👨 Pria
              </button>
              <button
                type="button"
                onClick={() => {
                  setGender("Wanita");
                  setError("");
                }}
                className={`py-3 rounded-xl border font-medium transition text-sm ${
                  gender === "Wanita"
                    ? "bg-pink-600 border-pink-500 text-white"
                    : "bg-gray-800 border-gray-700 text-gray-300 hover:border-pink-600"
                }`}
              >
                👩 Wanita
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 transition shadow-lg shadow-purple-900/40 active:scale-95"
          >
            Mulai Chat 🚀
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-6">
          Identitasmu tetap anonim. Tidak ada data yang disimpan.
        </p>
      </div>
    </div>
  );
}
