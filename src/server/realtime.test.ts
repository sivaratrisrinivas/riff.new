import { describe, test, expect, beforeEach } from 'bun:test';
import { attach, detach, publish, getChannelSize } from './realtime';

describe('Realtime Pub/Sub', () => {
  beforeEach(() => {
    // Clean up channels between tests
    // Note: In a real implementation, we'd need a way to clear channels
  });

  test('attaches WebSocket to channel', () => {
    const mockWs = {
      readyState: 1, // OPEN
      send: () => {},
    } as unknown as WebSocket;

    attach(mockWs, 'test-channel');
    expect(getChannelSize('test-channel')).toBe(1);
  });

  test('detaches WebSocket from channel', () => {
    const mockWs = {
      readyState: 1,
      send: () => {},
    } as unknown as WebSocket;

    attach(mockWs, 'test-channel');
    expect(getChannelSize('test-channel')).toBe(1);
    
    detach(mockWs, 'test-channel');
    expect(getChannelSize('test-channel')).toBe(0);
  });

  test('publishes message to subscribers', () => {
    let receivedMessage: string | null = null;
    const mockWs = {
      readyState: 1,
      send: (msg: string) => {
        receivedMessage = msg;
      },
    } as unknown as WebSocket;

    attach(mockWs, 'test-channel');
    publish('test-channel', { type: 'test', data: 'hello' });

    expect(receivedMessage).toBe(JSON.stringify({ type: 'test', data: 'hello' }));
  });

  test('does not publish to closed WebSocket', () => {
    let callCount = 0;
    const mockWs = {
      readyState: 3, // CLOSED
      send: () => {
        callCount++;
      },
    } as unknown as WebSocket;

    attach(mockWs, 'test-channel');
    publish('test-channel', { type: 'test' });

    // Should not call send on closed socket
    expect(callCount).toBe(0);
  });
});

