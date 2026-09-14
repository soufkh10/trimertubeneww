import { NextResponse } from "next/server";
import { z } from "zod";

import { importYouTubeProject, listLocalProjects } from "@/server/local-clipper";

export async function GET() {
  try {
    const projects = await listLocalProjects();
    return NextResponse.json({ projects });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load projects." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { youtubeUrl } = z
      .object({
        youtubeUrl: z.string().min(1),
      })
      .parse(await request.json());

    const project = await importYouTubeProject(youtubeUrl);
    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to import video." },
      { status: 400 },
    );
  }
}
