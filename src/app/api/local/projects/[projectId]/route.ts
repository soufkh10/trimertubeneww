import { NextResponse } from "next/server";

import { getLocalProject } from "@/server/local-clipper";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const project = await getLocalProject(projectId);
    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load project." },
      { status: 404 },
    );
  }
}
