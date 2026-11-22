import type { Recurrence } from "./recurrence";

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  due_date: string | null;
  due_time: string | null;
  priority: 1 | 2 | 3 | 4;
  is_top: boolean;
  energy: "heavy" | "light" | null;
  estimate_min: number | null;
  labels: string[];
  someday: boolean;
  recurrence_rule: Recurrence | null;
  postpone_count: number;
  completed_at: string | null;
  parent_id: string | null;
};

export type Block = {
  id: string;
  type: string;
  position: number;
  size: "sm" | "md" | "lg";
  title: string | null;
  config: Record<string, unknown>;
  visible: boolean;
};
