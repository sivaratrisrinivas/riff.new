import { describe, test, expect, beforeEach } from 'bun:test';
import { handleRpc } from './rpc';
import type { RpcContext } from './rpc';
import { db } from './db';

describe('RPC Handler', () => {
  const mockContext: RpcContext = {
    sessionId: 'test-session-123',
  };

  beforeEach(() => {
    // Clean up test data
    db.run('DELETE FROM chains WHERE id LIKE ?', 'test-%');
    db.run('DELETE FROM runs WHERE id LIKE ?', 'test-%');
  });

  test('handles chain.create command', async () => {
    const cmd = {
      type: 'chain.create' as const,
      name: 'Test Chain',
      steps: [
        { id: 'step1', kind: 'persona' as const, config: { personas: ['steelman'] } },
      ],
    };

    const result = await handleRpc(cmd, mockContext);
    
    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.id).toBeDefined();
    
    // Verify chain was created in DB
    const chain = db.query('SELECT * FROM chains WHERE id = ?').get(result.data?.id) as any;
    expect(chain).toBeDefined();
    expect(chain.name).toBe('Test Chain');
  });

  test('handles chain.get command', async () => {
    // Create a chain first
    const chainId = `test-chain-${Date.now()}`;
    db.run(
      'INSERT INTO chains (id, name, steps_json, created_at) VALUES (?, ?, ?, ?)',
      chainId,
      'Test Chain',
      JSON.stringify([{ id: 'step1', kind: 'persona', config: {} }]),
      Date.now()
    );

    const cmd = {
      type: 'chain.get' as const,
      id: chainId,
    };

    const result = await handleRpc(cmd, mockContext);
    
    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.id).toBe(chainId);
    expect(result.data?.name).toBe('Test Chain');
  });

  test('returns error for non-existent chain', async () => {
    const cmd = {
      type: 'chain.get' as const,
      id: 'non-existent-chain',
    };

    const result = await handleRpc(cmd, mockContext);
    
    expect(result.ok).toBe(false);
    expect(result.error).toBe('chain-not-found');
  });

  test('handles invalid command', async () => {
    const cmd = {
      type: 'invalid-command' as any,
    };

    const result = await handleRpc(cmd, mockContext);
    
    expect(result.ok).toBe(false);
    expect(result.error).toBe('invalid-payload');
  });
});

