import { useState } from "react";
import LandingPage from "./pages/LandingPage";
import ChatPage from "./pages/ChatPage";

export type UserInfo = {
  name: string;
  gender: string;
};

export type AppView = "landing" | "chat";

export default function App() {
  const [view, setView] = useState<AppView>("landing");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  function handleStart(info: UserInfo) {
    setUserInfo(info);
    setView("chat");
  }

  function handleBack() {
    setUserInfo(null);
    setView("landing");
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {view === "landing" && <LandingPage onStart={handleStart} />}
      {view === "chat" && userInfo && (
        <ChatPage userInfo={userInfo} onBack={handleBack} />
      )}
    </div>
  );
}
