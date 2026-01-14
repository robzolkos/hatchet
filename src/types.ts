// Core types for the worktree manager

export interface Worktree {
  branch: string;
  path: string;
  head?: string;
  isBare?: boolean;
}

export interface FizzyBoard {
  id: string;
  name: string;
  description?: string;
}

export interface FizzyColumnColor {
  name: string;
  value: string; // CSS variable like "var(--color-card-3)"
}

export interface FizzyColumn {
  id: string | symbol;
  name: string;
  kind?: string;
  position?: number;
  color?: FizzyColumnColor;
  pseudo?: boolean;
}

export interface FizzyCard {
  id: string;
  number: number;
  title: string;
  description?: string;
  description_html?: string;
  status: string;
  column_title?: string;
  column?: {
    id: string;
    name: string;
    color?: FizzyColumnColor;
  };
  steps?: FizzyStep[];
  tags?: string[];
  creator?: {
    id: string;
    name: string;
  };
  created_at?: string;
  last_active_at?: string;
  board?: {
    id: string;
    name: string;
  };
}

export interface FizzyStep {
  id: string;
  content: string;
  completed: boolean;
}

export interface GitHubPR {
  number: number;
  title: string;
  state: "open" | "closed" | "merged";
  headRef: string;        // Branch name
  headSha: string;        // Short SHA
  baseRef: string;        // Target branch (main, etc.)
  author: string;
  createdAt: string;
  updatedAt: string;
  body?: string;
  labels?: string[];
  reviewDecision?: "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED" | null;
  isDraft: boolean;
  additions?: number;
  deletions?: number;
  changedFiles?: number;
}