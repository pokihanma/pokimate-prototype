/**
 * Shared types — minimal stubs for Phase 0. Expand in later phases.
 */

/** Matches Rust SessionInfo from auth_commands. */
export interface SessionInfo {
  session_id: string;
  user_id: string;
  username: string;
  display_name: string;
  role: string;
  expires_at: string;
}

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

export type NotificationType =
  | 'budget_alert'
  | 'habit_reminder'
  | 'bill_reminder'
  | 'streak_alert'
  | 'weekly_summary'
  | 'sync_status'
  | 'goal_milestone';
