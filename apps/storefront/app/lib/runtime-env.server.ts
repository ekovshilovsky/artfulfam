export type RuntimeEnv = Record<string, string | undefined>;

export function getRuntimeEnv(contextEnv?: RuntimeEnv): RuntimeEnv {
  // Hydrogen/Oxygen design: runtime secrets come from `context.env`.
  // For local dev, configure MiniOxygen to inject required server vars (see `vite.config.ts`).
  return contextEnv || {};
}

