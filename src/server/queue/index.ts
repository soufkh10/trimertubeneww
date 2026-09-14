import { Queue } from "bullmq";

import { getRedis } from "@/lib/redis";

export const TRIM_QUEUE_NAME = "trim-jobs";

type QueuePayload = {
  jobId: string;
  priority: number;
};

let queue: Queue<QueuePayload> | null = null;

function getQueue() {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!queue) {
    queue = new Queue<QueuePayload>(TRIM_QUEUE_NAME, {
      connection: getRedis(),
      defaultJobOptions: {
        removeOnComplete: 1000,
        removeOnFail: 1000,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 3_000,
        },
      },
    });
  }

  return queue;
}

export async function enqueueTrimJob(input: QueuePayload) {
  const activeQueue = getQueue();

  if (!activeQueue) {
    return;
  }

  await activeQueue.add("trim", input, {
    priority: input.priority,
    jobId: input.jobId,
  });
}
