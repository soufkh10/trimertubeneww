import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export async function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-lg font-semibold text-primary shadow-sm">
            CP
          </div>
          <div>
            <div className="font-semibold tracking-tight">ClipPilot</div>
            <div className="text-xs text-muted-foreground">Local batch clipping workspace</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link href="/" className="transition hover:text-foreground">
            Home
          </Link>
          <Link href="/app" className="transition hover:text-foreground">
            Workspace
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Badge variant="secondary">Local only</Badge>
          <Button asChild size="sm">
            <Link href="/app">Open workspace</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
