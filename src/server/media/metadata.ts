import { z } from "zod";

const youtubePatterns = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
];

export const metadataRequestSchema = z.object({
  sourceUrl: z.string().url(),
});

export type MediaMetadata =
  | {
      type: "YOUTUBE_PREVIEW";
      normalizedVideoId: string;
      embedUrl: string;
      title: string;
      thumbnailUrl: string;
      exportAllowed: false;
    }
  | {
      type: "DIRECT_MEDIA_URL";
      normalizedUrl: string;
      title: string;
      thumbnailUrl: string | null;
      contentType: string | null;
      exportAllowed: true;
    };

export function extractYouTubeId(url: string) {
  for (const pattern of youtubePatterns) {
    const match = pattern.exec(url);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

async function probeContentType(url: string) {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: {
        "User-Agent": "ClipPilotBot/1.0 (+metadata probe)",
      },
      cache: "no-store",
    });

    return response.headers.get("content-type");
  } catch {
    return null;
  }
}

export async function resolveMediaMetadata(sourceUrl: string): Promise<MediaMetadata> {
  const youtubeId = extractYouTubeId(sourceUrl);

  if (youtubeId) {
    return {
      type: "YOUTUBE_PREVIEW",
      normalizedVideoId: youtubeId,
      embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
      title: `YouTube preview: ${youtubeId}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
      exportAllowed: false,
    };
  }

  const contentType = await probeContentType(sourceUrl);

  if (contentType && !contentType.startsWith("video/") && !contentType.startsWith("audio/")) {
    throw new Error("The provided URL does not appear to point to a direct media file.");
  }

  const url = new URL(sourceUrl);
  const lastSegment = url.pathname.split("/").pop() || "Remote media";

  return {
    type: "DIRECT_MEDIA_URL",
    normalizedUrl: sourceUrl,
    title: decodeURIComponent(lastSegment),
    thumbnailUrl: null,
    contentType,
    exportAllowed: true,
  };
}
