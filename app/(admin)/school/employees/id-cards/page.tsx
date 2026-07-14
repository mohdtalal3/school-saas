import { notFound } from "next/navigation";
import { getSchoolSession } from "@/lib/auth/jwt";
import { IdCardsClient } from "@/features/employees/id-cards-client";

interface PageProps {
  searchParams: Promise<{
    ids?: string;
    textColor?: string;
    accentColor?: string;
    goldColor?: string;
    bgColor?: string;
  }>;
}

export default async function IdCardsPage({ searchParams }: PageProps) {
  const session = await getSchoolSession();
  if (!session?.schoolId) notFound();

  const sp = await searchParams;

  return (
    <IdCardsClient
      schoolId={session.schoolId}
      initialTheme={{
        textColor: sp.textColor ?? "#1f2937",
        accentColor: sp.accentColor ?? "#243c8b",
        goldColor: sp.goldColor ?? "#c89a2b",
        bgColor: sp.bgColor ?? "#ffffff",
      }}
    />
  );
}