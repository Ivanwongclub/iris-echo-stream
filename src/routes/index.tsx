import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/components/dashboard/DashboardPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kairos · Crypto Trading Dashboard" },
      {
        name: "description",
        content:
          "Real-time crypto trading dashboard with live ETH pricing, profit tracking and algorithmic signal stream.",
      },
      { property: "og:title", content: "Kairos · Crypto Trading Dashboard" },
      {
        property: "og:description",
        content: "Live ETH pricing, 24h profit, and algorithmic signal stream.",
      },
    ],
  }),
  component: DashboardPage,
});
