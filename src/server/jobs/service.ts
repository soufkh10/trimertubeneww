import {
  MediaJobStatus,
  OutputQuality,
  Plan,
  SourceType,
} from "@prisma/client";

import { getPlanLimits } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { enqueueTrimJob } from "@/server/queue";
import { assertDailyUsageLimit, recordUsageEvent } from "@/server/usage";
import {
  type ValidatedCreateJobInput,
  validateCreateJobPayload,
} from "@/server/validation/jobs";

export async function createMediaJobs({
  payload,
  userId,
  userPlan,
  ipHash,
}: {
  payload: unknown;
  userId?: string | null;
  userPlan: Plan;
  ipHash?: string | null;
}) {
  const validated = validateCreateJobPayload(payload, userPlan);

  await assertDailyUsageLimit({
    userId,
    ipHash,
    plan: userPlan,
  });

  const limits = getPlanLimits(userPlan);
  const expiresAt = new Date(Date.now() + limits.retentionHours * 60 * 60 * 1000);

  const jobs = await prisma.$transaction(
    validated.normalizedRanges.map((range) =>
      prisma.mediaJob.create({
        data: {
          userId,
          sourceType: validated.sourceType,
          sourceUrl: validated.sourceUrl,
          uploadedObjectKey: validated.uploadedObjectKey,
          title: validated.title,
          thumbnailUrl: validated.thumbnailUrl,
          startMs: range.startMs,
          endMs: range.endMs,
          outputFormat: validated.outputFormat,
          outputQuality: validated.outputQuality,
          rightsConfirmed: validated.rightsConfirmed,
          status: MediaJobStatus.QUEUED,
          expiresAt,
        },
      }),
    ),
  );

  for (const job of jobs) {
    await enqueueTrimJob({
      jobId: job.id,
      priority: validated.outputQuality === OutputQuality.HIGH ? 1 : 10,
    });

    await recordUsageEvent({
      userId,
      ipHash,
      eventType: "JOB_CREATED",
      metadata: {
        sourceType: job.sourceType,
        outputFormat: job.outputFormat,
        clipLengthMs: job.endMs - job.startMs,
      },
    });
  }

  return jobs;
}

export async function getMediaJobForViewer({
  jobId,
  userId,
}: {
  jobId: string;
  userId?: string | null;
}) {
  const job = await prisma.mediaJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw new Error("Job not found.");
  }

  if (job.userId && job.userId !== userId) {
    throw new Error("You do not have access to this clip.");
  }

  return job;
}

export function getPlanFromSession(plan?: Plan | null) {
  return plan ?? Plan.FREE;
}

export function canSaveHistory(sourceType: SourceType, userId?: string | null) {
  return Boolean(userId && sourceType !== SourceType.YOUTUBE_PREVIEW);
}

export function normalizeGuestJobVisibility<T extends { userId: string | null }>(
  job: T,
  viewerId?: string | null,
) {
  if (!job.userId || job.userId === viewerId) {
    return job;
  }

  throw new Error("Unauthorized.");
}

export function summarizeJobRequest(validated: ValidatedCreateJobInput) {
  return {
    sourceType: validated.sourceType,
    outputFormat: validated.outputFormat,
    outputQuality: validated.outputQuality,
    ranges: validated.normalizedRanges.length,
  };
}
