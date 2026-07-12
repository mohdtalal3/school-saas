import { NextResponse } from "next/server";
import {
  clearMasterCookie,
  clearSchoolCookie,
} from "@/lib/auth/jwt";
import { success } from "@/lib/api-response";

export async function POST() {
  await clearMasterCookie();
  await clearSchoolCookie();
  return NextResponse.json(success({ ok: true }));
}