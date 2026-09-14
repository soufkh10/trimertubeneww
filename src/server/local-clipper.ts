import { createReadStream, existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { spawn } from "node:child_process";

import { nanoid } from "nanoid";

import {
  type ClipDefinition,
  type ExportJob,
  type ExportMode,
  type LocalProjectDetail,
  type LocalProjectSummary,
  type ToolingStatus,
} from "@/lib/local-clipper-types";
import { formatMsToTimestamp, parseTimestampToMs } from "@/lib/time";
import { slugify } from "@/lib/utils";

type StoredProject = LocalProjectSummary;

type YtDlpMetadata = {
  title?: string;
  thumbnail?: string | null;
  duration?: number | null;
};

const APP_ROOT = path.join(process.cwd(), ".clip-pilot");
const PROJECTS_ROOT = path.join(APP_ROOT, "projects");

export async function ensureAppDirectories() {
  await mkdir(PROJECTS_ROOT, { recursive: true });
}

async function runCommand(
  command: string,
  args: string[],
  options?: { cwd?: string },
) {
  return await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options?.cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr.trim() || stdout.trim() || `${command} exited with code ${code}.`));
    });
  });
}

async function commandExists(command: string) {
  try {
    await runCommand("bash", ["-lc", `command -v ${command}`]);
    return true;
  } catch {
    return false;
  }
}

export async function getToolingStatus(): Promise<ToolingStatus> {
  const [ytDlp, ffmpeg, ffprobe] = await Promise.all([
    commandExists("yt-dlp"),
    commandExists("ffmpeg"),
    commandExists("ffprobe"),
  ]);

  const missing = [
    !ytDlp ? "yt-dlp" : null,
    !ffmpeg ? "ffmpeg" : null,
    !ffprobe ? "ffprobe" : null,
  ].filter(Boolean) as string[];

  return {
    ytDlp,
    ffmpeg,
    ffprobe,
    ready: missing.length === 0,
    missing,
  };
}

function assertYouTubeUrl(value: string) {
  const url = value.trim();

  if (!/^https?:\/\//i.test(url)) {
    throw new Error("Paste a full YouTube URL starting with http:// or https://");
  }

  if (!/(youtube\.com|youtu\.be)/i.test(url)) {
    throw new Error("This MVP currently supports YouTube URLs only.");
  }

  return url;
}

function getProjectPaths(projectId: string) {
  return {
    sourceDir: path.join(PROJECTS_ROOT, projectId, "source"),
    exportsDir: path.join(PROJECTS_ROOT, projectId, "exports"),
    jobsDir: path.join(PROJECTS_ROOT, projectId, "jobs"),
    projectFile: path.join(PROJECTS_ROOT, projectId, "project.json"),
  };
}

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function findDownloadedSourceFile(sourceDir: string) {
  const files = await readdir(sourceDir);
  const candidate = files.find((fileName) => {
    return (
      fileName.startsWith("source.") &&
      !fileName.endsWith(".part") &&
      !fileName.endsWith(".ytdl") &&
      !fileName.endsWith(".json")
    );
  });

  if (!candidate) {
    throw new Error("The source video downloaded, but no media file was found.");
  }

  return candidate;
}

