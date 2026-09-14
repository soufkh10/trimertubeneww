"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Scissors,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type {
  ClipDefinition,
  ExportJob,
  ExportMode,
  LocalProjectDetail,
  LocalProjectSummary,
  ToolingStatus,
} from "@/lib/local-clipper-types";
import { formatDuration, formatMsToTimestamp, parseTimestampToMs } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

function createClip(partial?: Partial<ClipDefinition>): ClipDefinition {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `clip-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    id,
    name: "",
    start: "00:00:00.000",
    end: "00:00:30.000",
    ...partial,
  };
}

function createInitialClip(durationMs?: number) {
  return createClip({
    end:
      durationMs && durationMs < 30_000 ? formatMsToTimestamp(durationMs) : "00:00:30.000",
  });
}

function getClipDuration(start: string, end: string) {
  try {
    const durationMs = parseTimestampToMs(end) - parseTimestampToMs(start);
    return durationMs > 0 ? formatDuration(durationMs) : "Invalid range";
  } catch {
    return "Invalid range";
  }
}

function getJobStatusTone(status: ExportJob["status"]) {
  switch (status) {
    case "COMPLETED":
      return "default";
    case "FAILED":
      return "outline";
    default:
      return "secondary";
  }
}

export function LocalClipperWorkspace() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [tooling, setTooling] = useState<ToolingStatus | null>(null);
  const [projects, setProjects] = useState<LocalProjectSummary[]>([]);
  const [currentProject, setCurrentProject] = useState<LocalProjectDetail | null>(null);
  const [clips, setClips] = useState<ClipDefinition[]>([createInitialClip()]);
  const [mode, setMode] = useState<ExportMode>("fast");
  const [currentJob, setCurrentJob] = useState<ExportJob | null>(null);
  const [importing, setImporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [playerTimeMs, setPlayerTimeMs] = useState(0);

  async function loadTooling() {
    const response = await fetch("/api/local/tooling");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to check local tools.");
    }

    setTooling(data.tooling);
  }

  async function loadProjects() {
    const response = await fetch("/api/local/projects");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to load local projects.");
    }

    setProjects(data.projects);
    return data.projects as LocalProjectSummary[];
  }

  async function openProject(projectId: string) {
    setRefreshing(true);

    try {
      const response = await fetch(`/api/local/projects/${projectId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to open project.");
      }

      setCurrentProject(data.project);
      setCurrentJob(null);
      setClips([createInitialClip(data.project.durationMs)]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to open project.");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        await loadTooling();
        const loadedProjects = await loadProjects();

        if (loadedProjects.length > 0) {
          const latestProject = loadedProjects[0];
          const response = await fetch(`/api/local/projects/${latestProject.id}`);
          const data = await response.json();

          if (response.ok) {
            setCurrentProject(data.project);
          }
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to start the workspace.");
      }
    }

    void bootstrap();
  }, []);

  useEffect(() => {
    if (!currentJob || (currentJob.status !== "QUEUED" && currentJob.status !== "PROCESSING")) {
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        const response = await fetch(
          `/api/local/projects/${currentJob.projectId}/exports/${currentJob.id}`,
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to refresh export status.");
        }

        setCurrentJob(data.job);
      } catch (error) {
        window.clearInterval(interval);
        toast.error(error instanceof Error ? error.message : "Unable to refresh export status.");
      }
    }, 2_000);

    return () => window.clearInterval(interval);
  }, [currentJob]);

  function updateClip(clipId: string, field: keyof ClipDefinition, value: string) {
    setClips((current) =>
      current.map((clip) => (clip.id === clipId ? { ...clip, [field]: value } : clip)),
    );
  }

  function setClipBoundary(clipId: string, field: "start" | "end") {
    const timestamp = formatMsToTimestamp(playerTimeMs);
    updateClip(clipId, field, timestamp);
  }

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setImporting(true);
    setCurrentJob(null);

    try {
      const response = await fetch("/api/local/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ youtubeUrl }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to import this YouTube video.");
      }

      setCurrentProject(data.project);
      setProjects((current) => [data.project, ...current.filter((item) => item.id !== data.project.id)]);
      setClips([createInitialClip(data.project.durationMs)]);
      toast.success("Source video downloaded locally. You can start clipping now.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to import this YouTube video.");
    } finally {
      setImporting(false);
    }
  }

  async function handleExport() {
    if (!currentProject) {
      toast.error("Import or open a project first.");
      return;
    }

    setExporting(true);

    try {
      const response = await fetch(`/api/local/projects/${currentProject.id}/exports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          clips,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to start batch export.");
      }

      setCurrentJob(data.job);
      toast.success("Batch export started.");
      await loadProjects();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start batch export.");
    } finally {
      setExporting(false);
    }
  }

  const installCommand = "brew install yt-dlp ffmpeg";

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden border-primary/20 bg-card/90 shadow-lg shadow-primary/5">
        <CardHeader className="border-b border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.14),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,255,255,0.7))] dark:bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.18),transparent_38%),linear-gradient(180deg,rgba(15,23,42,0.65),rgba(15,23,42,0.3))]">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Localhost MVP</Badge>
            <Badge variant="secondary">One download, many clips</Badge>
            <Badge variant="outline">Exports to your machine</Badge>
          </div>
          <CardTitle className="max-w-3xl text-3xl sm:text-4xl">
            Build batches of podcast clips from one YouTube source.
          </CardTitle>
          <CardDescription className="max-w-3xl text-base">
            Paste a YouTube link, download the full source once with `yt-dlp`, then mark as
            many timestamp ranges as you want and export them with `ffmpeg`.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={handleImport} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="youtube-url">YouTube URL</Label>
              <Input
                id="youtube-url"
                value={youtubeUrl}
                onChange={(event) => setYoutubeUrl(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
            <Button type="submit" size="lg" disabled={importing || !youtubeUrl.trim()}>
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Downloading source...
                </>
              ) : (
                <>
                  <Scissors className="mr-2 h-4 w-4" />
                  Import and download source
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground">
              The first import can take a while because the app downloads the full source video
              to your computer before clipping.
            </p>
          </form>

          <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Local tools</p>
                <p className="text-sm text-muted-foreground">
                  `yt-dlp`, `ffmpeg`, and `ffprobe` must exist on this machine.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void loadTooling().catch((error) => {
                    toast.error(
                      error instanceof Error ? error.message : "Unable to refresh tooling.",
                    );
                  });
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={tooling?.ytDlp ? "default" : "outline"}>
                yt-dlp {tooling?.ytDlp ? "ready" : "missing"}
              </Badge>
              <Badge variant={tooling?.ffmpeg ? "default" : "outline"}>
                ffmpeg {tooling?.ffmpeg ? "ready" : "missing"}
              </Badge>
              <Badge variant={tooling?.ffprobe ? "default" : "outline"}>
                ffprobe {tooling?.ffprobe ? "ready" : "missing"}
              </Badge>
            </div>
            {!tooling?.ready ? (
              <div className="rounded-2xl border border-border/80 bg-background/70 p-4 text-sm">
                <p className="font-medium text-foreground">Install command</p>
                <code className="mt-2 block rounded-xl bg-muted px-3 py-2 text-xs sm:text-sm">
                  {installCommand}
                </code>
              </div>
            ) : (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                The clipper is ready to download and export locally.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 xl:grid-cols-[0.84fr_1.16fr]">
        <Card className="h-fit">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-2xl">Recent projects</CardTitle>
              <CardDescription>
                Reopen a source you already downloaded and clip it again.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={refreshing}
              onClick={() => {
                setRefreshing(true);
                void loadProjects()
                  .catch((error) => {
                    toast.error(
                      error instanceof Error ? error.message : "Unable to refresh projects.",
                    );
                  })
                  .finally(() => setRefreshing(false));
              }}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {projects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 p-5 text-sm text-muted-foreground">
                No local projects yet. Import your first podcast above.
              </div>
            ) : (
              projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => void openProject(project.id)}
                  className={cn(
                    "w-full rounded-2xl border p-4 text-left transition hover:border-primary/40 hover:bg-accent/40",
                    currentProject?.id === project.id
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/80 bg-background/60",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{project.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDuration(project.durationMs)}
                      </p>
                    </div>
                    <Badge variant="secondary">Local</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {project.sourceUrl}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-8">
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border/70">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-2xl">
                    {currentProject ? currentProject.title : "Open a source to start clipping"}
                  </CardTitle>
                  <CardDescription>
                    {currentProject
                      ? `Duration: ${formatDuration(currentProject.durationMs)}`
                      : "Your downloaded source video will appear here for local preview."}
                  </CardDescription>
                </div>
                {currentProject ? (
                  <Badge variant="secondary">
                    Player time {formatMsToTimestamp(playerTimeMs)}
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              {currentProject ? (
                <>
                  <div className="overflow-hidden rounded-2xl border border-border/80 bg-black">
                    <video
                      controls
                      preload="metadata"
                      className="aspect-video w-full"
                      poster={currentProject.thumbnailUrl ?? undefined}
                      src={currentProject.sourceVideoUrl}
                      onTimeUpdate={(event) => {
                        setPlayerTimeMs(Math.round(event.currentTarget.currentTime * 1000));
                      }}
                    />
                  </div>
                  <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 text-sm text-muted-foreground">
                    Clips export into:
                    <code className="ml-2 rounded-lg bg-background px-2 py-1 text-xs text-foreground">
                      {currentProject.clipsDirectory}
                    </code>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/80 p-10 text-center text-sm text-muted-foreground">
                  Import a YouTube video to download the source locally and preview it here.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border/70">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-2xl">Clip planner</CardTitle>
                  <CardDescription>
                    Stamp start and end times from the player, duplicate rows, then export the
                    full batch.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setClips((current) => [...current, createInitialClip()])}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add clip
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="grid gap-4 md:grid-cols-[1fr_180px_180px_140px]">
                <div className="space-y-2">
                  <Label htmlFor="mode">Cut mode</Label>
                  <Select
                    id="mode"
                    value={mode}
                    onChange={(event) => setMode(event.target.value as ExportMode)}
                  >
                    <option value="fast">Fast copy cut</option>
                    <option value="accurate">Accurate re-encode cut</option>
                  </Select>
                </div>
                <div className="md:col-span-3 rounded-2xl border border-border/80 bg-muted/30 p-4 text-sm text-muted-foreground">
                  {mode === "fast"
                    ? "Fast mode is quicker and keeps the original streams when possible, but the cut can land slightly before the exact frame."
                    : "Accurate mode re-encodes the clip for cleaner, more exact cuts and is better when timing precision matters."}
                </div>
              </div>

              <div className="space-y-4">
                {clips.map((clip, index) => (
                  <div key={clip.id} className="rounded-2xl border border-border/80 bg-background/80 p-4">
                    <div className="grid gap-4 xl:grid-cols-[1.2fr_180px_180px_auto]">
                      <div className="space-y-2">
                        <Label>Clip name</Label>
                        <Input
                          value={clip.name}
                          onChange={(event) => updateClip(clip.id, "name", event.target.value)}
                          placeholder={`Clip ${String(index + 1).padStart(2, "0")}`}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Start</Label>
                        <Input
                          value={clip.start}
                          onChange={(event) => updateClip(clip.id, "start", event.target.value)}
                          placeholder="00:32:00.000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End</Label>
                        <Input
                          value={clip.end}
                          onChange={(event) => updateClip(clip.id, "end", event.target.value)}
                          placeholder="00:57:31.000"
                        />
                      </div>
                      <div className="flex flex-wrap items-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setClipBoundary(clip.id, "start")}
                          disabled={!currentProject}
                        >
                          Set start
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setClipBoundary(clip.id, "end")}
                          disabled={!currentProject}
                        >
                          Set end
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setClips((current) => [
                              ...current,
                              createClip({
                                name: clip.name ? `${clip.name} copy` : "",
                                start: clip.start,
                                end: clip.end,
                              }),
                            ])
                          }
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={clips.length === 1}
                          onClick={() =>
                            setClips((current) => current.filter((item) => item.id !== clip.id))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>Duration: {getClipDuration(clip.start, clip.end)}</span>
                      <span>Format: `HH:MM:SS.mmm`</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="button" size="lg" onClick={handleExport} disabled={exporting || !currentProject}>
                  {exporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting export...
                    </>
                  ) : (
                    <>
                      <Scissors className="mr-2 h-4 w-4" />
                      Export all clips
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setClips([createInitialClip(currentProject?.durationMs)])}
                >
                  Reset list
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border/70">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-2xl">Batch export</CardTitle>
                  <CardDescription>
                    Polling stays local in the browser while the server cuts each clip in
                    sequence.
                  </CardDescription>
                </div>
                {currentJob ? (
                  <Badge variant={getJobStatusTone(currentJob.status)}>{currentJob.status}</Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {!currentJob ? (
                <div className="rounded-2xl border border-dashed border-border/80 p-5 text-sm text-muted-foreground">
                  No export started yet. When you export a batch, each clip will appear here with
                  its own download link.
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 text-sm">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="secondary">Mode: {currentJob.mode}</Badge>
                      <span className="text-muted-foreground">
                        Output folder:
                        <code className="ml-2 rounded-lg bg-background px-2 py-1 text-xs text-foreground">
                          {currentJob.outputDirectory}
                        </code>
                      </span>
                    </div>
                    {currentJob.errorMessage ? (
                      <p className="mt-3 text-sm text-danger">{currentJob.errorMessage}</p>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    {currentJob.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/80 bg-background/80 p-4"
                      >
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.start} to {item.end}
                          </p>
                          {item.errorMessage ? (
                            <p className="text-sm text-danger">{item.errorMessage}</p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={
                              item.status === "COMPLETED"
                                ? "default"
                                : item.status === "FAILED"
                                  ? "outline"
                                  : "secondary"
                            }
                          >
                            {item.status}
                          </Badge>
                          {item.downloadUrl ? (
                            <Button asChild size="sm">
                              <a href={item.downloadUrl}>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </a>
                            </Button>
                          ) : item.status === "PROCESSING" ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : item.status === "COMPLETED" ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
