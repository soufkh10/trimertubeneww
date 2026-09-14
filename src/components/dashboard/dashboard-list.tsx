"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Download, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatBytes } from "@/lib/utils";

type DashboardJob = {
  id: string;
  title: string | null;
  thumbnailUrl: string | null;
  status: string;
  createdAt: string;
  startMs: number;
  endMs: number;
  outputFormat: string;
  outputSizeBytes: number | null;
  downloadUrl: string | null;
};

export function DashboardList({ jobs }: { jobs: DashboardJob[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);

    try {
      const response = await fetch(`/api/jobs/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete clip.");
      }

      toast.success("Clip removed.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="flex min-h-64 flex-col items-center justify-center gap-4 text-center">
          <h2 className="text-2xl font-semibold">No saved exports yet</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Your completed clips will appear here once you create jobs while signed in.
          </p>
          <Button asChild>
            <a href="/app">Open the editor</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {jobs.map((job) => (
        <Card key={job.id}>
          <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-32 overflow-hidden rounded-2xl bg-muted">
                {job.thumbnailUrl ? (
                  <Image src={job.thumbnailUrl} alt={job.title ?? "Clip thumbnail"} fill className="object-cover" />
                ) : null}
              </div>
              <div className="space-y-1">
                <div className="font-medium">{job.title ?? "Untitled clip"}</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(job.createdAt).toLocaleString()} • {(job.endMs - job.startMs) / 1000}s • {job.outputFormat}
                </div>
                <div className="text-sm text-muted-foreground">
                  Size: {formatBytes(job.outputSizeBytes)}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={job.status === "COMPLETED" ? "default" : "secondary"}>
                {job.status.toLowerCase()}
              </Badge>
              {job.downloadUrl ? (
                <Button asChild variant="outline">
                  <a href={job.downloadUrl} target="_blank" rel="noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </a>
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleDelete(job.id)}
                disabled={deletingId === job.id}
              >
                {deletingId === job.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
