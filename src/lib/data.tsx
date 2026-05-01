// MISSION
export interface MISSIONPLACEHOLDER {
  id: string;
  text: string;
  tag: string;
  color: "neutral" | "alert" | "focus" | "flow";
  done: boolean;
}
export const COLORS = {
  neutral: { label: "Neutral", bg: "bg-brand-bg-m1", text: "text-brand-tx-m1" },
  alert: { label: "Alert", bg: "bg-brand-bg-m2", text: "text-brand-tx-m2" },
  focus: { label: "Focus", bg: "bg-brand-bg-m3", text: "text-brand-tx-m3" },
  flow: { label: "Flow", bg: "bg-brand-bg-m4", text: "text-brand-tx-m4" },
};

// VAULT
export const DEFAULT_SUBJECTS = [
  "Math",
  "Chemistry",
  "Physics",
  "Biology",
  "Khmer Literature",
  "History",
  "Foreign Language",
  "Morality - Civics",
  "Geography",
  "Earth Science",
];
export type Category = "formula" | "whiteboard" | "past_paper" | null;
export interface FileMetadata {
  file: File;
  subject: string;
  category: Category;
  previewUrl: string;
  customTag: string;
}
export interface VaultItem {
  id: string;
  url: string;
  fileName: string;
  fileType: string;
  category: string;
  subject: string;
  customTag: string;
  createdAt?: {
    seconds: number;
    nanoseconds: number;
  };
}

export const SWIPE_ANIMATIONS = {
  whiteboard: { x: 1000, y: 0, rotate: 20 },
  past_paper: { x: -1000, y: 0, rotate: -20 },
  formula: { x: 0, y: -1000, rotate: 0 },
  default: { x: 0, y: 0, rotate: 0 },
};
