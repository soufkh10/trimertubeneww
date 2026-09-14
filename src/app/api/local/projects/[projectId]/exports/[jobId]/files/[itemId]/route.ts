import { createFileResponse, getExportItemPath } from "@/server/local-clipper";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; jobId: string; itemId: string }> },
) {
  const { projectId, jobId, itemId } = await params;
  const { filePath, fileName } = await getExportItemPath({ projectId, jobId, itemId });
  const response = await createFileResponse(filePath, request.headers.get("range"));
  response.headers.set("Content-Disposition", `attachment; filename="${fileName}"`);
  return response;
}
