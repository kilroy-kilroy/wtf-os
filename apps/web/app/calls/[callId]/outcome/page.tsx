"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const OUTCOMES = [
  { value: "won", label: "Won the deal", icon: "🎉", color: "border-green-500 hover:bg-green-900" },
  { value: "lost", label: "Lost the deal", icon: "😞", color: "border-red-500 hover:bg-red-900" },
  { value: "ghosted", label: "Got ghosted", icon: "👻", color: "border-gray-500 hover:bg-gray-900" },
  { value: "next_step", label: "Set a next step", icon: "📅", color: "border-blue-500 hover:bg-blue-900" },
];

export default function OutcomeUpdatePage({
  params,
}: {
  params: Promise<{ callId: string }>;
}) {
  const { callId } = use(params);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [call, setCall] = useState<{
    buyer_name: string | null;
    company_name: string | null;
    outcome: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchCall = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("call_lab_reports")
        .select("buyer_name, company_name, outcome")
        .eq("id", callId)
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        setError("Call not found");
      } else {
        setCall(data);
      }
      setLoading(false);
    };

    fetchCall();
  }, [callId, router, supabase]);

  const handleOutcomeSelect = async (outcome: string) => {
    setUpdating(true);
    setError(null);

    try {
      const response = await fetch(`/api/calls/${callId}/outcome`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome }),
      });

      if (!response.ok) {
        throw new Error("Failed to update outcome");
      }

      setSuccess(true);
      setCall((prev) => prev ? { ...prev, outcome } : null);

      // Redirect to dashboard after short delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-[#B3B3B3]">Loading...</div>
      </div>
    );
  }

  if (error && !call) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-[#FFDE59] hover:underline"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const prospect = call?.buyer_name || call?.company_name || "this prospect";

  return (
    <div className="min-h-screen bg-black py-12 px-4 text-white">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="font-anton text-3xl tracking-wide uppercase mb-2">
            <span className="text-white">SALES</span>
            <span className="text-[#E51B23]">OS</span>
          </div>
          <div className="font-anton text-xs text-[#FFDE59] uppercase">
            OUTCOME TRACKER
          </div>
        </div>

        {success ? (
          <div className="border border-green-500 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">✓</div>
            <h1 className="font-anton text-xl uppercase text-[#FFDE59] mb-2">
              Got it!
            </h1>
            <p className="text-[#B3B3B3]">
              Outcome recorded. Taking you to dashboard...
            </p>
          </div>
        ) : (
          <div className="border border-[#E51B23] rounded-lg p-6 space-y-6">
            <div>
              <h1 className="font-anton text-xl uppercase text-[#FFDE59] mb-2">
                How did it go with {prospect}?
              </h1>
              <p className="text-[#B3B3B3] text-sm">
                Quick update helps your coaching reports be more accurate.
              </p>
            </div>

            {call?.outcome && call.outcome !== "unknown" && (
              <div className="bg-[#1A1A1A] border border-[#333] rounded p-3">
                <p className="text-[#666] text-xs uppercase mb-1">Current Outcome</p>
                <p className="text-white">
                  {OUTCOMES.find((o) => o.value === call.outcome)?.label || call.outcome}
                </p>
              </div>
            )}

            <div className="space-y-3">
              {OUTCOMES.map((outcome) => (
                <button
                  key={outcome.value}
                  onClick={() => handleOutcomeSelect(outcome.value)}
                  disabled={updating}
                  className={`w-full flex items-center gap-4 p-4 border rounded-lg transition-all ${outcome.color} ${
                    updating ? "opacity-50 cursor-not-allowed" : ""
                  } ${
                    call?.outcome === outcome.value
                      ? "bg-opacity-30 border-2"
                      : "bg-transparent"
                  }`}
                >
                  <span className="text-2xl">{outcome.icon}</span>
                  <span className="font-medium">{outcome.label}</span>
                  {call?.outcome === outcome.value && (
                    <span className="ml-auto text-[#FFDE59] text-xs uppercase">
                      Current
                    </span>
                  )}
                </button>
              ))}
            </div>

            {error && (
              <div className="bg-red-900 border border-red-500 rounded p-3">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <div className="pt-4 border-t border-[#333]">
              <button
                onClick={() => router.push("/dashboard")}
                className="text-[#B3B3B3] hover:text-white text-sm"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
