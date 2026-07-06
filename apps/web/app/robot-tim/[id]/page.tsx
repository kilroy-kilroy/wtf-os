// apps/web/app/robot-tim/[id]/page.tsx
import { notFound } from "next/navigation";
import { NODES } from "@repo/prompts";
import { getSession } from "@/lib/robot-tim/db";
import InterviewCard from "@/components/robot-tim/InterviewCard";
import BuildingState from "@/components/robot-tim/BuildingState";
import Deliverable from "@/components/robot-tim/Deliverable";

type Props = { params: Promise<{ id: string }> };

export default async function RobotTimSessionPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 bg-black px-6 py-16">
      {session.status === "failed" ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center text-white">
          <p className="font-[Anton] text-3xl">Something went sideways</p>
          <p className="text-zinc-400">
            Robot-Tim hit a snag building your Spine. Email tim@timkilroy.com and he is going to get you sorted.
          </p>
        </div>
      ) : session.status === "complete" && session.spine && session.makeover && session.node7 ? (
        <Deliverable spine={session.spine} makeover={session.makeover} node7={session.node7} />
      ) : session.status === "synthesizing" || (session.interview_complete && session.status !== "complete") ? (
        <BuildingState />
      ) : (
        <InterviewCard
          key={NODES[session.current_node].id}
          sessionId={session.id}
          nodeId={NODES[session.current_node].id}
          ask={NODES[session.current_node].ask}
          totalNodes={NODES.length}
        />
      )}
    </main>
  );
}
