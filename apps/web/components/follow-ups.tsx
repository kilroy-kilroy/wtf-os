"use client";

import { FollowUpTask } from "@/lib/dashboard-types";
import { useState } from "react";

type Props = {
  tasks: FollowUpTask[];
};

export function FollowUpsPanel({ tasks }: Props) {
  const [localTasks, setLocalTasks] = useState(tasks);

  // wire this to an api route later
  const toggleTask = async (id: string) => {
    setLocalTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      )
    );
  };

  return (
    <section className="border border-[#E51B23] rounded-lg px-4 py-3 space-y-3 bg-black">
      <h3 className="font-anton text-sm uppercase tracking-wide text-[#FFDE59]">
        Follow ups you owe people
      </h3>

      {!localTasks.length && (
        <p className="text-xs text-[#777]">
          As Call Lab Pro generates follow up recommendations, they will show up here as tasks.
        </p>
      )}

      <ul className="space-y-2 text-sm text-[#B3B3B3]">
        {localTasks.map((task) => (
          <li
            key={task.id}
            className="flex items-start gap-2 border border-[#333] rounded px-2 py-1.5 bg-[#050505]"
          >
            <button
              onClick={() => toggleTask(task.id)}
              className={`mt-0.5 w-4 h-4 border rounded ${
                task.completed ? "bg-[#FFDE59] border-[#FFDE59]" : "border-[#777]"
              }`}
            />
            <div className="flex-1">
              <div className={task.completed ? "line-through text-[#555]" : ""}>
                {task.label}
              </div>
              {task.dueAt && (
                <div className="text-[10px] text-[#777] mt-0.5">
                  Due {new Date(task.dueAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
