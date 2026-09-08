"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

/* ── Types ─────────────────────────────────────────────────────────────── */

export interface TelegramAccount {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  phone?: string;
  premium: boolean;
  bot: boolean;
}

export interface TelegramStorage {
  total_messages: number;
  total_size_bytes: number;
  drive_chunks: number;
  stream_chunks: number;
  s3_chunks: number;
  unknown: number;
  last_message_id: number;
  first_message_id: number;
}

export interface TelegramConnection {
  latency_ms: number | null;
  flood_wait_until: number | null;
  error?: string;
}

export interface TelegramHealth {
  connected: boolean;
  session_valid: boolean;
  storage_target: string;
  account?: TelegramAccount;
  storage?: TelegramStorage;
  storage_cached?: boolean;
  connection?: TelegramConnection;
}

export interface RebuildStats {
  scanned: number;
  recovered_chunks: number;
  recovered_files?: number;
  errors: number;
}

/* ── Hooks ─────────────────────────────────────────────────────────────── */

export function useTelegramHealth(refresh = false) {
  return useQuery<TelegramHealth>({
    queryKey: ["telegram", "health"],
    queryFn: async () => {
      const { data } = await api.get("/telegram/health", {
        params: { refresh },
      });
      return data.data;
    },
    refetchInterval: 30_000, // Poll every 30s
  });
}

export function useTelegramScan() {
  const qc = useQueryClient();
  return useMutation<RebuildStats>({
    mutationFn: async () => {
      const { data } = await api.post("/telegram/scan");
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["telegram", "health"] });
    },
  });
}

export function useTestUpload() {
  return useMutation<{ msg_id: number; bytes: number; status: string }>({
    mutationFn: async () => {
      const { data } = await api.post("/telegram/test-upload");
      return data.data;
    },
  });
}

export function useTestStream() {
  return useMutation<
    { msg_id: number; size: number; mime: string; streamable: boolean },
    Error,
    number
  >({
    mutationFn: async (msgId: number) => {
      const { data } = await api.post("/telegram/test-stream", null, {
        params: { msg_id: msgId },
      });
      return data.data;
    },
  });
}
