import { serve } from 'bun';
import { handleRpc } from './server/rpc';
import { attach, detach } from './server/realtime';
import './server/db'; // Initialize database

const PORT = process.env.PORT || 3000;

// Track last analyzed text per WebSocket for novelty checking (legacy support)
const wsLastText = new Map<string, string>();
// Track pending requests per WebSocket for throttling
const wsPendingRequests = new Map<string, { timestamp: number; fp: string }>();

// Serve static files and handle WebSocket connections
const server = serve({
  port: PORT,
  async fetch(req, server) {
    const url = new URL(req.url);

    // Handle WebSocket upgrade
    if (url.pathname === '/' && req.headers.get('upgrade') === 'websocket') {
      const success = server.upgrade(req, {
        data: { connectedAt: Date.now() },
      });
      if (success) return undefined;
      return new Response('WebSocket upgrade failed', { status: 500 });
    }

    // Serve HTML for root path
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(Bun.file('index.html'), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Serve bundled frontend app
    if (url.pathname === '/app.js') {
      try {
        const result = await Bun.build({
          entrypoints: ['src/frontend.tsx'],
          target: 'browser',
          format: 'esm',
          splitting: false,
          minify: false,
          sourcemap: 'inline',
          external: [], // Bundle everything
        });
        
        if (result.success && result.outputs.length > 0) {
          const output = result.outputs[0];
          return new Response(output, {
            headers: { 
              'Content-Type': 'application/javascript',
              'Cache-Control': 'no-cache',
            },
          });
        } else {
          console.error('Build failed:', result.logs);
          return new Response('Build failed: ' + JSON.stringify(result.logs), { status: 500 });
        }
      } catch (error) {
        console.error('Error building app:', error);
        return new Response(`Error building app: ${error}`, { status: 500 });
      }
    }

    // Fallback: serve index.html for SPA routing
    return new Response(Bun.file('index.html'), {
      headers: { 'Content-Type': 'text/html' },
    });
  },
  websocket: {
    async message(ws, message) {
      try {
        const data = JSON.parse(message.toString());
        const sessionId = String(ws.data.connectedAt);
        
        // Attach WebSocket to session channel for realtime updates (ensure it's attached)
        attach(ws, sessionId);
        
        // Handle RPC command
        const result = await handleRpc(data, { sessionId, ws });
        
        // Send immediate response if needed (for non-streaming commands)
        if (result.ok && result.data && !result.data.runId) {
          ws.send(JSON.stringify({
            type: 'rpc-response',
            ok: true,
            data: result.data,
          }));
        } else if (!result.ok) {
          ws.send(JSON.stringify({
            type: 'error',
            error: result.error || 'Unknown error',
          }));
        }
      } catch (error) {
        console.error('WebSocket error:', error);
        const sessionId = String(ws.data.connectedAt);
        wsPendingRequests.delete(sessionId);
        ws.send(JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    },
    open(ws) {
      const sessionId = String(ws.data.connectedAt);
      attach(ws, sessionId);
    },
    close(ws) {
      const sessionId = String(ws.data.connectedAt);
      detach(ws, sessionId);
      wsLastText.delete(sessionId);
      wsPendingRequests.delete(sessionId);
    },
    error(ws, error) {
      console.error('WebSocket error:', error);
    },
  },
});

