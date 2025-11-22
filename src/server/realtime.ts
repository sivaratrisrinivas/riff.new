// Pub/sub system for realtime updates
const channels = new Map<string, Set<WebSocket>>();

export function attach(ws: WebSocket, key: string): void {
  if (!channels.has(key)) {
    channels.set(key, new Set());
  }
  channels.get(key)!.add(ws);
}

export function detach(ws: WebSocket, key: string): void {
  channels.get(key)?.delete(ws);
  if (channels.get(key)?.size === 0) {
    channels.delete(key);
  }
}

export function publish(key: string, msg: unknown): void {
  const subscribers = channels.get(key);
  if (!subscribers) return;
  
  const msgStr = JSON.stringify(msg);
  const toRemove: WebSocket[] = [];
  
  subscribers.forEach((ws) => {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msgStr);
      } else {
        toRemove.push(ws);
      }
    } catch (error) {
      console.error('Error publishing to WebSocket:', error);
      toRemove.push(ws);
    }
  });
  
  // Clean up closed connections
  toRemove.forEach((ws) => {
    subscribers.delete(ws);
  });
  
  if (subscribers.size === 0) {
    channels.delete(key);
  }
}

export function getChannelSize(key: string): number {
  return channels.get(key)?.size || 0;
}

