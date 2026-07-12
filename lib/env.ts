import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default("http://localhost:54321"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).default("placeholder-anon-key"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).default("placeholder-service-role-key"),
  MASTER_EMAIL: z.string().email().default("admin@localhost.com"),
  MASTER_PASSWORD: z.string().min(8).default("MasterPass123!"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  JWT_SECRET: z.string().min(16).default("change-me-in-production-please-this-is-a-long-default-secret"),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  MASTER_EMAIL: process.env.MASTER_EMAIL,
  MASTER_PASSWORD: process.env.MASTER_PASSWORD,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  JWT_SECRET: process.env.JWT_SECRET,
});

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables. See logs above.");
}

export const env = parsed.data;