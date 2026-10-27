/// <reference types="astro/client" />

type D1Database = import("@cloudflare/workers-types").D1Database;
type KVNamespace = import("@cloudflare/workers-types").KVNamespace;
type D1Result = import("@cloudflare/workers-types").D1Result;

interface Env {
  DB: D1Database;
  // CACHE: KVNamespace;
  [key: string]: unknown;
}

declare namespace App {
  interface Locals {
    runtime: { env: Env };
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
      role?: string;
    } | null;
  }
}
