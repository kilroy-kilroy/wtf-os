import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-auth-server";
import ProFlow from "@/components/case-study-lab/ProFlow";

export const metadata: Metadata = {
  title: "Case Study Lab Pro — the right case study for every win",
  description:
    "Pro picks the best-fit case-study shape of five for your client win, runs an interview tuned to it, then scores the draft and coaches the gaps.",
};

export default async function ProPage() {
  // Defense-in-depth: middleware already gates /case-study-lab-pro.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-black">
      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-16">
        <header className="space-y-3">
          <h1 className="text-3xl font-black text-white">Case Study Lab Pro</h1>
          <p className="text-[#9aa0a6]">
            One client win in. Pro finds the right case-study shape of five, interviews you for it,
            then grades the draft and tells you what would make it convert.
          </p>
        </header>
        <ProFlow />
      </main>
    </div>
  );
}
