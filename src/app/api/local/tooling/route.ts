import { NextResponse } from "next/server";

import { getToolingStatus } from "@/server/local-clipper";

export async function GET() {
  const tooling = await getToolingStatus();
  return NextResponse.json({ tooling });
}
