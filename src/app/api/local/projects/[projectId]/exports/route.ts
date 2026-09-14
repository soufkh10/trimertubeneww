import { NextResponse } from "next/server";
import { z } from "zod";

import { createExportJob } from "@/server/local-clipper";

const clipSchema = z.object({
  id: z.string(),
  name: z.string(),
  start: z.string(),
  end: z.string(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const payload = z
      .object({
        mode: z.enum(["fast", "accurate"]),
        clips: z.array(clipSchema).min(1),
      })
      .parse(await request.json());

    const job = await createExportJob({
      projectId,
      clips: payload.clips,
      mode: payload.mode,
    });

    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create export job." },
      { status: 400 },
    );
  }
}
