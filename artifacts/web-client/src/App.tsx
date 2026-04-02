import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import Layout from "./components/Layout";
import OverviewPage from "./pages/OverviewPage";
import UsersPage from "./pages/UsersPage";
import MatchesPage from "./pages/MatchesPage";

type Page = "overview" | "users" | "matches";

export default function App() {
  const [token, setToken] = useState<string>(localStorage.getItem("adminToken") || "");
  const [page, setPage] = useState<Page>("overview");

  function handleLogin(t: string) {
    setToken(t);
  }

  function handleLogout() {
    localStorage.removeItem("adminToken");
    setToken("");
  }

  function handleUnauth() {
    localStorage.removeItem("adminToken");
    setToken("");
  }

  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <Layout page={page} onNavigate={setPage} onLogout={handleLogout}>
      {page === "overview" && (
        <OverviewPage token={token} onUnauth={handleUnauth} onNavigateUsers={() => setPage("users")} />
      )}
      {page === "users" && (
        <UsersPage token={token} onUnauth={handleUnauth} />
      )}
      {page === "matches" && (
        <MatchesPage token={token} onUnauth={handleUnauth} />
      )}
    </Layout>
  );
}
