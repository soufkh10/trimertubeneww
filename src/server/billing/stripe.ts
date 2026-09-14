import { Plan } from "@prisma/client";
import Stripe from "stripe";

import { absoluteUrl } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

const PRO_PRICE_METADATA_KEY = "clippilot-pro-monthly";

function getSubscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const periodEnds = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === "number");

  if (periodEnds.length === 0) {
    return null;
  }

  return new Date(Math.max(...periodEnds) * 1000);
}

async function ensureStripeCustomer(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { userId: user.id },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export async function createCheckoutSession(userId: string) {
  const customerId = await ensureStripeCustomer(userId);
  const stripe = getStripe();

  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    success_url: absoluteUrl("/pricing?checkout=success"),
    cancel_url: absoluteUrl("/pricing?checkout=cancelled"),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          recurring: { interval: "month" },
          unit_amount: 1900,
          product_data: {
            name: "ClipPilot Pro",
            description: "Priority queue, batch clipping, and longer retention.",
            metadata: { priceKey: PRO_PRICE_METADATA_KEY },
          },
        },
      },
    ],
    metadata: {
      userId,
      priceKey: PRO_PRICE_METADATA_KEY,
    },
    allow_promotion_codes: true,
  });
}

export async function createBillingPortalSession(userId: string) {
  const customerId = await ensureStripeCustomer(userId);
  const stripe = getStripe();

  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: absoluteUrl("/pricing"),
  });
}

export async function handleStripeWebhook(signature: string, body: string) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("Stripe webhook secret is not configured.");
  }

  const event = stripe.webhooks.constructEvent(body, signature, secret);

  if (
    event.type === "checkout.session.completed" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const object = event.data.object as Stripe.Checkout.Session | Stripe.Subscription;
    const customerId = object.customer;

    if (!customerId || typeof customerId !== "string") {
      return event;
    }

    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!user) {
      return event;
    }

    if (event.type === "checkout.session.completed") {
      const subscriptionId = (object as Stripe.Checkout.Session).subscription;

      if (subscriptionId && typeof subscriptionId === "string") {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        await prisma.user.update({
          where: { id: user.id },
          data: { plan: Plan.PRO },
        });

        await prisma.subscription.upsert({
          where: { userId: user.id },
          update: {
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
          },
          create: {
            userId: user.id,
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
          },
        });
      }
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = object as Stripe.Subscription;

      await prisma.user.update({
        where: { id: user.id },
        data: { plan: subscription.status === "active" ? Plan.PRO : Plan.FREE },
      });

      await prisma.subscription.upsert({
        where: { userId: user.id },
        update: {
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
        },
        create: {
          userId: user.id,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
        },
      });
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = object as Stripe.Subscription;

      await prisma.user.update({
        where: { id: user.id },
        data: { plan: Plan.FREE },
      });

      await prisma.subscription.upsert({
        where: { userId: user.id },
        update: {
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
        },
        create: {
          userId: user.id,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
        },
      });
    }
  }

  return event;
}
