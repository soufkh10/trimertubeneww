"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function HeroIntake() {
  const router = useRouter();
  const [value, setValue] = useState("");

  return (
    <div className="rounded-[2rem] border border-border/70 bg-card/80 p-5 shadow-spotlight backdrop-blur">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Paste a YouTube link or direct media URL"
          aria-label="Source URL"
        />
        <Button onClick={() => router.push(value ? `/app?source=${encodeURIComponent(value)}` : "/app")}>
          Open editor
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>Preview YouTube embeds</span>
        <span>Upload your own files</span>
        <span>Export MP4, WebM, or MP3</span>
      </div>
    </div>
  );
}
