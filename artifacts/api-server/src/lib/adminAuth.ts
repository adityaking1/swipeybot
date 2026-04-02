import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_SECRET || "admin-fallback-secret";

export function createAdminToken(): string {
  return jwt.sign({ role: "admin" }, SECRET, { expiresIn: "24h" });
}

export function verifyAdminToken(token: string): boolean {
  try {
    const payload = jwt.verify(token, SECRET) as Record<string, unknown>;
    return payload.role === "admin";
  } catch {
    return false;
  }
}