async function getDurationMsFromFile(filePath: string) {
  const { stdout } = await runCommand("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);

  const durationSeconds = Number.parseFloat(stdout.trim());

  if (!Number.isFinite(durationSeconds)) {
    throw new Error("Unable to determine downloaded video duration.");
  }

  return Math.round(durationSeconds * 1000);
}

export async function importYouTubeProject(rawUrl: string): Promise<LocalProjectDetail> {
  const tooling = await getToolingStatus();

  if (!tooling.ready) {
    throw new Error(`Missing required tools: ${tooling.missing.join(", ")}.`);
  }

  const sourceUrl = assertYouTubeUrl(rawUrl);
  await ensureAppDirectories();

  const projectId = nanoid(10);
  const paths = getProjectPaths(projectId);

  await Promise.all([
    mkdir(paths.sourceDir, { recursive: true }),
    mkdir(paths.exportsDir, { recursive: true }),
    mkdir(paths.jobsDir, { recursive: true }),
  ]);

  const metadataResult = await runCommand("yt-dlp", [
    "--dump-single-json",
    "--no-playlist",
    "--no-warnings",
    sourceUrl,
  ]);
  const metadata = JSON.parse(metadataResult.stdout) as YtDlpMetadata;

  await runCommand("yt-dlp", [
    "--no-playlist",
    "--no-warnings",
    "--output",
    path.join(paths.sourceDir, "source.%(ext)s"),
    sourceUrl,
  ]);

  const sourceFileName = await findDownloadedSourceFile(paths.sourceDir);
  const sourcePath = path.join(paths.sourceDir, sourceFileName);
  const durationMs =
    metadata.duration && Number.isFinite(metadata.duration)
      ? Math.round(metadata.duration * 1000)
      : await getDurationMsFromFile(sourcePath);

  const now = new Date().toISOString();
  const project: StoredProject = {
    id: projectId,
    sourceUrl,
    title: metadata.title?.trim() || `Project ${projectId}`,
    thumbnailUrl: metadata.thumbnail ?? null,
    durationMs,
    sourceFileName,
    createdAt: now,
    updatedAt: now,
  };

  await writeJson(paths.projectFile, project);

  return {
    ...project,
    sourceVideoUrl: `/api/local/projects/${projectId}/source`,
    clipsDirectory: paths.exportsDir,
  };
}

export async function listLocalProjects(): Promise<LocalProjectSummary[]> {
  await ensureAppDirectories();
  const directories = await readdir(PROJECTS_ROOT, { withFileTypes: true });

  const projects = await Promise.all(
    directories
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const projectFile = path.join(PROJECTS_ROOT, entry.name, "project.json");

        if (!existsSync(projectFile)) {
          return null;
        }

        return await readJson<StoredProject>(projectFile);
      }),
  );

  return projects
    .filter((project): project is StoredProject => Boolean(project))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function getLocalProject(projectId: string): Promise<LocalProjectDetail> {
  const paths = getProjectPaths(projectId);

  if (!existsSync(paths.projectFile)) {
    throw new Error("Project not found.");
  }

  const project = await readJson<StoredProject>(paths.projectFile);

  return {
    ...project,
    sourceVideoUrl: `/api/local/projects/${project.id}/source`,
    clipsDirectory: paths.exportsDir,
  };
}

export async function getProjectSourcePath(projectId: string) {
  const project = await getLocalProject(projectId);
  return path.join(getProjectPaths(projectId).sourceDir, project.sourceFileName);
}

function sanitizeClipFileName(value: string, fallback: string) {
  const base = slugify(value) || slugify(fallback) || "clip";
  return `${base}.mp4`;
}

async function persistProjectUpdatedAt(projectId: string) {
  const paths = getProjectPaths(projectId);
  const project = await readJson<StoredProject>(paths.projectFile);
  project.updatedAt = new Date().toISOString();
  await writeJson(paths.projectFile, project);
}

async function saveExportJob(projectId: string, job: ExportJob) {
  const jobFile = path.join(getProjectPaths(projectId).jobsDir, `${job.id}.json`);
  await writeJson(jobFile, job);
}

export async function getExportJob(projectId: string, jobId: string) {
  const jobFile = path.join(getProjectPaths(projectId).jobsDir, `${jobId}.json`);

  if (!existsSync(jobFile)) {
    throw new Error("Export job not found.");
  }

  return await readJson<ExportJob>(jobFile);
}

async function updateExportJob(
  projectId: string,
  jobId: string,
  updater: (current: ExportJob) => ExportJob,
) {
  const current = await getExportJob(projectId, jobId);
  const next = updater({
    ...current,
    updatedAt: new Date().toISOString(),
  });
  await saveExportJob(projectId, next);
  return next;
}

function buildFfmpegArgs({
  inputPath,
  outputPath,
  start,
  end,
  mode,
}: {
  inputPath: string;
  outputPath: string;
  start: string;
  end: string;
  mode: ExportMode;
}) {
  const durationMs = parseTimestampToMs(end) - parseTimestampToMs(start);

  if (mode === "fast") {
    return [
      "-y",
      "-ss",
      start,
      "-i",
      inputPath,
      "-t",
      formatMsToTimestamp(durationMs),
      "-c",
      "copy",
      "-movflags",
      "+faststart",
      outputPath,
    ];
  }

  return [
    "-y",
    "-i",
    inputPath,
    "-ss",
    start,
    "-t",
    formatMsToTimestamp(durationMs),
    "-c:v",
    "libx264",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    outputPath,
  ];
}

