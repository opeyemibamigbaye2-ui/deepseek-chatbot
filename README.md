# DeepSeek Chatbot 🤖

A production-quality AI chatbot web application powered by **DeepSeek V4 Pro**, built with Next.js 16, TypeScript, and Tailwind CSS.

![DeepSeek Chatbot Screenshot](screenshot.png)

## Features

- 💬 **Real-time streaming** — Responses stream token-by-token via SSE, no full-response waiting
- 📝 **Markdown rendering** — Full markdown support with syntax-highlighted code blocks, lists, tables, and more
- 🧵 **Multiple conversations** — Sidebar with thread management: create, rename, delete chats
- 💾 **Persistent history** — All chats saved to IndexedDB in your browser (no backend database needed)
- 🌙 **Dark mode** — Light/dark/system theme toggle with smooth transitions
- 📋 **Copy to clipboard** — One-click copy for any assistant message
- 🔄 **Regenerate** — Regenerate the last assistant response
- ⚙️ **Custom system prompt** — Configure the AI's personality via Settings panel
- 📱 **Responsive design** — Optimized for desktop and mobile
- ⚡ **Error handling** — Friendly error messages for failed API calls, missing keys, and rate limits

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org/) (strict mode) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| AI SDK | [Vercel AI SDK](https://sdk.vercel.ai/) |
| LLM | DeepSeek V4 Pro (via OpenAI-compatible API) |
| Markdown | [react-markdown](https://github.com/remarkjs/react-markdown) + [react-syntax-highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter) |
| Database | [Dexie.js](https://dexie.org/) (IndexedDB wrapper) |
| Icons | [react-icons](https://react-icons.github.io/react-icons/) |
| Notifications | [react-hot-toast](https://react-hot-toast.com/) |

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- A [DeepSeek API key](https://platform.deepseek.com/api_keys)

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/deepseek-chatbot.git
cd deepseek-chatbot

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local and add your DEEPSEEK_API_KEY

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEEPSEEK_API_KEY` | Yes | — | Your API key |
| `DEEPSEEK_BASE_URL` | No | `https://api.deepseek.com/v1` | API base URL (supports OpenRouter, Together AI, etc.) |
| `DEEPSEEK_MODEL` | No | `deepseek-chat` | Model name |

## Project Structure

```
deepseek-chatbot/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── route.ts          # API route: DeepSeek streaming proxy
│   │   ├── globals.css               # Global styles + theme variables
│   │   ├── layout.tsx                # Root layout with theme FOUC prevention
│   │   └── page.tsx                  # Main page: sidebar + chat + settings
│   ├── components/
│   │   ├── ChatInput.tsx             # Message input with auto-resize
│   │   ├── ChatWindow.tsx            # Message list + input + error display
│   │   ├── MarkdownRenderer.tsx      # Markdown with syntax highlighting
│   │   ├── MessageBubble.tsx         # Single message with copy/regenerate
│   │   ├── SettingsPanel.tsx         # System prompt + theme config
│   │   └── Sidebar.tsx               # Thread list + new chat + rename/delete
│   ├── hooks/
│   │   ├── useDeepSeekChat.ts        # Chat logic (streaming, regenerate)
│   │   ├── useSettings.ts            # Settings state + IndexedDB persistence
│   │   └── useThreads.ts             # Thread CRUD + IndexedDB persistence
│   └── lib/
│       ├── db.ts                     # Dexie.js IndexedDB layer
│       └── types.ts                  # TypeScript type definitions
├── .env.example                      # Environment variable template
├── .prettierrc                       # Prettier configuration
├── DEPLOY.md                         # Vercel deployment guide
├── package.json
└── tsconfig.json
```

## Live Demo

🔗 [https://deepseek-chatbot-demo.vercel.app](https://deepseek-chatbot-demo.vercel.app)

## License

MIT
