"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function PricingActions({
  isSignedIn,
  currentPlan,
  hasPortal,
}: {
  isSignedIn: boolean;
  currentPlan: "FREE" | "PRO";
  hasPortal: boolean;
}) {
  const [loading, setLoading] = useState<"checkout" | "portal" | null>(null);

  async function handleAction(endpoint: "/api/stripe/checkout" | "/api/stripe/portal") {
    setLoading(endpoint === "/api/stripe/checkout" ? "checkout" : "portal");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to continue to Stripe.");
      }

      window.location.href = data.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setLoading(null);
    }
  }

  if (!isSignedIn) {
    return (
      <Button asChild size="lg">
        <Link href="/sign-up">Create account to upgrade</Link>
      </Button>
    );
  }

  if (currentPlan === "PRO" && hasPortal) {
    return (
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={() => handleAction("/api/stripe/portal")}
        disabled={loading !== null}
      >
        {loading === "portal" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Manage billing
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="lg"
      onClick={() => handleAction("/api/stripe/checkout")}
      disabled={loading !== null}
    >
      {loading === "checkout" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Upgrade to Pro
    </Button>
  );
}
