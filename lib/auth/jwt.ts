import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export type SessionRole = "master" | "admin";

export interface MasterSessionPayload {
  role: "master";
}

export interface AdminSessionPayload {
  role: "admin";
  schoolId: string;
  adminId: string;
  email: string;
}

export type SessionPayload = MasterSessionPayload | AdminSessionPayload;

const COOKIE_NAMES = {
  master: "master_session",
  school: "school_session",
} as const;

function getSecret() {
  return new TextEncoder().encode(env.JWT_SECRET);
}

async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// ── Master session ────────────────────────────────────────────────────────────

export async function createMasterSession(): Promise<string> {
  return signToken({ role: "master" });
}

export async function getMasterSession(): Promise<MasterSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAMES.master)?.value;
  if (!token) return null;
  return verifyToken(token) as Promise<MasterSessionPayload | null>;
}

export async function setMasterCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAMES.master, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function clearMasterCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAMES.master);
}

// ── School session ────────────────────────────────────────────────────────────

export async function createSchoolSession(payload: AdminSessionPayload): Promise<string> {
  return signToken(payload);
}

export async function getSchoolSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAMES.school)?.value;
  if (!token) return null;
  return verifyToken(token) as Promise<AdminSessionPayload | null>;
}

export async function setSchoolCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAMES.school, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function clearSchoolCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAMES.school);
}
