export type ToolingStatus = {
  ytDlp: boolean;
  ffmpeg: boolean;
  ffprobe: boolean;
  ready: boolean;
  missing: string[];
};

export type LocalProjectSummary = {
  id: string;
  sourceUrl: string;
  title: string;
  thumbnailUrl: string | null;
  durationMs: number;
  sourceFileName: string;
  createdAt: string;
  updatedAt: string;
};

export type LocalProjectDetail = LocalProjectSummary & {
  sourceVideoUrl: string;
  clipsDirectory: string;
};

export type ClipDefinition = {
  id: string;
  name: string;
  start: string;
  end: string;
};

export type ExportMode = "fast" | "accurate";

export type ExportItemStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export type ExportItem = {
  id: string;
  name: string;
  start: string;
  end: string;
  status: ExportItemStatus;
  outputFileName: string;
  downloadUrl: string | null;
  errorMessage: string | null;
};

export type ExportJobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

export type ExportJob = {
  id: string;
  projectId: string;
  mode: ExportMode;
  status: ExportJobStatus;
  createdAt: string;
  updatedAt: string;
  outputDirectory: string;
  items: ExportItem[];
  errorMessage: string | null;
};
