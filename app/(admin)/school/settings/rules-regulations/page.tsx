import { getSchoolSession } from "@/lib/auth/jwt";
import { RulesRegulationsForm } from "@/features/settings/rules-regulations-form";

export default async function RulesRegulationsPage() {
  const session = await getSchoolSession();
  if (!session) return null;
  return <RulesRegulationsForm schoolId={session.schoolId} />;
}
