/**
 * Shared types — minimal stubs for Phase 0. Expand in later phases.
 */

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

export type NotificationType =
  | 'budget_alert'
  | 'habit_reminder'
  | 'bill_reminder'
  | 'streak_alert'
  | 'weekly_summary'
  | 'sync_status'
  | 'goal_milestone';