async function processExportJob(projectId: string, jobId: string) {
  const sourcePath = await getProjectSourcePath(projectId);
  const job = await updateExportJob(projectId, jobId, (current) => ({
    ...current,
    status: "PROCESSING",
    errorMessage: null,
  }));

  let failedItems = 0;

  for (const item of job.items) {
    await updateExportJob(projectId, jobId, (current) => ({
      ...current,
      items: current.items.map((candidate) =>
        candidate.id === item.id
          ? {
              ...candidate,
              status: "PROCESSING",
              errorMessage: null,
            }
          : candidate,
      ),
    }));

    const outputPath = path.join(job.outputDirectory, item.outputFileName);

    try {
      await runCommand(
        "ffmpeg",
        buildFfmpegArgs({
          inputPath: sourcePath,
          outputPath,
          start: item.start,
          end: item.end,
          mode: job.mode,
        }),
      );

      await updateExportJob(projectId, jobId, (current) => ({
        ...current,
        items: current.items.map((candidate) =>
          candidate.id === item.id
            ? {
                ...candidate,
                status: "COMPLETED",
                downloadUrl: `/api/local/projects/${projectId}/exports/${jobId}/files/${item.id}`,
              }
            : candidate,
        ),
      }));
    } catch (error) {
      failedItems += 1;

      await updateExportJob(projectId, jobId, (current) => ({
        ...current,
        items: current.items.map((candidate) =>
          candidate.id === item.id
            ? {
                ...candidate,
                status: "FAILED",
                errorMessage:
                  error instanceof Error ? error.message : "Clip export failed.",
              }
            : candidate,
        ),
      }));
    }
  }

  await updateExportJob(projectId, jobId, (current) => ({
    ...current,
    status: failedItems > 0 ? "FAILED" : "COMPLETED",
    errorMessage:
      failedItems > 0
        ? `${failedItems} clip${failedItems === 1 ? "" : "s"} failed during export.`
        : null,
  }));
}

export async function createExportJob({
  projectId,
  clips,
  mode,
}: {
  projectId: string;
  clips: ClipDefinition[];
  mode: ExportMode;
}) {
  const tooling = await getToolingStatus();

  if (!tooling.ready) {
    throw new Error(`Missing required tools: ${tooling.missing.join(", ")}.`);
  }

  const project = await getLocalProject(projectId);
  const validatedClips = clips
    .map((clip, index) => {
      const startMs = parseTimestampToMs(clip.start);
      const endMs = parseTimestampToMs(clip.end);

      if (endMs <= startMs) {
        throw new Error(`Clip ${index + 1}: end time must be greater than start time.`);
      }

      if (endMs > project.durationMs) {
        throw new Error(`Clip ${index + 1}: end time exceeds the source duration.`);
      }

      return clip;
    })
    .filter((clip) => clip.start.trim() && clip.end.trim());

  if (validatedClips.length === 0) {
    throw new Error("Add at least one valid clip before exporting.");
  }

  const jobId = nanoid(10);
  const createdAt = new Date().toISOString();
  const outputDirectory = path.join(getProjectPaths(projectId).exportsDir, jobId);

  await mkdir(outputDirectory, { recursive: true });

  const job: ExportJob = {
    id: jobId,
    projectId,
    mode,
    status: "QUEUED",
    createdAt,
    updatedAt: createdAt,
    outputDirectory,
    errorMessage: null,
    items: validatedClips.map((clip, index) => ({
      id: clip.id || nanoid(8),
      name: clip.name.trim() || `Clip ${String(index + 1).padStart(2, "0")}`,
      start: clip.start,
      end: clip.end,
      status: "PENDING",
      outputFileName: sanitizeClipFileName(
        clip.name,
        `${project.title}-clip-${String(index + 1).padStart(2, "0")}`,
      ),
      downloadUrl: null,
      errorMessage: null,
    })),
  };

  await saveExportJob(projectId, job);
  await persistProjectUpdatedAt(projectId);
  void processExportJob(projectId, jobId);

  return job;
}

export async function getExportItemPath({
  projectId,
  jobId,
  itemId,
}: {
  projectId: string;
  jobId: string;
  itemId: string;
}) {
  const job = await getExportJob(projectId, jobId);
  const item = job.items.find((candidate) => candidate.id === itemId);

  if (!item) {
    throw new Error("Clip file not found.");
  }

  const filePath = path.join(job.outputDirectory, item.outputFileName);

  if (!existsSync(filePath)) {
    throw new Error("Clip file not found.");
  }

  return {
    filePath,
    fileName: item.outputFileName,
  };
}

function getContentType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".mp3":
      return "audio/mpeg";
    default:
      return "application/octet-stream";
  }
}

export async function createFileResponse(filePath: string, rangeHeader: string | null) {
  const fileStats = await stat(filePath);
  const contentType = getContentType(filePath);

  if (!rangeHeader) {
    return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileStats.size),
        "Accept-Ranges": "bytes",
      },
    });
  }

  const matches = /bytes=(\d+)-(\d*)/.exec(rangeHeader);

  if (!matches) {
    return new Response("Invalid range request.", { status: 416 });
  }

  const start = Number.parseInt(matches[1], 10);
  const end = matches[2] ? Number.parseInt(matches[2], 10) : fileStats.size - 1;

  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || end >= fileStats.size) {
    return new Response("Invalid range request.", { status: 416 });
  }

  const chunkSize = end - start + 1;

  return new Response(
    Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream,
    {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(chunkSize),
        "Content-Range": `bytes ${start}-${end}/${fileStats.size}`,
        "Accept-Ranges": "bytes",
      },
    },
  );
}
