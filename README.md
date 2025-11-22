# SKEW (Riff.new)

A minimalist writing tool that challenges your ideas in real-time. Type your thoughts on the left, and AI generates counter-arguments, provocative questions, and lateral thinking prompts on the right from multiple perspectives simultaneously.

## Features

- **Split-screen interface**: Write on the left, see insights on the right
- **Multi-persona analysis**: Get insights from Steelman, Red Team, Socratic, and Lateral perspectives simultaneously
- **Real-time AI analysis**: Debounced text analysis (2-3 seconds after typing stops)
- **Streaming responses**: Watch insights appear word-by-word
- **Intelligent caching**: Instant results for previously analyzed text
- **Glassmorphism UI**: Beautiful, modern design with backdrop blur effects
- **Fullstack architecture**: SQLite database, typed RPC system, realtime pub/sub
- **Built with Bun**: Fast runtime, zero build complexity

## Prerequisites

- [Bun](https://bun.sh) installed
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

## Setup

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   PORT=3000
   ```

3. **Run the development server:**
   ```bash
   bun run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## Usage

1. Start typing your idea or argument in the left panel (minimum 10 characters)
2. Select which personas you want to analyze your text (Steelman, Red Team, Socratic, Lateral)
3. After 2-3 seconds of inactivity, AI will analyze your text automatically (or click Analyze)
4. Watch as insights stream in from each selected persona in separate sections
5. Each insight is color-coded:
   - **Rose**: Counter-arguments
   - **Cyan**: Questions
   - **Violet**: Lateral prompts

### Personas

- **Steelman**: Strengthens your argument before offering constructive counterpoints
- **Red Team**: Attacks assumptions and finds failure modes
- **Socratic**: Asks probing questions that ladder reasoning
- **Lateral**: Suggests unexpected analogies and alternative frames

## Tech Stack

- **Runtime**: Bun
- **Frontend**: React + TypeScript
- **Backend**: Bun.serve() with WebSocket support
- **Database**: SQLite (Bun native)
- **AI**: Google Gemini (`@google/genai`)
- **Styling**: Tailwind CSS
- **Validation**: Zod for type-safe RPC

## Project Structure

```
src/
├── index.ts          # Bun server (HTTP + WebSocket)
├── frontend.tsx      # React app entry
├── App.tsx           # Main app component
├── schema.ts         # Zod schemas for RPC commands
├── components/
│   ├── Editor.tsx   # Text input component
│   ├── Insights.tsx # AI insights display
│   ├── Card.tsx     # Glassmorphism card component
│   └── PersonaBar.tsx # Persona selection UI
├── server/
│   ├── db.ts        # SQLite database initialization
│   ├── rpc.ts       # RPC command handler
│   ├── pipeline.ts  # Chain execution engine
│   └── realtime.ts  # Pub/sub for WebSocket messaging
└── lib/
    ├── ai.ts        # Gemini API client
    ├── cache.ts     # SQLite-backed cache with TTL
    ├── prompts.ts   # Prompt engineering
    ├── personas.ts  # Persona definitions
    ├── fingerprint.ts # Cache fingerprinting
    └── novelty.ts   # Text similarity detection
```

## Architecture

- **Database**: SQLite stores chains, runs, insights, and cache
- **RPC System**: Type-safe command handling with Zod validation
- **Realtime**: Pub/sub channels for efficient WebSocket messaging
- **Caching**: Hybrid in-memory + SQLite cache with 5-minute TTL
- **Pipeline Engine**: Ready for multi-step chain execution (future feature)

## Troubleshooting

**AI not generating insights?**
- Check that `GEMINI_API_KEY` is set in your `.env` file
- Ensure you have at least 10 characters of text typed
- Make sure at least one persona is selected
- Check browser console for WebSocket connection errors

**WebSocket connection issues?**
- Make sure the server is running on the correct port
- Check firewall settings if accessing remotely
- Refresh the browser if connection fails

**Database issues?**
- The SQLite database (`riff.sqlite`) is created automatically on first run
- If you encounter database errors, delete `riff.sqlite` and restart the server

## License

MIT
