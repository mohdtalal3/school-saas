import { redirect } from "next/navigation";
import { getSchoolById } from "@/services/school.service";
import { MODULES, isModuleDisabled, isTabDisabled } from "@/lib/modules";
import type { ModuleDef } from "@/lib/modules";

/**
 * Server-side module access guard for admin pages.
 * Redirects to the dashboard when the module (or the active subtab) is
 * disabled in Module Settings. A disabled parent module blocks all subtabs.
 */
export async function requireModule(
  schoolId: string,
  moduleKey: string,
  options?: { tabParam?: string | null }
): Promise<void> {
  const module: ModuleDef | undefined = MODULES.find((m) => m.key === moduleKey);
  if (!module) return;

  const school = await getSchoolById(schoolId);
  const disabled = school.disabled_modules ?? [];

  if (isModuleDisabled(disabled, module.key)) {
    redirect("/school?moduleDisabled=1");
  }

  if (module.paramKind && module.tabs.length > 0) {
    const tab =
      module.tabs.find((t) => t.param === options?.tabParam) ?? module.tabs[0];
    if (isTabDisabled(disabled, module.key, tab.key)) {
      redirect("/school?moduleDisabled=1");
    }
  }
}
