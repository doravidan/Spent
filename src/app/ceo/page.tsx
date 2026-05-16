import { AppShell } from "@/components/layout/app-shell";
import { CeoLivePage } from "@/components/ceo/ceo-live-page";

export const dynamic = "force-dynamic";

export default function CeoPage() {
  return (
    <AppShell>
      <CeoLivePage />
    </AppShell>
  );
}
