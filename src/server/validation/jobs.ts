import { OutputFormat, OutputQuality, Plan, SourceType } from "@prisma/client";
import { z } from "zod";

import { getPlanLimits, isProPlan } from "@/lib/plans";
import { parseTimestampToMs } from "@/lib/time";

export const clipRangeSchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1),
});

export const createJobSchema = z.object({
  sourceType: z.nativeEnum(SourceType),
  sourceUrl: z.string().url(),
  uploadedObjectKey: z.string().optional().nullable(),
  title: z.string().max(200).optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  outputFormat: z.nativeEnum(OutputFormat),
  outputQuality: z.nativeEnum(OutputQuality),
  rightsConfirmed: z.literal(true),
  fileSizeBytes: z.number().int().positive().optional().nullable(),
  ranges: z.array(clipRangeSchema).min(1),
});

export type ValidatedClipRange = {
  startMs: number;
  endMs: number;
};

export type ValidatedCreateJobInput = z.infer<typeof createJobSchema> & {
  plan: Plan;
  normalizedRanges: ValidatedClipRange[];
};

export function validateCreateJobPayload(payload: unknown, plan: Plan): ValidatedCreateJobInput {
  const parsed = createJobSchema.parse(payload);
  const limits = getPlanLimits(plan);

  if (parsed.sourceType === SourceType.YOUTUBE_PREVIEW) {
    throw new Error(
      "YouTube links can be previewed for timing, but exports are limited to uploaded files and direct media URLs you are authorized to process.",
    );
  }

  if (parsed.sourceType === SourceType.UPLOAD && !parsed.uploadedObjectKey) {
    throw new Error("Uploaded videos require an uploaded object key.");
  }

  if (parsed.fileSizeBytes && parsed.fileSizeBytes > limits.maxFileSizeBytes) {
    throw new Error("This file exceeds the limit for your current plan.");
  }

  if (!limits.outputQualities.includes(parsed.outputQuality)) {
    throw new Error("This quality setting is not available on your current plan.");
  }

  if (parsed.ranges.length > 1 && !isProPlan(plan)) {
    throw new Error("Bulk clipping is available on the Pro plan.");
  }

  const normalizedRanges = parsed.ranges.map(({ start, end }) => {
    const startMs = parseTimestampToMs(start);
    const endMs = parseTimestampToMs(end);

    if (endMs <= startMs) {
      throw new Error("End time must be greater than start time.");
    }

    if (endMs - startMs > limits.maxClipLengthMs) {
      throw new Error("The requested clip length exceeds your current plan limit.");
    }

    return { startMs, endMs };
  });

  return {
    ...parsed,
    plan,
    normalizedRanges,
  };
}
