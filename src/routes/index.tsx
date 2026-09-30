import { createFileRoute } from "@tanstack/react-router";
import { App } from "@/components/gablota/App";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gablota — katalog i kolekcja banknotów" },
      { name: "description", content: "Katalog 75 000 banknotów z 300 krajów. Prowadź kolekcję, oznaczaj poszukiwane, licz wartość." },
      { property: "og:title", content: "Gablota — katalog i kolekcja banknotów" },
      { property: "og:description", content: "Katalog 75 000 banknotów z 300 krajów dla kolekcjonerów." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: App,
});

