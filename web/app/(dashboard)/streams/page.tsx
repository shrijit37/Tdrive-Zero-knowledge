"use client";

import React, { useState } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { Film, Search, Play, FolderOpen, Loader2 } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { FileItem, StructuredResponse } from "@/types";
import VideoPlayer from "@/components/stream/VideoPlayer";

type StreamFile = FileItem & { file_uuid?: string; msg_id?: number };

export default function StreamsPage() {
  const [search, setSearch] = useState("");
  const [playing, setPlaying] = useState<{ msgId: number; filename: string } | null>(null);

  // Step 1: List profile folders under /streams
  const { data: folders, isLoading: foldersLoading } = useQuery({
    queryKey: ["streams", "profiles"],
    queryFn: async () => {
      const res = await api.get<StructuredResponse<FileItem[]>>("/files", { params: { path: "/streams" } });
      return (res.data.data || []).filter((f) => f.is_folder);
    },
  });

  // Step 2: For each profile, fetch its videos
  const profiles = folders?.map((f) => f.filename) || [];

  const videoQueries = useQueries({
    queries: profiles.map((profile) => ({
      queryKey: ["streams", "videos", profile],
      queryFn: async (): Promise<StreamFile[]> => {
        const res = await api.get<StructuredResponse<FileItem[]>>("/files", {
          params: { path: `/streams/${profile}` },
        });
        return (res.data.data || []).filter((f) => !f.is_folder) as StreamFile[];
      },
    })),
    combine: (results) => ({
      videos: results.flatMap((r) => (r.data || []) as StreamFile[]),
      isPending: results.some((r) => r.isPending),
    }),
  });

  const isLoading = foldersLoading || videoQueries.isPending;
  const videos = videoQueries.videos;

  const filtered = videos.filter((v) =>
    !search || v.filename.toLowerCase().includes(search.toLowerCase()) ||
    extractProfile(v).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Film size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Streams</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {videos.length} recording{videos.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by name or profile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 w-52 md:w-64"
          />
        </div>
      </div>

      {/* Player */}
      {playing && (
        <div className="space-y-3">
          <VideoPlayer msgId={playing.msgId} filename={playing.filename} />
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={() => setPlaying(null)}>
              Close player
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
          <Loader2 className="animate-spin mb-4" size={40} strokeWidth={1.5} />
          <p className="text-sm font-medium animate-pulse">Loading streams...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-neutral-50/50 dark:bg-neutral-900/20 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-muted-foreground">
          <FolderOpen size={64} strokeWidth={1} className="mb-4 opacity-20" />
          <p className="text-lg font-medium">No streams found</p>
          <p className="text-sm mt-1">Stream recordings will appear here once pstream videos are discovered.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((v) => (
            <StreamCard key={v.file_id} file={v} onPlay={setPlaying} />
          ))}
        </div>
      )}
    </div>
  );
}

function extractProfile(file: StreamFile): string {
  const parts = file.virtual_path.split("/").filter(Boolean);
  // path is /streams/{profile}/{file}, so profile is parts[1]
  return parts.length >= 2 ? parts[1] : "unknown";
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function StreamCard({ file, onPlay }: { file: StreamFile; onPlay: (p: { msgId: number; filename: string }) => void }) {
  const profile = extractProfile(file);

  return (
    <div className="group relative bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all duration-200">
      {/* Thumbnail area */}
      <div
        className="aspect-video bg-neutral-900 dark:bg-neutral-950 flex items-center justify-center cursor-pointer relative"
        onClick={() => {
          if (file.msg_id) onPlay({ msgId: file.msg_id, filename: file.filename });
        }}
      >
        <Film size={28} className="text-neutral-600" />
        {/* Play overlay */}
        {file.msg_id && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity scale-90 group-hover:scale-100">
              <Play size={18} className="text-black ml-0.5" fill="black" />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 space-y-1">
        <p className="text-xs font-semibold truncate" title={file.filename}>
          {file.filename}
        </p>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="truncate mr-2 font-medium text-primary/70">{profile}</span>
          <span className="shrink-0">{formatBytes(file.size)}</span>
        </div>
        {file.created_at && (
          <p className="text-[10px] text-muted-foreground/60">
            {new Date(file.created_at).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
