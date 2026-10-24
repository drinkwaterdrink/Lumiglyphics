import { describe, expect, test } from "bun:test";
import { PlanningQueue, throwIfAborted } from "./planning-queue.js";

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe("planning queue", () => {
  test("a deadline fails visibly, releases ownership and ignores a late result", async () => {
    const queue = new PlanningQueue(15);
    const gate = deferred();
    const first = queue.enqueue("user", "a", "m1", async () => gate.promise);
    const outcome = first.promise.then(() => "resolved", error => error.name);
    expect(await Promise.race([outcome, new Promise(resolve => setTimeout(() => resolve("still blocked"), 60))])).toBe("PreparationTimeoutError");
    expect(first.operation.controller.signal.aborted).toBe(true);
    expect(first.operation.stage).toBe("failed");
    expect(await queue.enqueue("user", "a", "m1", async () => "retry ready").promise).toBe("retry ready");
    gate.resolve();
    await flush();
    expect(first.operation.stage).toBe("failed");
    expect(queue.active()).toHaveLength(0);
  });
  test("cancelling an unresponsive task releases the chat for a fresh request", async () => {
    const queue = new PlanningQueue();
    const first = queue.enqueue("user", "a", "m1", async () => new Promise<void>(() => {}));
    const rejection = first.promise.then(() => "resolved", error => error.name);
    await flush();
    queue.cancelChat("user", "a");
    expect(await Promise.race([rejection, new Promise(resolve => setTimeout(() => resolve("still blocked"), 30))])).toBe("AbortError");
    const next = queue.enqueue("user", "a", "m2", async () => "ready");
    expect(await next.promise).toBe("ready");
  }, 300);
  test("orders one chat while another chat runs independently", async () => {
    const queue = new PlanningQueue();
    const gate = deferred();
    const events: string[] = [];
    const first = queue.enqueue("user", "a", "m1", async () => {
      events.push("a1-start");
      await gate.promise;
      events.push("a1-end");
    });
    const second = queue.enqueue("user", "a", "m2", async () => { events.push("a2"); });
    const other = queue.enqueue("user", "b", "m1", async () => { events.push("b1"); });
    await flush();
    expect(events).toEqual(["a1-start", "b1"]);
    gate.resolve();
    await Promise.all([first.promise, second.promise, other.promise]);
    expect(events).toEqual(["a1-start", "b1", "a1-end", "a2"]);
  });

  test("deduplicates and aborts queued work before invoking its task", async () => {
    const queue = new PlanningQueue();
    const gate = deferred();
    const first = queue.enqueue(undefined, "a", "m1", async () => gate.promise);
    const duplicate = queue.enqueue<void>(undefined, "a", "m1", async () => { throw new Error("must not run"); });
    let ran = false;
    const queued = queue.enqueue(undefined, "a", "m2", async (operation) => {
      ran = true;
      throwIfAborted(operation.controller.signal);
    });
    expect(duplicate.reused).toBe(true);
    expect(duplicate.promise).toBe(first.promise);
    queue.cancelChat(undefined, "a", queued.operation.id);
    gate.resolve();
    await first.promise;
    await expect(queued.promise).rejects.toHaveProperty("name", "AbortError");
    expect(ran).toBe(false);
    expect(queued.operation.stage).toBe("cancelled");
  });
});

  test("a just-cancelled operation is never returned as a dedupe hit", async () => {
    const queue = new PlanningQueue();
    const gate = deferred();
    const first = queue.enqueue("user", "a", "m1", async () => gate.promise);
    const rejection = first.promise.then(() => "resolved", error => error.name);
    queue.cancelChat("user", "a");
    // Same dedupe identity, enqueued in the same turn: it must run, not inherit
    // the cancelled operation's rejection.
    const retry = queue.enqueue("user", "a", "m1", async () => "retry ready");
    expect(retry.reused).toBe(false);
    expect(await retry.promise).toBe("retry ready");
    gate.resolve();
    expect(await rejection).toBe("AbortError");
    await flush();
    expect(queue.active()).toHaveLength(0);
  });
