import { AppShell } from "@/components/layout/app-shell";
import { HomePage } from "@/components/home/home-page";

export const dynamic = "force-dynamic";

export default function CeoPage() {
  return (
    <AppShell>
      <HomePage />
    </AppShell>
  );
}
