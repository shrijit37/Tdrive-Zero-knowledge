"use client";

import React from "react";
import { useJobs } from "@/hooks/api/useJobs";
import { useUIStore } from "@/store/useUIStore";
import { Progress } from "@/components/ui";
import { X, ChevronUp, ChevronDown, ArrowUpCircle } from "lucide-react";
import { cn } from "@/components/ui";

export function FloatingQueue() {
  const [isOpen, setIsOpen] = React.useState(true);
  const { data: jobs } = useJobs(true);
  const { density } = useUIStore();
  const isCompact = density === "compact";
  const activeCount = jobs?.length || 0;

  if (activeCount === 0) return null;

  return (
    <div className={cn(
      "fixed bottom-16 md:bottom-5 right-3.5 w-[calc(100%-1.75rem)] md:w-72 bg-card border border-border/50 rounded-lg shadow-overlay z-50 overflow-hidden animate-slide-up",
      isCompact ? "md:w-64" : "md:w-72"
    )}>
      <div
        className={cn(
          "bg-surface-2 flex justify-between items-center cursor-pointer select-none hover:bg-surface-3 transition-colors",
          isCompact ? "p-2" : "p-2.5"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-1.5">
          <ArrowUpCircle size={13} className={cn(isOpen && "animate-pulse text-primary")} />
          <span className="font-semibold text-[10px] uppercase tracking-wider text-foreground">
            Tasks ({activeCount})
          </span>
        </div>
        {isOpen ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronUp size={14} className="text-muted-foreground" />}
      </div>

      {isOpen && (
        <div className={cn(
          "max-h-[50vh] md:max-h-80 overflow-y-auto scrollbar-none border-t border-border/30",
          isCompact ? "p-2 space-y-1.5" : "p-2 space-y-2"
        )}>
          {jobs?.map((job) => (
            <div key={job.job_id} className={cn(
              "border border-border/50 bg-surface-1 space-y-1.5",
              isCompact ? "p-2 rounded-md" : "p-2.5 rounded-md"
            )}>
              <div className="flex justify-between items-center text-[8px] uppercase font-semibold tracking-tight">
                <span className="truncate max-w-[120px] text-muted-foreground">
                  {job.type}ing...
                </span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[8px] font-semibold font-mono",
                  job.status === "failed"
                    ? "text-destructive border border-destructive/20 bg-destructive/5"
                    : "text-primary border border-primary/20 bg-primary/5"
                )}>
                  {job.status}
                </span>
              </div>

              <Progress value={job.progress} className="h-0.5" />

              <div className="flex justify-between text-[8px] font-medium font-mono text-muted-foreground/50">
                <span className="tabular-nums">{job.progress.toFixed(0)}%</span>
                <span className="tabular-nums">#{job.job_id.slice(0, 6)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
