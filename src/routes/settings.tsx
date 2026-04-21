import { createFileRoute } from "@tanstack/react-router";
import { AppPageShell } from "@/components/dashboard/AppPageShell";
import { SettingsModal } from "@/components/dashboard/SettingsModal";

function SettingsPage() {
  return (
    <div className="flex-1 flex flex-col min-w-0 p-6">
      <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure diagnostics, notifications, and backtest controls.
        </p>
      </div>
      <div className="mt-4">
        <SettingsModal />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/settings")({
  component: () => (
    <AppPageShell>
      <SettingsPage />
    </AppPageShell>
  ),
});
