import type { LucideIcon } from "lucide-react";
import {
  Film,
  Layers3,
  Lock,
  Music4,
  Scissors,
  Smartphone,
} from "lucide-react";

export const featureCards: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: Scissors,
    title: "Precise start and end trimming",
    description: "Dial in exact timestamps, preview the result, and export just the segment you need.",
  },
  {
    icon: Film,
    title: "No watermark on exports",
    description: "Your finished clips stay clean and presentation-ready across internal and public workflows.",
  },
  {
    icon: Smartphone,
    title: "Mobile-friendly editor",
    description: "Adjust ranges from a phone, tablet, or desktop without losing precision or context.",
  },
  {
    icon: Music4,
    title: "Export MP4 and audio clips",
    description: "Generate full video clips or audio-only highlights from your uploaded files and direct media URLs.",
  },
  {
    icon: Layers3,
    title: "Bulk clipping for Pro",
    description: "Queue multiple timestamp ranges from one source and let the worker process each output separately.",
  },
  {
    icon: Lock,
    title: "Private temporary storage",
    description: "Clips are retained based on your plan and meant for practical, time-limited delivery workflows.",
  },
];

export const faqItems = [
  {
    question: "Can I clip YouTube videos directly?",
    answer:
      "You can preview public YouTube videos with official embed playback and capture timestamps. Downloadable exports are limited to media you upload yourself or direct media files you are permitted to process.",
  },
  {
    question: "What formats can I export?",
    answer:
      "The MVP supports MP4, WebM, and MP3 output. Stream copy is used when possible for speed, with re-encoding as a fallback.",
  },
  {
    question: "Do free exports expire?",
    answer:
      "Yes. Free exports are retained for 24 hours, while Pro exports can remain available for 30 days.",
  },
  {
    question: "Can teams use this for classrooms or marketing reviews?",
    answer:
      "Yes. The workflow is designed for creator review loops, lecture snippets, campaign approvals, and internal collaboration, as long as your team has the rights to the material.",
  },
];

export const howItWorks = [
  "Paste a link or upload a video",
  "Choose start and end time",
  "Preview and export",
  "Download or save to your dashboard",
];

export const audiencePills = ["Creators", "Students", "Marketers", "Podcast teams"];

export const toolPages = [
  {
    slug: "video-trimmer",
    title: "Online Video Trimmer",
    description:
      "Trim uploaded videos and approved direct media links with precise timestamps, responsive controls, and saved export history.",
    hero: "Trim videos with frame-aware timing and a workflow built for fast turnaround.",
    features: [
      "Precise in/out timestamps",
      "Export-ready MP4 clips",
      "Rights confirmation before processing",
    ],
    faq: [
      {
        question: "Does this work in the browser?",
        answer:
          "Yes. You can prepare timestamps and submit jobs from the browser while processing happens in a separate worker.",
      },
    ],
  },
  {
    slug: "mp4-clip-maker",
    title: "MP4 Clip Maker",
    description:
      "Create trimmed MP4 segments for social, review, and course workflows with dashboard-based delivery.",
    hero: "Build polished MP4 clips from longer recordings without desktop editing overhead.",
    features: ["MP4 exports", "Guest-friendly editor", "Plan-based retention"],
    faq: [
      {
        question: "Can I save my exports?",
        answer: "Signed-in users can keep job history and re-download completed clips from the dashboard.",
      },
    ],
  },
  {
    slug: "audio-extractor",
    title: "Audio Extractor",
    description:
      "Pull MP3 highlights from approved media sources for podcast moments, study notes, and reusable snippets.",
    hero: "Turn moments from long-form recordings into compact audio clips.",
    features: ["MP3 output", "Upload and direct URL support", "Retention controls"],
    faq: [
      {
        question: "Can I export audio-only?",
        answer: "Yes. MP3 is available as an output format in the editor.",
      },
    ],
  },
  {
    slug: "social-media-clip-maker",
    title: "Social Media Clip Maker",
    description:
      "Create quick shareable clips for social workflows from media you control, without a heavyweight editing stack.",
    hero: "Prep social-ready snippets for review, approval, and publishing pipelines.",
    features: ["Short-form clipping", "Bulk jobs for Pro", "Browser-native workflow"],
    faq: [
      {
        question: "Can I use this for Reels or TikTok drafts?",
        answer: "Yes, especially when you need to isolate highlights before additional captioning or publishing.",
      },
    ],
  },
  {
    slug: "bulk-video-trimmer",
    title: "Bulk Video Trimmer",
    description:
      "Queue multiple trim ranges from a single source and process them with priority handling on the Pro plan.",
    hero: "Generate several clips from one recording without repeating the upload step.",
    features: ["Multi-range queueing", "Priority processing", "Dashboard history"],
    faq: [
      {
        question: "Who gets batch clipping?",
        answer: "Bulk clipping is a Pro feature and is ideal for lecture, webinar, and content repurposing workflows.",
      },
    ],
  },
] as const;

export const useCasePages = [
  {
    slug: "tiktok-clips",
    title: "TikTok Clip Workflow",
    description:
      "Use ClipPilot to isolate quick vertical-video moments from recordings you already own or manage.",
    steps: [
      "Upload your source recording",
      "Mark each short-form highlight",
      "Export one or several clips for downstream editing",
    ],
  },
  {
    slug: "instagram-reels",
    title: "Instagram Reels Prep",
    description:
      "Trim approved product demos, testimonials, and creator footage into reusable highlight segments.",
    steps: [
      "Start from your approved media file",
      "Set timestamps for each hook or payoff moment",
      "Download the finished clips or share them from the dashboard",
    ],
  },
  {
    slug: "discord-file-size",
    title: "Discord File Size Fixes",
    description:
      "Shorten long uploads into smaller approved clips before sharing them with a Discord community or team channel.",
    steps: [
      "Import the video you want to shorten",
      "Trim to the section that matters",
      "Export a lighter clip ready for upload elsewhere",
    ],
  },
  {
    slug: "lecture-snippets",
    title: "Lecture Snippets",
    description:
      "Pull short teaching moments from recorded lessons for recap libraries, LMS posts, and study groups.",
    steps: [
      "Preview source material and select timestamps",
      "Create focused lesson excerpts",
      "Share or store the results in your dashboard history",
    ],
  },
  {
    slug: "podcast-highlights",
    title: "Podcast Highlights",
    description:
      "Extract video or audio quotes from episodes you produce or have been authorized to repurpose.",
    steps: [
      "Upload the episode cut",
      "Create highlight ranges",
      "Export MP4 or MP3 clips for marketing and archive use",
    ],
  },
] as const;
