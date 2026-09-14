import { NextResponse } from "next/server";

import { getExportJob } from "@/server/local-clipper";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; jobId: string }> },
) {
  try {
    const { projectId, jobId } = await params;
    const job = await getExportJob(projectId, jobId);
    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load export job." },
      { status: 404 },
    );
  }
}
