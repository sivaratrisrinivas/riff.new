import { z } from 'zod';

// Chain operations
export const ChainCreateCmd = z.object({
  type: z.literal('chain.create'),
  name: z.string().min(1),
  steps: z.array(z.object({
    id: z.string(),
    kind: z.enum(['persona', 'summarize', 'map']),
    config: z.any(),
  })),
});

export const ChainGetCmd = z.object({
  type: z.literal('chain.get'),
  id: z.string().optional(),
  slug: z.string().optional(),
});

// Run operations
export const RunExecuteCmd = z.object({
  type: z.literal('run.execute'),
  chainId: z.string().optional(),
  slug: z.string().optional(),
  text: z.string().min(10),
});

// Legacy analyze command (for backward compatibility)
export const AnalyzeCmd = z.object({
  type: z.literal('analyze'),
  text: z.string().min(10),
  personas: z.array(z.string()).min(0).default([]),
});

// Union of all commands
export const RpcCommand = z.discriminatedUnion('type', [
  ChainCreateCmd,
  ChainGetCmd,
  RunExecuteCmd,
  AnalyzeCmd,
]);

export type RpcCommand = z.infer<typeof RpcCommand>;
export type ChainCreateCmd = z.infer<typeof ChainCreateCmd>;
export type ChainGetCmd = z.infer<typeof ChainGetCmd>;
export type RunExecuteCmd = z.infer<typeof RunExecuteCmd>;
export type AnalyzeCmd = z.infer<typeof AnalyzeCmd>;

