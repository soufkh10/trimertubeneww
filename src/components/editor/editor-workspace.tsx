"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { OutputFormat, OutputQuality, Plan, SourceType } from "@prisma/client";
import { useFieldArray, useForm } from "react-hook-form";
import { Loader2, Plus, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { TimelineSlider } from "@/components/editor/timeline-slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatBytes } from "@/lib/utils";
import { formatDuration, formatMsToTimestamp, parseTimestampToMs } from "@/lib/time";

const editorSchema = z.object({
  sourceType: z.nativeEnum(SourceType),
  sourceUrl: z.string().optional(),
  outputFormat: z.nativeEnum(OutputFormat),
  outputQuality: z.nativeEnum(OutputQuality),
  rightsConfirmed: z.boolean(),
  ranges: z.array(
    z.object({
      start: z.string().min(1),
      end: z.string().min(1),
    }),
  ),
});

type EditorValues = z.infer<typeof editorSchema>;

type JobStatus = {
  id: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  outputUrl: string | null;
  errorMessage: string | null;
  title: string | null;
  outputFormat: OutputFormat;
};

export function EditorWorkspace({
  initialSourceUrl,
  userPlan,
  isSignedIn,
}: {
  initialSourceUrl?: string;
  userPlan: Plan;
  isSignedIn: boolean;
}) {
  const defaultSourceType = initialSourceUrl?.includes("youtu")
    ? SourceType.YOUTUBE_PREVIEW
    : initialSourceUrl
      ? SourceType.DIRECT_MEDIA_URL
      : SourceType.UPLOAD;

  const form = useForm<EditorValues>({
    resolver: zodResolver(editorSchema),
    defaultValues: {
      sourceType: defaultSourceType,
      sourceUrl: initialSourceUrl ?? "",
      outputFormat: OutputFormat.MP4,
      outputQuality: userPlan === Plan.PRO ? OutputQuality.HIGH : OutputQuality.STANDARD,
      rightsConfirmed: false,
      ranges: [{ start: "00:00:00.000", end: "00:00:30.000" }],
    },
  });
  const ranges = useFieldArray({
    control: form.control,
    name: "ranges",
  });
  const [sourceMetadata, setSourceMetadata] = useState<{
    title: string;
    thumbnailUrl: string | null;
    embedUrl?: string;
    exportAllowed: boolean;
  } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const sourceType = form.watch("sourceType");
  const values = form.watch();
  const activeRange = values.ranges[0];
  const startMs = useMemo(() => {
    try {
      return activeRange ? parseTimestampToMs(activeRange.start) : 0;
    } catch {
      return 0;
    }
  }, [activeRange]);
  const endMs = useMemo(() => {
    try {
      return activeRange ? parseTimestampToMs(activeRange.end) : 0;
    } catch {
      return 0;
    }
  }, [activeRange]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  useEffect(() => {
    if (jobs.length === 0 || jobs.every((job) => job.status === "COMPLETED" || job.status === "FAILED")) {
      return;
    }

    const interval = window.setInterval(async () => {
      const updates = await Promise.all(
        jobs.map(async (job) => {
          const response = await fetch(`/api/jobs/${job.id}`);
          if (!response.ok) return job;
          return (await response.json()).job as JobStatus;
        }),
      );

      setJobs(updates);
    }, 3_000);

    return () => window.clearInterval(interval);
  }, [jobs]);

  async function resolveSource() {
    const sourceUrl = form.getValues("sourceUrl");

    if (!sourceUrl) {
      toast.error("Add a source URL to preview metadata.");
      return;
    }

    setLoadingMetadata(true);

    try {
      const response = await fetch("/api/media/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to preview this source.");
      }

      setSourceMetadata(data.metadata);
      form.setValue("sourceType", data.metadata.type);
      toast.success("Source loaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to preview the source.");
    } finally {
      setLoadingMetadata(false);
    }
  }

  async function onSubmit(values: EditorValues) {
    setSubmitting(true);

    try {
      if (values.sourceType === SourceType.YOUTUBE_PREVIEW) {
        throw new Error(
          "YouTube links are available for preview and timestamp planning only. Use your own uploaded file or a direct media URL you are allowed to process for exports.",
        );
      }

      let uploadedObjectKey: string | null = null;

      if (values.sourceType === SourceType.UPLOAD) {
        if (!selectedFile) {
          throw new Error("Choose a video file before exporting.");
        }

        const presignResponse = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: selectedFile.name,
            contentType: selectedFile.type || "video/mp4",
            fileSizeBytes: selectedFile.size,
          }),
        });
        const presignData = await presignResponse.json();

        if (!presignResponse.ok) {
          throw new Error(presignData.error || "Unable to prepare upload.");
        }

        const uploadResponse = await fetch(presignData.upload.uploadUrl, {
          method: presignData.upload.method,
          headers: {
            "Content-Type": selectedFile.type || "application/octet-stream",
          },
          body: selectedFile,
        });

        if (!uploadResponse.ok) {
          throw new Error("Upload failed.");
        }

        uploadedObjectKey = presignData.upload.key;
      }

      const payload = {
        sourceType: values.sourceType,
        sourceUrl:
          values.sourceType === SourceType.UPLOAD
            ? "https://local.upload"
            : values.sourceUrl,
        uploadedObjectKey,
        title: sourceMetadata?.title ?? selectedFile?.name ?? null,
        thumbnailUrl: sourceMetadata?.thumbnailUrl ?? null,
        outputFormat: values.outputFormat,
        outputQuality: values.outputQuality,
        rightsConfirmed: values.rightsConfirmed,
        fileSizeBytes: selectedFile?.size ?? null,
        ranges: values.ranges,
      };

      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to create job.");
      }

      setJobs(data.jobs);
      toast.success(`${data.jobs.length} job${data.jobs.length > 1 ? "s" : ""} queued.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create job.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/70 bg-muted/30">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Editor</Badge>
            <Badge variant="secondary">{userPlan}</Badge>
            {!isSignedIn ? (
              <Badge variant="outline">Sign in to save history</Badge>
            ) : null}
          </div>
          <CardTitle className="text-3xl">Create precise clips with rights-aware guardrails</CardTitle>
          <p className="text-sm text-muted-foreground">
            Public YouTube URLs are preview-only. Downloadable exports are limited to uploaded files and direct media URLs that you own or are authorized to process.
          </p>
        </CardHeader>
        <CardContent className="space-y-8 pt-6">
          <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 sm:grid-cols-3">
              <button
                type="button"
                className={`rounded-2xl border p-4 text-left ${sourceType === SourceType.YOUTUBE_PREVIEW ? "border-primary bg-primary/5" : "border-border"}`}
                onClick={() => form.setValue("sourceType", SourceType.YOUTUBE_PREVIEW)}
              >
                <div className="font-medium">YouTube preview</div>
                <div className="mt-1 text-sm text-muted-foreground">Official embed playback for timing only.</div>
              </button>
              <button
                type="button"
                className={`rounded-2xl border p-4 text-left ${sourceType === SourceType.UPLOAD ? "border-primary bg-primary/5" : "border-border"}`}
                onClick={() => form.setValue("sourceType", SourceType.UPLOAD)}
              >
                <div className="font-medium">Upload video</div>
                <div className="mt-1 text-sm text-muted-foreground">Upload a video file for export.</div>
              </button>
              <button
                type="button"
                className={`rounded-2xl border p-4 text-left ${sourceType === SourceType.DIRECT_MEDIA_URL ? "border-primary bg-primary/5" : "border-border"}`}
                onClick={() => form.setValue("sourceType", SourceType.DIRECT_MEDIA_URL)}
              >
                <div className="font-medium">Direct media URL</div>
                <div className="mt-1 text-sm text-muted-foreground">Use an owned MP4/WebM link if accessible.</div>
              </button>
            </div>

            {sourceType === SourceType.UPLOAD ? (
              <div className="space-y-3 rounded-2xl border border-dashed border-border p-5">
                <Label htmlFor="video-upload">Upload video file</Label>
                <Input
                  id="video-upload"
                  type="file"
                  accept="video/*"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                />
                {selectedFile ? (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <UploadCloud className="h-4 w-4 text-primary" />
                    <span>{selectedFile.name}</span>
                    <span>{formatBytes(selectedFile.size)}</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <Label htmlFor="sourceUrl">Source URL</Label>
                  <Input id="sourceUrl" {...form.register("sourceUrl")} placeholder="https://..." />
                </div>
                <div className="self-end">
                  <Button type="button" variant="outline" onClick={resolveSource} disabled={loadingMetadata}>
                    {loadingMetadata ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Preview
                  </Button>
                </div>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-3xl border border-border bg-black/80">
                  {sourceType === SourceType.YOUTUBE_PREVIEW && sourceMetadata?.embedUrl ? (
                    <iframe
                      src={sourceMetadata.embedUrl}
                      title={sourceMetadata.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="aspect-video w-full"
                    />
                  ) : previewUrl || form.getValues("sourceUrl") ? (
                    <video
                      src={previewUrl ?? form.getValues("sourceUrl")}
                      controls
                      className="aspect-video w-full"
                      onLoadedMetadata={(event) => {
                        const videoDurationMs = Math.floor(event.currentTarget.duration * 1000);
                        setDurationMs(videoDurationMs);
                        if (videoDurationMs > 0) {
                          form.setValue("ranges.0.end", formatMsToTimestamp(Math.min(videoDurationMs, 30_000)));
                        }
                      }}
                    />
                  ) : (
                    <div className="flex aspect-video items-center justify-center p-8 text-center text-sm text-white/70">
                      Load a source to preview your clip.
                    </div>
                  )}
                </div>
                {durationMs > 0 ? (
                  <TimelineSlider
                    durationMs={durationMs}
                    startMs={startMs}
                    endMs={Math.min(endMs || durationMs, durationMs)}
                    onChange={({ startMs: nextStartMs, endMs: nextEndMs }) => {
                      form.setValue("ranges.0.start", formatMsToTimestamp(nextStartMs));
                      form.setValue("ranges.0.end", formatMsToTimestamp(nextEndMs));
                    }}
                  />
                ) : null}
              </div>

              <div className="space-y-4 rounded-3xl border border-border/80 bg-muted/20 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="outputFormat">Output format</Label>
                    <Select id="outputFormat" {...form.register("outputFormat")}>
                      <option value={OutputFormat.MP4}>MP4</option>
                      <option value={OutputFormat.WEBM}>WebM</option>
                      <option value={OutputFormat.MP3}>MP3 audio-only</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="outputQuality">Quality</Label>
                    <Select id="outputQuality" {...form.register("outputQuality")}>
                      <option value={OutputQuality.STANDARD}>Standard</option>
                      <option value={OutputQuality.HIGH} disabled={userPlan !== Plan.PRO}>
                        High quality {userPlan !== Plan.PRO ? "(Pro)" : ""}
                      </option>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Clip ranges</div>
                      <div className="text-sm text-muted-foreground">
                        {userPlan === Plan.PRO
                          ? "Create one or multiple ranges from the same source."
                          : "Free includes one clip range per job."}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => ranges.append({ start: "00:00:00.000", end: "00:00:30.000" })}
                      disabled={userPlan !== Plan.PRO}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add range
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {ranges.fields.map((field, index) => (
                      <div key={field.id} className="rounded-2xl border border-border/80 bg-background p-4">
                        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
                          <div className="space-y-2">
                            <Label htmlFor={`start-${index}`}>Start time</Label>
                            <Input id={`start-${index}`} placeholder="00:00:00.000" {...form.register(`ranges.${index}.start`)} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`end-${index}`}>End time</Label>
                            <Input id={`end-${index}`} placeholder="00:00:30.000" {...form.register(`ranges.${index}.end`)} />
                          </div>
                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => ranges.remove(index)}
                              disabled={index === 0}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                          Duration preview:{" "}
                          {(() => {
                            try {
                              return formatDuration(
                                parseTimestampToMs(form.getValues(`ranges.${index}.end`)) -
                                  parseTimestampToMs(form.getValues(`ranges.${index}.start`)),
                              );
                            } catch {
                              return "Invalid";
                            }
                          })()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="rightsConfirmed"
                      checked={values.rightsConfirmed}
                      onCheckedChange={(checked) => form.setValue("rightsConfirmed", Boolean(checked))}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="rightsConfirmed">
                        I confirm I own this content or have permission to create this clip.
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Users are responsible for copyright, licensing, and platform compliance.
                      </p>
                    </div>
                  </div>
                </div>

                <Button className="w-full" type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Export clip
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Current source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="font-medium text-foreground">
              {sourceMetadata?.title ?? selectedFile?.name ?? "No source loaded"}
            </div>
            <div>Plan: {userPlan}</div>
            <div>Signed in: {isSignedIn ? "Yes" : "No"}</div>
            <div>Duration: {durationMs > 0 ? formatDuration(durationMs) : "Preview to detect length"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Job progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {jobs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                Your queued jobs will appear here with status updates and download links.
              </div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="rounded-2xl border border-border/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{job.title ?? `Clip ${job.id.slice(0, 8)}`}</div>
                      <div className="text-xs text-muted-foreground">{job.outputFormat}</div>
                    </div>
                    <Badge variant={job.status === "COMPLETED" ? "default" : "secondary"}>
                      {job.status.toLowerCase()}
                    </Badge>
                  </div>
                  {job.errorMessage ? (
                    <p className="mt-3 text-sm text-danger">{job.errorMessage}</p>
                  ) : null}
                  {job.outputUrl ? (
                    <Button asChild className="mt-4 w-full" variant="outline">
                      <a href={job.outputUrl} target="_blank" rel="noreferrer">
                        Download clip
                      </a>
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
