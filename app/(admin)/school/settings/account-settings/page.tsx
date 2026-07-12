import { getSchoolSession } from "@/lib/auth/jwt";
import { AccountSettingsForm } from "@/features/settings/account-settings-form";

export default async function AccountSettingsPage() {
  const session = await getSchoolSession();
  if (!session) return null;
  return <AccountSettingsForm schoolId={session.schoolId} />;
}