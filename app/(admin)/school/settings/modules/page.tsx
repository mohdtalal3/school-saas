import { getSchoolSession } from "@/lib/auth/jwt";
import { ModuleSettingsForm } from "@/features/settings/module-settings-form";

export default async function ModuleSettingsPage() {
  const session = await getSchoolSession();
  if (!session) return null;
  return <ModuleSettingsForm schoolId={session.schoolId} />;
}
