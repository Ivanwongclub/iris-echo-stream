import type { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { TradeStreamProvider } from "@/hooks/useTradeStream";

export function AppPageShell({ children, onSidebarNavigate }: { children: ReactNode; onSidebarNavigate?: () => void }) {
  return (
    <TradeStreamProvider>
      <div className="min-h-screen flex bg-background text-foreground">
        <AppSidebar onNavigate={onSidebarNavigate} />
        <div className="flex-1 flex flex-col min-w-0">{children}</div>
      </div>
    </TradeStreamProvider>
  );
}
