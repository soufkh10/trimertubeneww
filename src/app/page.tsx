import Link from "next/link";
import { ArrowRight, HardDriveDownload, ListVideo, Scissors } from "lucide-react";

import { LocalClipperWorkspace } from "@/components/local/local-clipper-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="pb-20">
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="space-y-8">
            <div className="flex flex-wrap gap-3">
              <Badge>Podcast clipping</Badge>
              <Badge variant="secondary">Runs on localhost</Badge>
              <Badge variant="outline">Batch exports</Badge>
            </div>
            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight sm:text-6xl">
                Download one long source and cut 20, 30, or more clips from it locally.
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">
                This MVP is designed for long podcasts and interviews. You paste a YouTube link,
                the app downloads the source to your machine once, then you mark many ranges and
                export them as a batch.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/app">
                  Open workspace
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-4">
            {[
              {
                icon: HardDriveDownload,
                title: "Download once",
                description: "Store the full source locally so every clip comes from the same file.",
              },
              {
                icon: ListVideo,
                title: "Plan many ranges",
                description: "Create a long list of start and end timestamps without re-importing.",
              },
              {
                icon: Scissors,
                title: "Export in batch",
                description: "Run through the clip list and save each output back to your computer.",
              },
            ].map(({ icon: Icon, title, description }) => (
              <Card key={title} className="bg-card/80 backdrop-blur">
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 space-y-3">
          <Badge variant="secondary">Workspace preview</Badge>
          <h2 className="text-3xl font-semibold tracking-tight">Start building your clipping workflow now</h2>
        </div>
        <LocalClipperWorkspace />
      </section>
    </div>
  );
}
