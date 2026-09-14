import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/80 bg-background/70">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm text-muted-foreground sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
        <div className="space-y-3">
          <p className="text-base font-semibold text-foreground">ClipPilot</p>
          <p>
            Local-first clipping for media you are allowed to process. Source downloads and clip
            exports stay on your machine.
          </p>
        </div>
        <div className="space-y-2">
          <p className="font-medium text-foreground">Product</p>
          <Link href="/app" className="block transition hover:text-foreground">
            Workspace
          </Link>
          <Link href="/" className="block transition hover:text-foreground">
            Home
          </Link>
        </div>
        <div className="space-y-2">
          <p className="font-medium text-foreground">Local paths</p>
          <p>Projects: `.clip-pilot/projects/`</p>
          <p>Each project stores its source, jobs, and exports together.</p>
        </div>
      </div>
    </footer>
  );
}
