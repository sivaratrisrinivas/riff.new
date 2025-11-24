import { RpcCommand, ChainCreateCmd, ChainGetCmd, RunExecuteCmd, AnalyzeCmd } from '../schema';
import { db } from './db';
import { publish } from './realtime';
import { runChain } from './pipeline';
import { fingerprint } from '../lib/fingerprint';
import { insightCache } from '../lib/cache';
import { generateInsights, parseInsights, generateBandInsights, parseBandInsights, generateBiasDetection } from '../lib/ai';

export interface RpcContext {
  sessionId: string;
  ws?: WebSocket;
}

export async function handleRpc(
  raw: unknown,
  ctx: RpcContext
): Promise<{ ok: boolean; error?: string; data?: any }> {
  try {
    const parsed = RpcCommand.safeParse(raw);
    
    if (!parsed.success) {
      return { ok: false, error: 'invalid-payload' };
    }
    
    const cmd = parsed.data;
    console.info('[rpc] received', cmd.type, 'for session', ctx.sessionId);
    
    // Handle legacy analyze command (backward compatibility)
    if (cmd.type === 'analyze') {
      return await handleAnalyze(cmd, ctx);
    }
    
    // Handle chain.create
    if (cmd.type === 'chain.create') {
      return await handleChainCreate(cmd, ctx);
    }
    
    // Handle chain.get
    if (cmd.type === 'chain.get') {
      return await handleChainGet(cmd, ctx);
    }
    
    // Handle run.execute
    if (cmd.type === 'run.execute') {
      return await handleRunExecute(cmd, ctx);
    }
    
    return { ok: false, error: 'unknown-command' };
  } catch (error) {
    console.error('RPC error:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'unknown-error',
    };
  }
}

async function handleAnalyze(cmd: AnalyzeCmd, ctx: RpcContext) {
  const { text, personas, detectBias } = cmd;
  const personaList = personas || [];
  const wsId = ctx.sessionId;
  console.info('[rpc] analyze start', {
    session: wsId,
    personas: personaList,
    length: text.length,
    detectBias: detectBias || false,
  });
  
  // Check cache
  const fp = fingerprint(text, personaList);
  const cached = insightCache.get(fp);
  
  if (cached) {
    const cachedData = cached.data as Record<string, any>;
    console.info('[rpc] cache-hit', {
      session: wsId,
      personas: personaList,
      keys: Object.keys(cachedData || {}),
    });
    publish(wsId, {
      type: 'cache-hit',
      fp: fp,
      personas: personaList,
      bandInsights: personaList.length > 0 ? cachedData : undefined,
      insights: personaList.length === 0 ? cachedData.insights || [] : undefined,
    });
    
    // Send cached insights
    if (personaList.length > 0) {
      for (const pid of personaList) {
        const insights = (cachedData[pid] as any[]) || [];
        publish(wsId, {
          type: 'complete',
          personaId: pid,
          insights: insights,
        });
      }
    } else {
      const cachedData = cached.data as { insights?: any[] };
      publish(wsId, {
        type: 'complete',
        insights: cachedData.insights || [],
      });
    }
    
    // Still run bias detection if requested (not cached separately)
    if (detectBias) {
      try {
        const biases = await generateBiasDetection(text);
        publish(wsId, {
          type: 'biases',
          biases: biases,
        });
      } catch (error) {
        console.error('Bias detection error:', error);
      }
    }
    
    return { ok: true };
  }
  
  // Generate insights
  if (personaList.length > 0) {
    // Band mode
    let parsedResult: Record<string, any[]> | null = null;
    
    for await (const item of generateBandInsights(text, personaList)) {
      if ('done' in item && item.done) {
        parsedResult = item.result;
        break;
      } else if ('personaId' in item) {
        publish(wsId, {
          type: 'stream',
          personaId: item.personaId,
          chunk: item.chunk,
        });
      }
    }
    
    if (parsedResult) {
      const allInsights = parseBandInsights(parsedResult, personaList);
      insightCache.set(fp, allInsights);
      
      for (const [pid, insights] of Object.entries(allInsights)) {
        publish(wsId, {
          type: 'complete',
          personaId: pid,
          insights: insights,
        });
      }
    }
  } else {
    // Single persona mode
    let fullText = '';
    
    for await (const chunk of generateInsights(text)) {
      fullText += chunk;
      publish(wsId, {
        type: 'stream',
        chunk: chunk,
      });
    }
    
    const insights = await parseInsights(fullText);
    insightCache.set(fp, { insights });
    
    publish(wsId, {
      type: 'complete',
      insights: insights,
    });
  }
  
  // Run bias detection if requested
  if (detectBias) {
    try {
      const biases = await generateBiasDetection(text);
      publish(wsId, {
        type: 'biases',
        biases: biases,
      });
    } catch (error) {
      console.error('Bias detection error:', error);
      // Don't fail the whole request if bias detection fails
    }
  }
  
  return { ok: true };
}

