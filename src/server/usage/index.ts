import { createHash } from "node:crypto";

import { Plan, Prisma } from "@prisma/client";

import { getPlanLimits } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

export function hashIp(value: string | null) {
  if (!value) return null;

  return createHash("sha256").update(value).digest("hex");
}

export async function assertDailyUsageLimit({
  userId,
  ipHash,
  plan,
}: {
  userId?: string | null;
  ipHash?: string | null;
  plan: Plan;
}) {
  const limits = getPlanLimits(plan);
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const ownershipFilters: Array<{ userId: string } | { ipHash: string }> = [];

  if (userId) {
    ownershipFilters.push({ userId });
  } else if (ipHash) {
    ownershipFilters.push({ ipHash });
  }

  const usageCount = await prisma.usageEvent.count({
    where: {
      eventType: "JOB_CREATED",
      createdAt: {
        gte: dayStart,
      },
      OR: ownershipFilters,
    },
  });

  if (usageCount >= limits.dailyExports) {
    throw new Error("You have reached your daily export limit for this plan.");
  }
}

export async function recordUsageEvent({
  userId,
  ipHash,
  eventType,
  metadata,
}: {
  userId?: string | null;
  ipHash?: string | null;
  eventType: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.usageEvent.create({
    data: {
      userId,
      ipHash,
      eventType,
      metadata,
    },
  });
}
