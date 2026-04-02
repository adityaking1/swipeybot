import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { UserInfo } from "../App";

interface Props {
  userInfo: UserInfo;
  onBack: () => void;
}

interface Message {
  id: string;
  text: string;
  senderName: string;
  isMe: boolean;
  timestamp: string;
}

type Status = "connecting" | "waiting" | "chatting" | "disconnected";

export default function ChatPage({ userInfo, onBack }: Props) {
  const [status, setStatus] = useState<Status>("connecting");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [partnerGender, setPartnerGender] = useState("");
  const [roomId, setRoomId] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const socket = io({ path: "/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("waiting");
      socket.emit("join_queue", {
        name: userInfo.name,
        gender: userInfo.gender,
      });
    });

    socket.on("waiting", () => {
      setStatus("waiting");
    });

    socket.on("matched", ({ roomId, partnerName, partnerGender }: {
      roomId: string;
      partnerName: string;
      partnerGender: string;
    }) => {
      setRoomId(roomId);
      setPartnerName(partnerName);
      setPartnerGender(partnerGender);
      setStatus("chatting");
      setMessages([{
        id: "system-start",
        text: `Kamu terhubung dengan ${partnerName} (${partnerGender}). Halo! 👋`,
        senderName: "system",
        isMe: false,
        timestamp: new Date().toISOString(),
      }]);
      setTimeout(() => inputRef.current?.focus(), 100);
    });

    socket.on("receive_message", ({ message, senderName, timestamp }: {
      message: string;
      senderName: string;
      timestamp: string;
    }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `${timestamp}-${Math.random()}`,
          text: message,
          senderName,
          isMe: false,
          timestamp,
        },
      ]);
    });

    socket.on("partner_disconnected", () => {
      setStatus("disconnected");
      setMessages((prev) => [
        ...prev,
        {
          id: "system-disconnected",
          text: `${partnerName || "Partner"} telah keluar dari chat.`,
          senderName: "system",
          isMe: false,
          timestamp: new Date().toISOString(),
        },
      ]);
    });

    socket.on("left", () => {
      setStatus("disconnected");
    });

    socket.on("disconnect", () => {
      if (status !== "disconnected") {
        setStatus("disconnected");
      }
    });

    return () => {
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo]);

  function sendMessage() {
    if (!input.trim() || !socketRef.current || status !== "chatting") return;
    const text = input.trim();
    const timestamp = new Date().toISOString();
    setMessages((prev) => [
      ...prev,
      {
        id: `${timestamp}-me`,
        text,
        senderName: userInfo.name,
        isMe: true,
        timestamp,
      },
    ]);
    socketRef.current.emit("send_message", { roomId, message: text });
    setInput("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleLeave() {
    socketRef.current?.emit("leave_chat");
    onBack();
  }

  function handleFindNew() {
    socketRef.current?.disconnect();
    onBack();
  }

  const genderEmoji = (g: string) => (g === "Pria" ? "👨" : g === "Wanita" ? "👩" : "👤");

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 shadow-md">
        <div className="flex items-center gap-3">
          {status === "chatting" ? (
            <>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-lg">
                {genderEmoji(partnerGender)}
              </div>
              <div>
                <p className="font-semibold text-white text-sm">{partnerName}</p>
                <p className="text-xs text-green-400">Online</p>
              </div>
            </>
          ) : status === "waiting" || status === "connecting" ? (
            <div>
              <p className="font-semibold text-white text-sm">Mencari partner...</p>
              <p className="text-xs text-yellow-400">Menunggu</p>
            </div>
          ) : (
            <div>
              <p className="font-semibold text-white text-sm">Chat berakhir</p>
              <p className="text-xs text-red-400">Terputus</p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {status === "disconnected" && (
            <button
              onClick={handleFindNew}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition"
            >
              Cari Baru
            </button>
          )}
          <button
            onClick={handleLeave}
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition"
          >
            Keluar
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {(status === "connecting" || status === "waiting") && (
          <div className="flex flex-col items-center justify-center h-full min-h-64 gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-purple-700 border-t-purple-400 animate-spin" />
            </div>
            <p className="text-gray-400 text-sm">Menunggu partner untuk terhubung...</p>
            <p className="text-gray-600 text-xs">Kamu akan otomatis terhubung ketika ada user lain masuk</p>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.senderName === "system") {
            return (
              <div key={msg.id} className="text-center">
                <span className="text-xs text-gray-500 bg-gray-900 px-3 py-1 rounded-full">
                  {msg.text}
                </span>
              </div>
            );
          }
          return (
            <div
              key={msg.id}
              className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[75%] ${msg.isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                {!msg.isMe && (
                  <span className="text-xs text-gray-500 px-1">{msg.senderName}</span>
                )}
                <div
                  className={`px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.isMe
                      ? "bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-br-sm"
                      : "bg-gray-800 text-gray-100 rounded-bl-sm"
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-xs text-gray-600 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-3 bg-gray-900 border-t border-gray-800">
        {status === "chatting" ? (
          <div className="flex gap-2 items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pesan..."
              maxLength={500}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition text-sm"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center disabled:opacity-40 transition active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </div>
        ) : status === "disconnected" ? (
          <div className="text-center">
            <p className="text-gray-500 text-sm mb-2">Chat telah berakhir</p>
            <button
              onClick={handleFindNew}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-medium hover:from-pink-400 hover:to-purple-500 transition"
            >
              Cari Partner Baru
            </button>
          </div>
        ) : (
          <div className="text-center text-gray-500 text-sm py-1">
            Menunggu koneksi...
          </div>
        )}
      </div>
    </div>
  );
}
