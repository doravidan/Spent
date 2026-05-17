"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { startSync, submitSyncOtp, type SyncProgressEvent } from "@/lib/api";

export interface SyncState {
  syncing: boolean;
  stage: string;
}

export function useBankSync() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<Record<string, SyncState>>({});

  const start = useCallback(
    (provider: string) => {
      setState((prev) => ({
        ...prev,
        [provider]: { syncing: true, stage: "Connecting…" },
      }));
      const { cancel } = startSync(provider, (event: SyncProgressEvent) => {
        if (event.type === "provider-start") {
          setState((prev) => ({
            ...prev,
            [provider]: { syncing: true, stage: "Pulling transactions…" },
          }));
        } else if (event.type === "provider-2fa-needed") {
          setState((prev) => ({
            ...prev,
            [provider]: { syncing: true, stage: "Waiting for SMS code…" },
          }));
          void (async () => {
            const syncRunId = Number(event.data.syncRunId);
            const code = window.prompt(
              `${provider} sent an SMS code. Enter the one-time code to continue syncing.`
            );
            if (!code?.trim()) {
              cancel();
              setState((prev) => ({
                ...prev,
                [provider]: { syncing: false, stage: "" },
              }));
              toast.warning(`${provider} sync cancelled`, {
                description: "No 2FA code was entered.",
              });
              return;
            }
            try {
              setState((prev) => ({
                ...prev,
                [provider]: { syncing: true, stage: "Submitting SMS code…" },
              }));
              await submitSyncOtp(syncRunId, code.trim());
            } catch (error) {
              cancel();
              setState((prev) => ({
                ...prev,
                [provider]: { syncing: false, stage: "" },
              }));
              toast.error(
                error instanceof Error ? error.message : "Could not submit 2FA code",
                { duration: Infinity, closeButton: true }
              );
            }
          })();
        } else if (event.type === "provider-2fa-manual") {
          setState((prev) => ({
            ...prev,
            [provider]: { syncing: true, stage: "Solve 2FA in popup…" },
          }));
        } else if (event.type === "provider-done") {
          if (event.data.ok === false) {
            setState((prev) => ({
              ...prev,
              [provider]: { syncing: false, stage: "" },
            }));
          }
        } else if (event.type === "stage") {
          const s = event.data.stage as string;
          setState((prev) => ({
            ...prev,
            [provider]: {
              syncing: true,
              stage: s === "categorizing" ? "Categorizing…" : "Working…",
            },
          }));
        } else if (event.type === "complete") {
          setState((prev) => ({
            ...prev,
            [provider]: { syncing: false, stage: "" },
          }));
          const data = event.data as {
            added: number;
            updated: number;
            categorized: number;
            providers?: Array<{ ok: boolean; provider: string; errorMessage?: string }>;
          };
          const failed = data.providers?.find((p) => !p.ok);
          if (failed) {
            toast.error(failed.errorMessage ?? `${failed.provider} sync failed`, {
              duration: Infinity,
              closeButton: true,
            });
            return;
          }
          toast.success(
            `Sync complete: ${data.added} new, ${data.updated} updated, ${data.categorized} categorized`
          );
          queryClient.invalidateQueries({ queryKey: ["integrations"] });
          queryClient.invalidateQueries({ queryKey: ["summary"] });
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
        } else if (event.type === "error") {
          setState((prev) => ({
            ...prev,
            [provider]: { syncing: false, stage: "" },
          }));
          toast.error((event.data.message as string) ?? "Sync failed", {
            duration: Infinity,
            closeButton: true,
          });
        }
      });
    },
    [queryClient]
  );

  const stateFor = (provider: string): SyncState =>
    state[provider] ?? { syncing: false, stage: "" };

  const anySyncing = Object.values(state).some((s) => s.syncing);

  return { start, stateFor, anySyncing };
}
