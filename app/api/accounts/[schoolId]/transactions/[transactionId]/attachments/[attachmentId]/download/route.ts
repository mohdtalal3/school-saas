import { NextResponse } from "next/server";
import { getSchoolSession } from "@/lib/auth/jwt";
import { getAttachmentFile } from "@/services/accounts.service";
import { error, AppError } from "@/lib/api-response";

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ schoolId: string; transactionId: string; attachmentId: string }>;
  }
) {
  const { schoolId, transactionId, attachmentId } = await params;
  try {
    const session = await getSchoolSession();
    if (!(session?.role === "admin" && session.schoolId === schoolId)) {
      return NextResponse.json(error("Unauthorized"), { status: 401 });
    }

    const { data, fileName, mimeType } = await getAttachmentFile(
      schoolId,
      transactionId,
      attachmentId
    );

    // Stream the file inline so images and PDFs render directly in
    // the browser instead of returning a JSON wrapper.
    return new NextResponse(await data.arrayBuffer(), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    const status = e instanceof AppError ? e.statusCode : 500;
    return NextResponse.json(
      error(e instanceof Error ? e.message : "Failed to load attachment"),
      { status }
    );
  }
}
