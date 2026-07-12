import { notFound } from "next/navigation";
import { getSchoolSession } from "@/lib/auth/jwt";
import { getEmployees } from "@/services/employee.service";
import { getSchoolById } from "@/services/school.service";
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

  let employees, school;
  try {
    const [empResult, schoolResult] = await Promise.all([
      getEmployees(session.schoolId, { limit: 1000 }),
      getSchoolById(session.schoolId),
    ]);
    employees = empResult.data;
    school = schoolResult;
  } catch {
    notFound();
  }

  const selectedIds = sp.ids ? sp.ids.split(",").filter(Boolean) : null;
  const filteredEmployees = selectedIds
    ? employees.filter((e) => selectedIds.includes(e.id))
    : employees;

  return (
    <IdCardsClient
      employees={filteredEmployees}
      allEmployees={employees}
      school={school}
      initialTheme={{
        textColor: sp.textColor ?? "#1f2937",
        accentColor: sp.accentColor ?? "#243c8b",
        goldColor: sp.goldColor ?? "#c89a2b",
        bgColor: sp.bgColor ?? "#ffffff",
      }}
    />
  );
}