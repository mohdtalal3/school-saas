import { getSchoolSession } from "@/lib/auth/jwt";
import { InstituteProfileForm } from "@/features/settings/institute-profile-form";

export default async function InstituteProfilePage() {
  const session = await getSchoolSession();
  if (!session) return null;
  return <InstituteProfileForm schoolId={session.schoolId} />;
}