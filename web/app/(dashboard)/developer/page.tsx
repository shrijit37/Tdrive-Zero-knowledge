"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { StructuredResponse } from "@/types";
import { 
  Terminal, 
  Activity, 
  Database, 
  Send, 
  Cpu, 
  HardDrive, 
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
  Search,
  Download,
  ShieldAlert,
  ChevronRight,
  Info,
  Package,
  Power,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpCircle,
  ArrowDownCircle,
  XCircle,
  History,
  Calendar,
  Eye,
  Eraser,
  Target
} from "lucide-react";
import { Button, cn, Progress } from "@/components/ui";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

type Tab = "overview" | "logs" | "performance" | "jobs" | "trash" | "previews" | "database" | "telegram";

const formatDBSize = (bytes: number) => {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
};

const formatSize = (bytes: number) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export default function DeveloperPage() {
  const [activeTab, setActiveTab] = React.useState<Tab>("overview");
  const [mounted, setMounted] = React.useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // --- API Queries ---

  const { data: devStatus, error: devError } = useQuery({
    queryKey: ["dev-status"],
    queryFn: async () => {
      const resp = await api.get<StructuredResponse<any>>("/developer/status");
      return resp.data.data;
    },
    retry: false,
    enabled: mounted,
    staleTime: 60000,
  });

  const isDevEnabled = !!devStatus?.dev_mode;

  const { data: metrics } = useQuery({
    queryKey: ["dev-metrics"],
    queryFn: async () => {
      const resp = await api.get<StructuredResponse<any>>("/developer/metrics");
      return resp.data.data;
    },
    enabled: mounted && isDevEnabled && (activeTab === "performance" || activeTab === "overview"),
    refetchInterval: 5000
  });

  const { data: logs } = useQuery({
    queryKey: ["dev-logs"],
    queryFn: async () => {
      const resp = await api.get<StructuredResponse<any[]>>("/developer/logs");
      return resp.data.data;
    },
    enabled: mounted && isDevEnabled && activeTab === "logs",
    refetchInterval: 3000
  });

  const { data: jobs } = useQuery({
    queryKey: ["dev-jobs-detailed"],
    queryFn: async () => {
      const resp = await api.get<StructuredResponse<any[]>>("/jobs");
      return resp.data.data;
    },
    enabled: mounted && activeTab === "jobs",
    refetchInterval: 5000
  });

  const { data: trashStats } = useQuery({
    queryKey: ["dev-trash-stats"],
    queryFn: async () => {
      const resp = await api.get<StructuredResponse<any>>("/developer/trash/stats");
      return resp.data.data;
    },
    enabled: mounted && isDevEnabled && activeTab === "trash",
    refetchInterval: 10000
  });

  const { data: previewStats } = useQuery({
    queryKey: ["dev-preview-stats"],
    queryFn: async () => {
      const resp = await api.get<StructuredResponse<any>>("/developer/preview/stats");
      return resp.data.data;
    },
    enabled: mounted && isDevEnabled && activeTab === "previews",
    refetchInterval: 5000
  });

  const toggleDevMode = useMutation({
    mutationFn: async (enabled: boolean) => {
      await api.post(`/developer/config/dev-mode?enabled=${enabled}`);
    },
    onSuccess: () => {
      toast.success("Developer Mode toggled");
      window.location.reload();
    }
  });

  const exportBundle = async () => {
    try {
       toast.loading("Generating bundle...");
       const response = await api.get("/developer/support-bundle", { responseType: 'blob' });
       const url = window.URL.createObjectURL(new Blob([response.data]));
       const link = document.createElement('a');
       link.href = url;
       link.setAttribute('download', 'tdrive_support_bundle.zip');
       document.body.appendChild(link);
       link.click();
       toast.dismiss();
       toast.success("Bundle downloaded");
    } catch (e) {
       toast.dismiss();
       toast.error("Failed to generate bundle");
    }
  };

  const restartAgent = useMutation({
    mutationFn: async () => {
       await api.post("/developer/system/restart");
    },
    onSuccess: () => {
       toast.success("Restart command sent. Please wait 15s.");
       setTimeout(() => window.location.reload(), 15000);
    }
  });

  if (!mounted) {
    return <div className="p-8 text-muted-foreground/60">Initializing Console...</div>;
  }

  if (devError || (devStatus && !devStatus.dev_mode)) {
    return (
       <div className="max-w-md mx-auto mt-20 text-center space-y-6 px-4">
         <div className="p-4 bg-destructive/10 text-destructive rounded-full w-20 h-20 mx-auto flex items-center justify-center">
            <ShieldAlert size={40} />
         </div>
         <h1 className="text-2xl font-bold">Access Restricted</h1>
         <p className="text-muted-foreground font-medium leading-relaxed text-sm md:text-base">
           Developer Mode is disabled. Diagnostic tools are locked for security.
         </p>
         <Button 
           variant="default" 
           className="w-full h-14 rounded-2xl font-bold text-base shadow-xl shadow-primary/20"
           onClick={() => toggleDevMode.mutate(true)}
         >
           Enable Developer Console
         </Button>
       </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-12 md:pb-8 px-1 md:px-0">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card border border-border/50 p-4 rounded-2xl md:rounded-3xl shadow-sm">
        <div className="flex items-center space-x-3 md:space-x-4">
          <div className="p-2 md:p-2.5 bg-background text-foreground rounded-lg md:rounded-xl shadow-lg shrink-0">
            <Terminal size={20} className="md:w-5 md:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-display font-bold tracking-tight text-foreground truncate">Agent Control</h1>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mt-0.5 flex items-center space-x-2">
               <span className="w-1.5 h-1.5 bg-green-500 rounded-full shrink-0" />
               <span className="truncate">Environment Active</span>
            </p>
          </div>
        </div>
        <Button variant="outline" className="rounded-lg h-8 border-border/50 font-bold text-[10px]" onClick={() => toggleDevMode.mutate(false)}>
           Lock Console
        </Button>
      </div>

      {/* Sticky Scrollable Tabs */}
      <div className="sticky top-[64px] z-30 bg-background/80 backdrop-blur-md py-1.5 -mx-1 px-1">
        <div className="relative group">
          <div className="flex items-center space-x-1 bg-surface-2 p-1 rounded-xl overflow-x-auto no-scrollbar snap-x snap-mandatory">
            {(["overview", "logs", "performance", "jobs", "trash", "previews", "database", "telegram"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 md:px-4 py-1.5 rounded-lg text-[9px] font-semibold uppercase tracking-wider transition-all whitespace-nowrap snap-start",
                  activeTab === tab ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-surface-2/50 dark:from-surface-2/50 to-transparent pointer-events-none rounded-r-xl md:hidden" />
          <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-surface-2/50 dark:from-surface-2/50 to-transparent pointer-events-none rounded-l-xl md:hidden" />
        </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        {activeTab === "overview" && (
          <OverviewTab 
             status={devStatus} 
             metrics={metrics} 
             onExport={exportBundle}
             onRestart={() => {
                if(window.confirm("CRITICAL: This will kill the current process. Systemd should restart it automatically. Proceed?")) {
                   restartAgent.mutate();
                }
             }}
             isRestarting={restartAgent.isPending}
          />
        )}
        {activeTab === "logs" && <LogsTab logs={logs} />}
        {activeTab === "performance" && <PerformanceTab metrics={metrics} />}
        {activeTab === "jobs" && <JobsInspectorTab jobs={jobs} />}
        {activeTab === "trash" && <TrashInspectorTab stats={trashStats} />}
        {activeTab === "previews" && <PreviewInspectorTab stats={previewStats} />}
        {activeTab === "database" && <DatabaseTab status={devStatus} />}
        {activeTab === "telegram" && <TelegramTab />}
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function OverviewTab({ status, metrics, onExport, onRestart, isRestarting }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
       <div className="lg:col-span-2 space-y-3 md:space-y-4">
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-card border border-border/50 rounded-xl md:rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                   <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg"><Cpu size={14} /></div>
                   <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">CPU</span>
                </div>
                <div className="space-y-1.5">
                   <p className="text-xl md:text-2xl font-semibold font-mono tabular-nums">{metrics?.cpu_percent || 0}%</p>
                   <Progress value={metrics?.cpu_percent || 0} className="h-1" />
                </div>
             </div>
             <div className="bg-card border border-border/50 rounded-xl md:rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                   <div className="p-1.5 bg-purple-500/10 text-purple-500 rounded-lg"><Activity size={14} /></div>
                   <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">RAM</span>
                </div>
                <div className="space-y-1.5">
                   <p className="text-xl md:text-2xl font-semibold font-mono tabular-nums">{metrics?.ram_usage?.toFixed(0)} <span className="text-[10px] text-muted-foreground/60 font-medium">MB</span></p>
                   <Progress value={(metrics?.ram_usage / metrics?.ram_total) * 100 || 0} className="h-1" />
                </div>
             </div>
          </div>
          
          <div className="bg-card border border-border/50 rounded-xl md:rounded-2xl p-4 md:p-6">
             <h3 className="font-bold text-sm mb-4 flex items-center space-x-2">
                <Info size={14} className="text-primary" />
                <span>Environment Info</span>
             </h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                <div className="space-y-3">
                  <InfoItem label="API Build" value={status?.api_version} />
                  <InfoItem label="Python" value={status?.python_version} />
                  <InfoItem label="Host OS" value={status?.os_info} />
                </div>
                <div className="space-y-3">
                  <InfoItem label="Arch" value={status?.arch} />
                  <InfoItem label="DB Size" value={formatDBSize(status?.db_size)} />
                  <InfoItem label="Journal" value={status?.db_wal ? "WAL" : "STD"} />
                </div>
             </div>
          </div>
       </div>

       <div className="space-y-3 md:space-y-4">
          <div className="bg-background text-foreground rounded-xl md:rounded-2xl p-5 md:p-6 space-y-4 shadow-xl">
             <h3 className="font-bold text-sm tracking-tight">System Health</h3>
             <div className="space-y-3">
                <StatusDot label="API Gateway" ok={true} />
                <StatusDot label="Local Index" ok={status?.db_wal} />
                <StatusDot label="Session" ok={true} />
                <StatusDot label="Telegram" ok={true} />
             </div>
          </div>
          <div className="p-5 md:p-6 bg-primary/5 rounded-xl md:rounded-2xl border border-primary/10 space-y-4">
             <div className="flex items-start space-x-2">
                <ShieldCheck size={16} className="text-primary mt-0.5 shrink-0" />
                <p className="text-[11px] font-bold text-muted-foreground dark:text-muted-foreground/60 leading-relaxed">
                   Admin-only diagnostics. Secrets are never exported.
                </p>
             </div>
             <div className="space-y-2">
                <Button variant="default" className="w-full rounded-lg font-bold h-10 shadow-none flex items-center justify-center space-x-2" onClick={onExport}>
                   <Package size={14} />
                   <span>Support Bundle</span>
                </Button>
                <Button variant="outline" className="w-full rounded-lg font-bold h-10 border-border/50 text-destructive flex items-center justify-center space-x-2 hover:bg-destructive hover:text-white transition-all" onClick={onRestart} disabled={isRestarting}>
                   <Power size={14} />
                   <span className="truncate">{isRestarting ? "Sent..." : "Restart Agent"}</span>
                </Button>
             </div>
          </div>
       </div>
    </div>
  );
}

function LogsTab({ logs }: { logs?: any[] }) {
  const getLevelColor = (level: string) => {
    switch (level) {
      case "ERROR": return "text-destructive font-semibold";
      case "WARNING": return "text-yellow-500 font-bold";
      case "CRITICAL": return "bg-destructive text-white px-2 rounded font-semibold animate-pulse";
      default: return "text-blue-500 font-medium";
    }
  };

  return (
    <div className="bg-card border border-border/30 rounded-2xl md:rounded-xl overflow-hidden flex flex-col h-[500px] md:h-[650px] shadow-2xl">
      <div className="p-4 md:p-5 border-b border-border/30 flex items-center justify-between bg-black/40 backdrop-blur-md">
        <div className="flex items-center space-x-3 md:space-x-4">
           <div className="flex items-center space-x-2 text-[9px] md:text-[10px] font-semibold uppercase tracking-wider md:tracking-wider text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              <span>Real-time Kernel Streams</span>
           </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 font-mono text-[10px] md:text-[11px] leading-relaxed space-y-1.5 bg-black text-muted-foreground/60 selection:bg-primary selection:text-white">
        {!logs || logs.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-30">
              <Loader2 className="animate-spin" size={24} />
              <p className="italic text-xs">Connecting to log buffer...</p>
           </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex items-start space-x-3 md:space-x-4 group hover:bg-surface-2/40 p-1 rounded transition-colors border-l-2 border-transparent hover:border-primary">
              <span className="text-muted-foreground/80 shrink-0 select-none hidden sm:inline">[{log.timestamp}]</span>
              <span className={cn("shrink-0 w-10 md:w-14 text-center", getLevelColor(log.level))}>{log.level}</span>
              <span className="text-muted-foreground shrink-0 truncate w-16 md:w-24">@{log.module}</span>
              <span className="text-muted-foreground/40 break-words flex-1">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PerformanceTab({ metrics }: any) {
  return (
    <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
         <div className="bg-card border border-border/50 rounded-2xl md:rounded-xl p-6 md:p-10 space-y-6 md:space-y-8 shadow-sm">
            <h3 className="font-display font-bold text-lg md:text-2xl tracking-tight">CPU Dynamics</h3>
            <div className="flex items-center justify-center py-4 md:py-6">
               <div className="relative w-40 h-48 md:w-56 md:h-56 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-foreground/80 dark:text-foreground" />
                    <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray="283" strokeDashoffset={283 - (283 * (metrics?.cpu_percent || 0)) / 100} className="text-primary transition-all duration-1000 ease-out" strokeLinecap="round" />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl md:text-5xl font-semibold font-mono tabular-nums tracking-tight">{metrics?.cpu_percent || 0}%</span>
                    <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider mt-1 text-center">Active Load</span>
                  </div>
               </div>
            </div>
         </div>

         <div className="bg-card border border-border/50 rounded-2xl md:rounded-xl p-6 md:p-10 space-y-8 md:space-y-10 shadow-sm">
            <h3 className="font-display font-bold text-lg md:text-2xl tracking-tight">Memory Allocation</h3>
            <div className="space-y-8 md:space-y-12 py-2 md:py-4">
               <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Footprint</span>
                    <span className="text-lg md:text-2xl font-semibold font-mono tabular-nums">{metrics?.ram_usage?.toFixed(1)} <span className="text-[10px] md:text-sm font-medium text-muted-foreground/60 uppercase">MB</span></span>
                  </div>
                  <Progress value={(metrics?.ram_usage / metrics?.ram_total) * 100} className="h-3 md:h-4 rounded-full bg-surface-2 dark:bg-surface-2" />
               </div>
               <div className="grid grid-cols-2 gap-3 md:gap-6">
                  <div className="p-4 md:p-6 bg-surface-1 dark:bg-card rounded-2xl md:rounded-3xl border border-border/50">
                     <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1 md:mb-2">Total RAM</p>
                     <p className="text-base md:text-2xl font-semibold font-mono tabular-nums truncate">{(metrics?.ram_total / 1024).toFixed(1)} GB</p>
                  </div>
                  <div className="p-4 md:p-6 bg-surface-1 dark:bg-card rounded-2xl md:rounded-3xl border border-border/50">
                     <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1 md:mb-2">Status</p>
                     <p className="text-base md:text-2xl font-semibold text-green-500 uppercase tracking-tight italic">OK</p>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

function JobsInspectorTab({ jobs }: { jobs?: any[] }) {
  const queryClient = useQueryClient();
  
  const clearJobs = useMutation({
     mutationFn: async () => await api.post("/developer/jobs/clear"),
     onSuccess: () => {
        toast.success("History cleared");
        queryClient.invalidateQueries({ queryKey: ["dev-jobs-detailed"] });
     }
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between px-2 text-foreground">
         <h3 className="font-display font-bold text-lg md:text-xl tracking-tight">Active Workflows</h3>
         <Button variant="outline" className="rounded-xl h-9 md:h-10 text-[10px] md:text-xs font-bold text-destructive border-border/50" onClick={() => clearJobs.mutate()}>
            Clear All
         </Button>
      </div>
      
      <div className="bg-card border border-border/50 rounded-2xl md:rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="bg-surface-1 dark:bg-card border-b border-border/50">
                 <th className="px-4 md:px-6 py-4 text-[11px] font-semibold uppercase text-muted-foreground/60 tracking-wider">Type</th>
                 <th className="px-4 md:px-6 py-4 text-[11px] font-semibold uppercase text-muted-foreground/60 tracking-wider">Status</th>
                 <th className="px-4 md:px-6 py-4 text-[11px] font-semibold uppercase text-muted-foreground/60 tracking-wider">Job ID</th>
                 <th className="px-4 md:px-6 py-4 text-[11px] font-semibold uppercase text-muted-foreground/60 tracking-wider text-right">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {!jobs || jobs.length === 0 ? (
                 <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-muted-foreground/60 italic">No tasks recorded in index</td></tr>
              ) : (
                jobs.map(job => (
                  <tr key={job.job_id} className="hover:bg-surface-1/50 dark:hover:bg-card/50 transition-colors text-foreground dark:text-foreground/80">
                    <td className="px-4 md:px-6 py-3 md:py-4">
                       <div className="flex items-center space-x-2">
                          {job.type === "upload" ? <ArrowUpCircle size={14} className="text-primary shrink-0" /> : <ArrowDownCircle size={14} className="text-purple-500 shrink-0" />}
                          <span className="text-xs md:text-sm font-bold capitalize">{job.type}</span>
                       </div>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4">
                       <div className={cn("text-[8px] md:text-[10px] font-semibold px-1.5 md:px-2 py-0.5 md:py-1 rounded w-fit uppercase", 
                         job.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400" :
                         job.status === "failed" ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400" :
                         "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 animate-pulse")}>
                          {job.status}
                       </div>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 font-mono text-[9px] md:text-[10px] text-muted-foreground truncate max-w-[80px]">#{job.job_id.slice(0, 8)}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                       <div className="inline-flex items-center space-x-2 md:space-x-3">
                          <span className="text-xs md:text-sm font-semibold font-mono tabular-nums">{job.progress.toFixed(1)}%</span>
                          <div className="hidden sm:block w-16 h-1.5 bg-surface-2 dark:bg-surface-2 rounded-full overflow-hidden shrink-0">
                             <div className="h-full bg-primary" style={{ width: `${job.progress}%` }} />
                          </div>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TrashInspectorTab({ stats }: { stats?: any }) {
  const queryClient = useQueryClient();
  const cleanupTrash = useMutation({
     mutationFn: async () => await api.post("/trash/cleanup"),
     onSuccess: () => {
        toast.success("Trash purged");
        queryClient.invalidateQueries({ queryKey: ["dev-trash-stats"] });
        queryClient.invalidateQueries({ queryKey: ["system-status"] });
     }
  });

  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border/50 rounded-3xl p-8 space-y-6 shadow-sm">
             <div className="flex items-center space-x-4">
                <div className="p-3 bg-destructive/10 text-destructive rounded-2xl"><Trash2 size={24} /></div>
                <h3 className="text-xl font-display font-bold">Retention Policy</h3>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase">Trashed Items</p>
                   <p className="text-2xl font-semibold font-mono tabular-nums">{stats?.total_files || 0}</p>
                </div>
                <div className="space-y-1">
                   <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase">Trash Footprint</p>
                   <p className="text-2xl font-semibold font-mono tabular-nums">{formatSize(stats?.total_size || 0)}</p>
                </div>
             </div>
             <div className="p-4 bg-surface-1 dark:bg-card rounded-2xl border border-border/50 space-y-2">
                <div className="flex justify-between text-sm">
                   <span className="text-muted-foreground font-medium">Auto-purge after</span>
                   <span className="font-semibold font-mono tabular-nums text-primary">{stats?.retention_days || 30} days</span>
                </div>
                <div className="flex justify-between text-sm">
                   <span className="text-muted-foreground font-medium">Oldest item</span>
                   <span className="font-bold">{stats?.oldest_item_at ? formatDistanceToNow(new Date(stats.oldest_item_at), {addSuffix: true}) : "None"}</span>
                </div>
             </div>
          </div>

          <div className="bg-card border border-border/50 rounded-3xl p-8 space-y-6 shadow-sm">
             <div className="flex items-center space-x-4">
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl"><Calendar size={24} /></div>
                <h3 className="text-xl font-display font-bold">Purge Control</h3>
             </div>
             <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                Immediate purge will permanently delete all chunks from Telegram and remove records from the database. This action is atomic.
             </p>
             <Button 
               variant="destructive" 
               className="w-full h-14 rounded-2xl font-bold shadow-lg shadow-destructive/10"
               onClick={() => {
                  if(window.confirm("PURGE ALL TRASH?\n\nThis will permanently destroy all Telegram chunks for trashed files. Proceed?")) {
                     cleanupTrash.mutate();
                  }
               }}
               disabled={cleanupTrash.isPending}
             >
                {cleanupTrash.isPending ? <Loader2 className="animate-spin mr-2" /> : <XCircle size={18} className="mr-2" />}
                Run Trash Cleanup Now
             </Button>
          </div>
       </div>
    </div>
  );
}

function PreviewInspectorTab({ stats }: { stats?: any }) {
  const queryClient = useQueryClient();
  const clearCache = useMutation({
    mutationFn: async () => await api.post("/developer/preview/clear-cache"),
    onSuccess: () => {
      toast.success("Preview cache cleared");
      queryClient.invalidateQueries({ queryKey: ["dev-preview-stats"] });
    }
  });

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <MetricCard label="Total Requests" value={String(stats?.requests || 0)} />
          <MetricCard label="Cache Hits" value={String(stats?.cache_hits || 0)} />
          <MetricCard label="Cache Usage" value={formatSize(stats?.cache_usage || 0)} />
       </div>

       <div className="bg-card border border-border/50 rounded-xl p-8 md:p-12 space-y-8 shadow-sm">
          <div className="flex items-center justify-between">
             <div className="flex items-center space-x-4">
                <div className="p-3 bg-primary/10 text-primary rounded-2xl"><Eye size={24} /></div>
                <h3 className="text-2xl font-display font-bold tracking-tight">Preview Engine</h3>
             </div>
             <Button 
               variant="outline" 
               className="rounded-xl border-border/50 font-bold"
               onClick={() => clearCache.mutate()}
               disabled={clearCache.isPending}
             >
                {clearCache.isPending ? <Loader2 className="animate-spin mr-2" /> : <Eraser size={16} className="mr-2" />}
                Clear Cache
             </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
             <div className="space-y-6">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Cache Performance</h4>
                <div className="space-y-4">
                   <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Efficiency Rate</span>
                      <span className="font-semibold font-mono tabular-nums text-primary">
                         {stats?.requests > 0 ? ((stats.cache_hits / stats.requests) * 100).toFixed(1) : 0}%
                      </span>
                   </div>
                   <Progress value={stats?.requests > 0 ? (stats.cache_hits / stats.requests) * 100 : 0} className="h-2" />
                   <p className="text-[10px] text-muted-foreground/60 leading-relaxed italic">
                      High efficiency means previews are served from local storage instead of re-downloading from Telegram.
                   </p>
                </div>
             </div>

             <div className="space-y-6 p-6 bg-surface-1 dark:bg-surface-1/50 rounded-3xl border border-border/50/50">
                <div className="flex items-center space-x-3 text-amber-500">
                   <Target size={20} />
                   <h4 className="font-bold">MVP Policy</h4>
                </div>
                <ul className="space-y-3">
                   <li className="flex items-center text-xs text-muted-foreground font-medium"><CheckCircle2 size={14} className="text-green-500 mr-2" /> 30-min Auto-cleanup enabled</li>
                   <li className="flex items-center text-xs text-muted-foreground font-medium"><CheckCircle2 size={14} className="text-green-500 mr-2" /> 10MB Text limit enforced</li>
                   <li className="flex items-center text-xs text-muted-foreground font-medium"><CheckCircle2 size={14} className="text-green-500 mr-2" /> End-to-end decryption active</li>
                </ul>
             </div>
          </div>
       </div>
    </div>
  );
}

function DatabaseTab({ status }: any) {
  const optimizeMutation = useMutation({
    mutationFn: async () => await api.post("/developer/database/optimize"),
    onSuccess: () => toast.success("Database vacuumed")
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-card border border-border/50 rounded-2xl md:rounded-xl overflow-hidden shadow-sm text-foreground">
        <div className="p-6 md:p-10 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <div className="flex items-center space-x-4 md:space-x-6">
              <div className="p-3 md:p-4 bg-amber-500 text-white rounded-xl md:rounded-2xl shadow-xl shadow-amber-500/20 shrink-0"><Database size={24} className="md:w-7 md:h-7" /></div>
              <div className="min-w-0">
                <h3 className="text-lg md:text-2xl font-display font-bold tracking-tight truncate">Metadata Index</h3>
                <p className="text-[10px] md:text-sm text-muted-foreground font-medium truncate">SQL-Lite 3.x with WAL Concurrency</p>
              </div>
           </div>
           <div className="sm:text-right flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-start">
              <p className="text-2xl md:text-4xl font-semibold font-mono tabular-nums shrink-0">{formatDBSize(status?.db_size)}</p>
              <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider mt-1 ml-2 sm:ml-0 shrink-0">Disk Footprint</p>
           </div>
        </div>
        
        <div className="p-6 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
           <div className="space-y-6">
              <h4 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Maintenance</h4>
              <div className="space-y-3">
                 <Button 
                   variant="outline" 
                   className="w-full justify-between h-14 md:h-16 rounded-xl md:rounded-2xl px-5 md:px-6 group border-border/50"
                   onClick={() => optimizeMutation.mutate()}
                   disabled={optimizeMutation.isPending}
                 >
                    <div className="flex items-center space-x-3 md:space-x-4">
                       <RefreshCw size={18} className={cn(optimizeMutation.isPending && "animate-spin", "text-amber-500")} />
                       <span className="font-bold text-sm md:text-base">Vacuum & Reindex</span>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground/40 group-hover:translate-x-1 transition-transform" />
                 </Button>
                 <Button variant="outline" className="w-full justify-between h-14 md:h-16 rounded-xl md:rounded-2xl px-5 md:px-6 group border-border/50">
                    <div className="flex items-center space-x-3 md:space-x-4">
                       <ShieldAlert size={18} className="text-primary" />
                       <span className="font-bold text-sm md:text-base">Integrity Audit</span>
                    </div>
                    <ChevronRight size={18} className="text-muted-foreground/40 group-hover:translate-x-1 transition-transform" />
                 </Button>
              </div>
           </div>

           <div className="bg-surface-1 dark:bg-card rounded-2xl md:rounded-xl p-8 space-y-5 md:space-y-6">
              <h4 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Storage Engine</h4>
              <div className="space-y-4 md:space-y-5">
                 <ProfileItem label="Journaling" value="WAL (Async)" />
                 <ProfileItem label="Locking" value="Shared-Exc" />
                 <ProfileItem label="Encoding" value="UTF-8" />
                 <ProfileItem label="Page Size" value="4096B" />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function TelegramTab() {
  const { data: tgDiag } = useQuery({
    queryKey: ["dev-tg-diag"],
    queryFn: async () => {
      const resp = await api.get<StructuredResponse<any>>("/developer/telegram/diagnostic");
      return resp.data.data;
    }
  });

  return (
    <div className="animate-in fade-in duration-500 px-1">
      <div className="bg-card border border-border/50 rounded-2xl md:rounded-xl p-6 md:p-12 space-y-8 md:space-y-10 shadow-sm relative overflow-hidden text-foreground">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none hidden md:block">
           <Send size={240} strokeWidth={1} />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 md:gap-6 relative z-10">
           <div className="flex items-center space-x-4 md:space-x-6">
              <div className="p-4 md:p-5 bg-primary text-white rounded-xl md:rounded-xl shadow-2xl shadow-primary/30 shrink-0"><Send size={24} className="md:w-8 md:h-8" /></div>
              <div className="min-w-0">
                <h3 className="text-xl md:text-3xl font-display font-bold tracking-tight truncate">MTProto Backbone</h3>
                <p className="text-xs md:text-base text-muted-foreground font-medium truncate">@{tgDiag?.account || "unresolved"}</p>
              </div>
           </div>
           <div className={cn(
             "px-4 md:px-6 py-1.5 md:py-2 rounded-full text-[9px] md:text-xs font-semibold uppercase tracking-wider border shadow-sm w-fit",
             tgDiag?.connected ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-destructive/10 text-destructive border-destructive/20"
           )}>
              {tgDiag?.connected ? "Operational" : "Disconnected"}
           </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8 relative z-10">
           <MetricCard label="Storage Target" value={tgDiag?.storage_target || "Saved Messages"} />
           <MetricCard label="Account" value={tgDiag?.account || "..."} />
           <MetricCard label="Ping" value="~ 82 ms" />
        </div>

        <div className="pt-4 md:pt-8 space-y-4 md:space-y-6 relative z-10">
           <h4 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Network Diagnostic Matrix</h4>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <Button variant="outline" className="h-14 md:h-16 rounded-xl md:rounded-2xl font-bold text-xs md:text-base border-border/50 bg-card hover:bg-surface-1 transition-all">Audit Permissions</Button>
              <Button variant="outline" className="h-14 md:h-16 rounded-xl md:rounded-2xl font-bold text-xs md:text-base border-border/50 bg-card hover:bg-surface-1 transition-all">Flush Session Cache</Button>
           </div>
        </div>
      </div>
    </div>
  );
}

// --- HELPERS ---

function InfoItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex flex-col space-y-0.5 md:space-y-1">
      <span className="text-[11px] text-muted-foreground/60 font-semibold uppercase tracking-wider">{label}</span>
      <span className="text-sm md:text-base font-semibold text-foreground truncate">{value || "..."}</span>
    </div>
  );
}

function ProfileItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-xs md:text-sm text-muted-foreground font-medium">{label}</span>
      <span className="text-xs md:text-sm font-semibold font-mono tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function StatusDot({ label, ok }: { label: string, ok: boolean }) {
  return (
    <div className="flex items-center justify-between group cursor-default">
      <span className="text-xs md:text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">{label}</span>
      <div className={cn("w-2.5 h-2.5 md:w-3 md:h-3 rounded-full shadow-lg", ok ? "bg-green-500 shadow-green-500/40" : "bg-destructive shadow-destructive/40")} />
    </div>
  );
}

function MetricCard({ label, value }: { label: string, value: string }) {
  return (
    <div className="p-5 md:p-8 bg-surface-1 dark:bg-surface-1/50 rounded-2xl md:rounded-3xl space-y-1 md:space-y-2 border border-border/50/50 text-foreground">
       <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">{label}</p>
       <p className="text-base md:text-xl font-semibold font-mono tabular-nums truncate tracking-tight">{value}</p>
    </div>
  );
}
