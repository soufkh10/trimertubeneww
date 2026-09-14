import { getProjectSourcePath, createFileResponse } from "@/server/local-clipper";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const filePath = await getProjectSourcePath(projectId);
  return await createFileResponse(filePath, request.headers.get("range"));
}
