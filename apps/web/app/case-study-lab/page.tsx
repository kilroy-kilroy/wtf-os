import type { Metadata } from "next";
import Flow from "@/components/case-study-lab/Flow";

export const metadata: Metadata = {
  title: "Case Study Lab — turn a client win into a postable case study",
  description:
    "Answer a short interview about one client win. Get a shareable case study and ready-to-post branded images in minutes.",
};

export default function Page() {
  return (
    <div className="min-h-screen bg-black">
      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-16">
        <header className="space-y-3">
          <h1 className="text-3xl font-black text-white">The 7-Minute Case Study</h1>
          <p className="text-[#9aa0a6]">
            One client win in, a shareable case study and ready-to-post images out. No designers,
            no writers, no client approval cycle.
          </p>
        </header>
        <Flow />
      </main>
    </div>
  );
}
