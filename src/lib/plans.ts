import { Plan } from "@prisma/client";

export type PlanLimits = {
  maxFileSizeBytes: number;
  maxClipLengthMs: number;
  dailyExports: number;
  batchEnabled: boolean;
  retentionHours: number;
  priorityQueue: boolean;
  outputQualities: ("STANDARD" | "HIGH")[];
};

const MINUTE = 60_000;

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    maxFileSizeBytes: 100 * 1024 * 1024,
    maxClipLengthMs: 3 * MINUTE,
    dailyExports: 5,
    batchEnabled: false,
    retentionHours: 24,
    priorityQueue: false,
    outputQualities: ["STANDARD"],
  },
  PRO: {
    maxFileSizeBytes: 2 * 1024 * 1024 * 1024,
    maxClipLengthMs: 60 * MINUTE,
    dailyExports: 1000,
    batchEnabled: true,
    retentionHours: 24 * 30,
    priorityQueue: true,
    outputQualities: ["STANDARD", "HIGH"],
  },
};

export function getPlanLimits(plan: Plan) {
  return PLAN_LIMITS[plan];
}

export function isProPlan(plan: Plan) {
  return plan === Plan.PRO;
}
