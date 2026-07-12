import { notFound } from "next/navigation";
import { getSchoolSession } from "@/lib/auth/jwt";
import { getEmployees } from "@/services/employee.service";
import { getSchoolById } from "@/services/school.service";
import { IdCardsClient } from "@/features/employees/id-cards-client";

interface PageProps {
  searchParams: Promise<{
    ids?: string;
    orientation?: "portrait" | "landscape";
    textColor?: string;
    accentColor?: string;
    bgColor?: string;
  }>;
}

export default async function IdCardsPage({ searchParams }: PageProps) {
  const session = await getSchoolSession();
  if (!session?.schoolId) notFound();

  const sp = await searchParams;

  let employees, school;
  try {
    [employees, school] = await Promise.all([
      getEmployees(session.schoolId),
      getSchoolById(session.schoolId),
    ]);
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
      initialOrientation={sp.orientation ?? "portrait"}
      initialTheme={{
        textColor: sp.textColor ?? "#1f2937",
        accentColor: sp.accentColor ?? "#0b1d39",
        bgColor: sp.bgColor ?? "#ffffff",
      }}
    />
  );
}