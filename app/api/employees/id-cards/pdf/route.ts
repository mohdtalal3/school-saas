import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { getSchoolSession } from "@/lib/auth/jwt";
import { getEmployees } from "@/services/employee.service";
import { getSchoolById } from "@/services/school.service";
import { buildIdCardsHtml } from "@/features/employees/id-card-html";
import { DEFAULT_ID_CARD_THEME } from "@/features/employees/id-card-types";

export async function GET(req: Request) {
  try {
    const session = await getSchoolSession();
    if (!session?.schoolId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get("ids");
    const download = searchParams.get("download") === "1";

    const [empResult, school] = await Promise.all([
      getEmployees(session.schoolId, { limit: 1000 }),
      getSchoolById(session.schoolId),
    ]);
    const allEmployees = empResult.data;

    const ids = idsParam ? idsParam.split(",").filter(Boolean) : null;
    const employees = ids
      ? allEmployees.filter((e) => ids.includes(e.id))
      : allEmployees;

    if (employees.length === 0) {
      return NextResponse.json({ error: "No employees to render" }, { status: 400 });
    }

    const theme = {
      textColor: searchParams.get("textColor") ?? DEFAULT_ID_CARD_THEME.textColor,
      accentColor: searchParams.get("accentColor") ?? DEFAULT_ID_CARD_THEME.accentColor,
      goldColor: searchParams.get("goldColor") ?? DEFAULT_ID_CARD_THEME.goldColor,
      bgColor: searchParams.get("bgColor") ?? DEFAULT_ID_CARD_THEME.bgColor,
    };

    const html = buildIdCardsHtml(employees, school, theme);

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    let pdfBuffer: Buffer;
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
      });
      pdfBuffer = Buffer.from(pdf);
    } finally {
      await browser.close();
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${school.name.replace(/[^a-z0-9]+/gi, "-")}-id-cards.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("ID card PDF generation failed:", err);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