async function handleChainCreate(cmd: ChainCreateCmd, ctx: RpcContext) {
  const chainId = `chain-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  
  db.run(
    `INSERT INTO chains (id, name, steps_json, created_at) VALUES (?, ?, ?, ?)`,
    chainId,
    cmd.name,
    JSON.stringify(cmd.steps),
    Date.now()
  );
  
  return { ok: true, data: { id: chainId } };
}

async function handleChainGet(cmd: ChainGetCmd, ctx: RpcContext) {
  let chain: any = null;
  
  if (cmd.slug) {
    // Look up via share slug
    const share = db.query(`SELECT chain_id FROM shares WHERE slug = ?`).get(cmd.slug) as { chain_id: string } | undefined;
    if (share) {
      chain = db.query(`SELECT * FROM chains WHERE id = ?`).get(share.chain_id) as any;
    }
  } else if (cmd.id) {
    chain = db.query(`SELECT * FROM chains WHERE id = ?`).get(cmd.id) as any;
  }
  
  if (!chain) {
    return { ok: false, error: 'chain-not-found' };
  }
  
  return {
    ok: true,
    data: {
      id: chain.id,
      name: chain.name,
      steps: JSON.parse(chain.steps_json),
    },
  };
}

async function handleRunExecute(cmd: RunExecuteCmd, ctx: RpcContext) {
  // Get chain
  let chain: any = null;
  
  if (cmd.slug) {
    const share = db.query(`SELECT chain_id FROM shares WHERE slug = ?`).get(cmd.slug) as { chain_id: string } | undefined;
    if (share) {
      chain = db.query(`SELECT * FROM chains WHERE id = ?`).get(share.chain_id) as any;
    }
  } else if (cmd.chainId) {
    chain = db.query(`SELECT * FROM chains WHERE id = ?`).get(cmd.chainId) as any;
  }
  
  if (!chain) {
    return { ok: false, error: 'chain-not-found' };
  }
  
  const chainSpec = {
    id: chain.id,
    name: chain.name,
    steps: JSON.parse(chain.steps_json),
  };
  
  const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const textHash = Bun.hash(cmd.text).toString();
  
  // Create run record
  db.run(
    `INSERT INTO runs (id, chain_id, text_hash, started_at, status) VALUES (?, ?, ?, ?, ?)`,
    runId,
    chain.id,
    textHash,
    Date.now(),
    'running'
  );
  
  // Check cache
  const fp = fingerprint(cmd.text, chainSpec.steps.map((s: any) => s.id).join(','));
  const cached = insightCache.get(fp);
  
  if (cached) {
    publish(ctx.sessionId, {
      type: 'cache-hit',
      runId,
      fp,
    });
    
    // Replay cached events
    const events = db.query(`SELECT * FROM run_events WHERE run_id = ? ORDER BY ts`).all(runId) as any[];
    for (const event of events) {
      publish(ctx.sessionId, JSON.parse(event.payload));
    }
    
    db.run(`UPDATE runs SET status = ? WHERE id = ?`, 'done', runId);
    return { ok: true, data: { runId } };
  }
  
  // Execute pipeline
  (async () => {
    try {
      for await (const chunk of runChain(chainSpec, cmd.text)) {
        if (chunk.token) {
          const payload = {
            type: 'stream',
            runId,
            stepId: chunk.stepId,
            chunk: chunk.token,
          };
          publish(ctx.sessionId, payload);
          
          // Persist event
          db.run(
            `INSERT INTO run_events (run_id, ts, kind, payload) VALUES (?, ?, ?, ?)`,
            runId,
            Date.now(),
            'stream',
            JSON.stringify(payload)
          );
        } else if (chunk.done !== undefined) {
          const payload = {
            type: 'stepComplete',
            runId,
            stepId: chunk.stepId,
            insights: chunk.done,
          };
          publish(ctx.sessionId, payload);
          
          // Persist event
          db.run(
            `INSERT INTO run_events (run_id, ts, kind, payload) VALUES (?, ?, ?, ?)`,
            runId,
            Date.now(),
            'stepComplete',
            JSON.stringify(payload)
          );
        }
      }
      
      // Mark run as complete
      const payload = {
        type: 'complete',
        runId,
      };
      publish(ctx.sessionId, payload);
      
      db.run(
        `INSERT INTO run_events (run_id, ts, kind, payload) VALUES (?, ?, ?, ?)`,
        runId,
        Date.now(),
        'complete',
        JSON.stringify(payload)
      );
      
      db.run(`UPDATE runs SET status = ? WHERE id = ?`, 'done', runId);
      
      // Cache results
      const allEvents = db.query(`SELECT * FROM run_events WHERE run_id = ? ORDER BY ts`).all(runId) as any[];
      insightCache.set(fp, { events: allEvents });
    } catch (error) {
      console.error('Pipeline execution error:', error);
      db.run(`UPDATE runs SET status = ? WHERE id = ?`, 'failed', runId);
      publish(ctx.sessionId, {
        type: 'error',
        runId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })();
  
  return { ok: true, data: { runId } };
}

