export type PlanningStage = "queued" | "running" | "completed" | "failed" | "cancelled";

export class PreparationTimeoutError extends Error {
  constructor() {
    super("Scene preparation took too long. Check the story reader connection/model, then try again. The image model has not necessarily been called. A provider request may still finish remotely.");
    this.name = "PreparationTimeoutError";
  }
}

export type PlanningOperation = {
  id: string;
  userId: string | undefined;
  chatId: string;
  sourceId: string;
  dedupeId: string;
  controller: AbortController;
  stage: PlanningStage;
};

export type PlanningTask<T> = (operation: PlanningOperation) => Promise<T>;

export type ScheduledPlanning<T> = {
  operation: PlanningOperation;
  promise: Promise<T>;
  reused: boolean;
};

function compoundKey(parts: readonly (string | null | undefined)[]): string {
  return JSON.stringify(parts.map((part) => part ?? null));
}

function operationId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `vn-plan-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function abortError(reason: unknown = "Planning cancelled."): Error {
  if (reason instanceof Error) return reason;
  const error = new Error(typeof reason === "string" ? reason : "Planning cancelled.");
  error.name = "AbortError";
  return error;
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError(signal.reason);
}

export function isAbortError(error: unknown, signal?: AbortSignal): boolean {
  if (error instanceof PreparationTimeoutError) return false;
  return Boolean(signal?.aborted || (error instanceof Error && error.name === "AbortError"));
}

/** Serializes narrative planning per chat. Different chats remain independent. */
export class PlanningQueue {
  constructor(private readonly timeoutMs = 180_000) {}
  private readonly operations = new Map<string, ScheduledPlanning<unknown>>();
  private readonly chatTails = new Map<string, Promise<void>>();

  enqueue<T>(
    userId: string | undefined,
    chatId: string,
    sourceId: string,
    task: PlanningTask<T>,
    dedupeId = sourceId
  ): ScheduledPlanning<T> {
    const dedupeKey = compoundKey([userId, chatId, dedupeId]);
    const existing = this.operations.get(dedupeKey) as ScheduledPlanning<T> | undefined;
    // A cancelled operation keeps its map entry until its tail settles, which is
    // one or more microtasks later. Returning it would hand the caller a promise
    // that is already rejected (an explicit retry silently dropped); only a live
    // operation is a valid dedupe hit.
    if (existing && !existing.operation.controller.signal.aborted) return { ...existing, reused: true };

    const operation: PlanningOperation = {
      id: operationId(),
      userId,
      chatId,
      sourceId,
      dedupeId,
      controller: new AbortController(),
      stage: "queued"
    };
    const chatKey = compoundKey([userId, chatId]);
    const previous = this.chatTails.get(chatKey) ?? Promise.resolve();
    const execute = async (): Promise<T> => {
      if (operation.controller.signal.aborted) {
        operation.stage = "cancelled";
        throwIfAborted(operation.controller.signal);
      }
      operation.stage = "running";
      let timer: ReturnType<typeof setTimeout> | undefined;
      let onAbort: (() => void) | undefined;
      try {
        // Releasing a cancelled wait must not depend on the provider settling.
        // Callers still check the signal before applying late results.
        const interrupted = new Promise<never>((_, reject) => {
          onAbort = () => reject(abortError(operation.controller.signal.reason));
          operation.controller.signal.addEventListener("abort", onAbort, { once: true });
          timer = setTimeout(() => operation.controller.abort(new PreparationTimeoutError()), this.timeoutMs);
        });
        const result = await Promise.race([task(operation), interrupted]);
        throwIfAborted(operation.controller.signal);
        operation.stage = "completed";
        return result;
      } catch (error) {
        operation.stage = isAbortError(error, operation.controller.signal) ? "cancelled" : "failed";
        throw error;
      } finally {
        clearTimeout(timer);
        if (onAbort) operation.controller.signal.removeEventListener("abort", onAbort);
      }
    };
    const promise = previous.then(execute, execute);
    const tail = promise.then(() => undefined, () => undefined);
    const scheduled: ScheduledPlanning<T> = { operation, promise, reused: false };
    this.operations.set(dedupeKey, scheduled as ScheduledPlanning<unknown>);
    this.chatTails.set(chatKey, tail);
    void tail.finally(() => {
      if (this.operations.get(dedupeKey)?.promise === promise) this.operations.delete(dedupeKey);
      if (this.chatTails.get(chatKey) === tail) this.chatTails.delete(chatKey);
    });
    return scheduled;
  }

  cancelChat(userId: string | undefined, chatId: string, operationId?: string, reason = "Planning cancelled."): string[] {
    const cancelled: string[] = [];
    for (const scheduled of this.operations.values()) {
      const operation = scheduled.operation;
      if (operation.userId !== userId || operation.chatId !== chatId) continue;
      if (operationId && operation.id !== operationId) continue;
      if (!operation.controller.signal.aborted) {
        operation.controller.abort(reason);
        operation.stage = "cancelled";
      }
      cancelled.push(operation.id);
    }
    return cancelled;
  }

  active(): readonly PlanningOperation[] {
    return [...this.operations.values()].map(({ operation }) => operation);
  }
}
