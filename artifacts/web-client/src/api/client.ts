const BASE = "/api/admin";

function getToken(): string {
  return localStorage.getItem("adminToken") || "";
}

function headers(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

export async function apiLogin(password: string): Promise<string> {
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error("Password salah");
  const data = await res.json() as { token: string };
  return data.token;
}

export async function apiStats() {
  const res = await fetch(`${BASE}/stats`, { headers: headers() });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  return res.json() as Promise<{
    totalUsers: number; activeUsers: number; totalMatches: number;
    newToday: number; maleCount: number; femaleCount: number; avgAge: number;
  }>;
}

export async function apiUsers(params: {
  page?: number; limit?: number; search?: string; gender?: string; status?: string;
}) {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.search) q.set("search", params.search);
  if (params.gender) q.set("gender", params.gender);
  if (params.status) q.set("status", params.status);
  const res = await fetch(`${BASE}/users?${q}`, { headers: headers() });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  return res.json() as Promise<{
    users: User[]; total: number; page: number; pages: number;
  }>;
}

export async function apiUserDetail(telegramId: string) {
  const res = await fetch(`${BASE}/users/${telegramId}`, { headers: headers() });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  return res.json() as Promise<{
    user: User; likesGiven: number; likesReceived: number; matchCount: number;
  }>;
}

export async function apiUpdateUser(telegramId: string, data: { isActive?: boolean; dailyLimit?: number }) {
  const res = await fetch(`${BASE}/users/${telegramId}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  return res.json();
}

export async function apiDeleteUser(telegramId: string) {
  const res = await fetch(`${BASE}/users/${telegramId}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  return res.json();
}

export async function apiMatches(params: { page?: number; limit?: number }) {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  const res = await fetch(`${BASE}/matches?${q}`, { headers: headers() });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  return res.json() as Promise<{
    matches: MatchEnriched[]; total: number; page: number; pages: number;
  }>;
}

export function photoUrl(fileId: string): string {
  return `${BASE}/photos/${fileId}`;
}

export interface User {
  telegramId: string;
  username?: string;
  name: string;
  age: number;
  gender: "pria" | "wanita";
  bio?: string;
  photoFileId?: string;
  isActive: boolean;
  dailyUsed: number;
  dailyLimit: number;
  createdAt: string;
}

export interface MatchEnriched {
  _id: string;
  user1Id: string;
  user2Id: string;
  user1: User | null;
  user2: User | null;
  createdAt: string;
}
