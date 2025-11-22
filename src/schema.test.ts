import { describe, test, expect } from 'bun:test';
import { RpcCommand, ChainCreateCmd, RunExecuteCmd, AnalyzeCmd } from './schema';

describe('RPC Schema Validation', () => {
  test('validates chain.create command', () => {
    const cmd = {
      type: 'chain.create',
      name: 'Test Chain',
      steps: [
        { id: 'step1', kind: 'persona', config: { personas: ['steelman'] } },
      ],
    };
    
    const result = ChainCreateCmd.safeParse(cmd);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Test Chain');
      expect(result.data.steps).toHaveLength(1);
    }
  });

  test('rejects invalid chain.create (missing name)', () => {
    const cmd = {
      type: 'chain.create',
      steps: [],
    };
    
    const result = ChainCreateCmd.safeParse(cmd);
    expect(result.success).toBe(false);
  });

  test('validates run.execute command', () => {
    const cmd = {
      type: 'run.execute',
      chainId: 'chain-123',
      text: 'This is a test text that is long enough',
    };
    
    const result = RunExecuteCmd.safeParse(cmd);
    expect(result.success).toBe(true);
  });

  test('rejects run.execute with short text', () => {
    const cmd = {
      type: 'run.execute',
      chainId: 'chain-123',
      text: 'short',
    };
    
    const result = RunExecuteCmd.safeParse(cmd);
    expect(result.success).toBe(false);
  });

  test('validates legacy analyze command', () => {
    const cmd = {
      type: 'analyze',
      text: 'This is a test text that is long enough',
      personas: ['steelman', 'red-team'],
    };
    
    const result = AnalyzeCmd.safeParse(cmd);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.personas).toEqual(['steelman', 'red-team']);
    }
  });

  test('validates analyze command without personas', () => {
    const cmd = {
      type: 'analyze',
      text: 'This is a test text that is long enough',
    };
    
    const result = AnalyzeCmd.safeParse(cmd);
    expect(result.success).toBe(true);
    if (result.success) {
      // Default should be applied
      expect(result.data.personas).toEqual([]);
    }
  });

  test('discriminated union works correctly', () => {
    const cmd1 = {
      type: 'chain.create',
      name: 'Test',
      steps: [],
    };
    
    const cmd2 = {
      type: 'analyze',
      text: 'This is a test text that is long enough',
    };
    
    const result1 = RpcCommand.safeParse(cmd1);
    const result2 = RpcCommand.safeParse(cmd2);
    
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
  });
});

