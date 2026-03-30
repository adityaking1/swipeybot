export type BotState =
  | "idle"
  | "await_name"
  | "await_gender"
  | "await_interest"
  | "await_age"
  | "await_bio"
  | "await_location"
  | "await_photo"
  | "await_edit_choice"
  | "await_edit_name"
  | "await_edit_age"
  | "await_edit_bio"
  | "await_edit_location"
  | "await_edit_photo"
  | "browsing"
  | "await_send_message"
  | "await_report_reason";

const userStates = new Map<string, BotState>();
const userTempData = new Map<string, Record<string, string>>();

export function getState(telegramId: string): BotState {
  return userStates.get(telegramId) || "idle";
}

export function setState(telegramId: string, state: BotState) {
  userStates.set(telegramId, state);
}

export function getTempData(telegramId: string): Record<string, string> {
  return userTempData.get(telegramId) || {};
}

export function setTempData(telegramId: string, data: Record<string, string>) {
  userTempData.set(telegramId, { ...(userTempData.get(telegramId) || {}), ...data });
}

export function clearTempData(telegramId: string) {
  userTempData.delete(telegramId);
}
