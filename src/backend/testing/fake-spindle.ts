import type { SpindleAPI } from "lumiverse-spindle-types";

/**
 * A small in-memory stand-in for the Lumiverse host, shared by tests. It keeps
 * user storage in a Map, records every outgoing call, and lets a test script the
 * planner's replies. It covers the surfaces the planner and controller touch;
 * anything else throws, so a test fails loudly instead of passing silently.
 */
export type FakeSpindleOptions = {
  /** Replies to generate.raw, in order. A string is returned as content; an Error is thrown. */
  plannerReplies?: Array<string | Error | { content: string; usage?: { prompt_tokens?: number; completion_tokens?: number } }>;
  /** Used for further calls after the scripted replies run out. */
  plannerFallback?: string | Error;
  systemOneKey?: string;
};

export type FakeSpindle = {
  api: SpindleAPI;
  storage: Map<string, unknown>;
  generateCalls: Array<{ messages: unknown[] }>;
  corsCalls: Array<{ url: string; body: string }>;
  sentToFrontend: unknown[];
  logs: string[];
};

export function createFakeSpindle(options: FakeSpindleOptions = {}): FakeSpindle {
  const storage = new Map<string, unknown>();
  const generateCalls: FakeSpindle["generateCalls"] = [];
  const corsCalls: FakeSpindle["corsCalls"] = [];
  const sentToFrontend: unknown[] = [];
  const logs: string[] = [];
  const replies = [...(options.plannerReplies ?? [])];

  const unsupported = (name: string) => () => {
    throw new Error(`FakeSpindle: ${name} is not implemented for this test`);
  };

  const api = {
    userStorage: {
      async getJson(path: string, opts?: { fallback?: unknown; userId?: string }) {
        const key = `${opts?.userId ?? ""}:${path}`;
        return storage.has(key) ? structuredClone(storage.get(key)) : opts?.fallback ?? null;
      },
      async setJson(path: string, value: unknown, opts?: { userId?: string }) {
        storage.set(`${opts?.userId ?? ""}:${path}`, structuredClone(value));
      },
      async deleteJson(path: string, opts?: { userId?: string }) {
        storage.delete(`${opts?.userId ?? ""}:${path}`);
      },
    },
    generate: {
      async raw(request: { messages: unknown[] }) {
        generateCalls.push({ messages: request.messages });
        const next = replies.length ? replies.shift() : options.plannerFallback;
        if (next === undefined) throw new Error("FakeSpindle: no planner reply scripted");
        if (next instanceof Error) throw next;
        if (typeof next === "string") return { content: next, finish_reason: "stop" };
        return { content: next.content, finish_reason: "stop", usage: next.usage };
      },
    },
    enclave: {
      async get(key: string) {
        return key === "system_one_api_key" ? options.systemOneKey ?? null : null;
      },
    },
    cors: async (url: string, init: { body: string }) => {
      corsCalls.push({ url, body: init.body });
      throw new Error("FakeSpindle: cors is not scripted for this test");
    },
    sendToFrontend: (message: unknown) => {
      sentToFrontend.push(message);
    },
    log: {
      info: (message: string) => logs.push(`info ${message}`),
      warn: (message: string) => logs.push(`warn ${message}`),
      error: (message: string) => logs.push(`error ${message}`),
      debug: (message: string) => logs.push(`debug ${message}`),
    },
    chats: { get: unsupported("chats.get") },
    chat: { getMessages: unsupported("chat.getMessages") },
  } as unknown as SpindleAPI;

  return { api, storage, generateCalls, corsCalls, sentToFrontend, logs };
}
