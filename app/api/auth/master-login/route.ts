import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createMasterSession,
  setMasterCookie,
} from "@/lib/auth/jwt";
import { verifyMasterCredentials } from "@/services/auth.service";
import { success, error } from "@/lib/api-response";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        error("Invalid email or password format"),
        { status: 400 }
      );
    }

    const ok = await verifyMasterCredentials(
      parsed.data.email,
      parsed.data.password
    );
    if (!ok) {
      return NextResponse.json(
        error("Invalid credentials"),
        { status: 401 }
      );
    }

    const token = await createMasterSession();
    await setMasterCookie(token);

    return NextResponse.json(success({ role: "master" as const }));
  } catch (e) {
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Login failed"),
      { status: 500 }
    );
  }
}