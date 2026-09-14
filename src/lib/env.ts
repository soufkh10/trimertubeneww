export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function getStorageProvider() {
  return process.env.STORAGE_PROVIDER || "mock";
}

export function hasStripeKeys() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  );
}

export function hasStorageConfig() {
  if (getStorageProvider() === "mock") return true;

  return Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_REGION &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY,
  );
}

export function hasRedisConfig() {
  return Boolean(process.env.REDIS_URL);
}
