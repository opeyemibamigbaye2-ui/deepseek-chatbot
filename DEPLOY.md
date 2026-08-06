# Deploy to Vercel

This guide covers deploying the DeepSeek Chatbot to [Vercel](https://vercel.com).

## Prerequisites

- A [Vercel](https://vercel.com) account (free tier works)
- A [DeepSeek API key](https://platform.deepseek.com/api_keys) (or an OpenAI-compatible provider like OpenRouter, Together AI, or DeepInfra)
- Git installed on your machine

## Step 1: Push to GitHub

```bash
cd deepseek-chatbot
git init
git add .
git commit -m "Initial commit: DeepSeek Chatbot"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/deepseek-chatbot.git
git push -u origin main
```

## Step 2: Import Project to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Vercel will auto-detect it's a Next.js project — no configuration needed

## Step 3: Add Environment Variables

In your Vercel project dashboard, go to **Settings → Environment Variables** and add:

| Name | Value | Notes |
|------|-------|-------|
| `DEEPSEEK_API_KEY` | `sk-your-actual-key` | **Required** — Your DeepSeek API key |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com/v1` | Optional — defaults to DeepSeek official API |
| `DEEPSEEK_MODEL` | `deepseek-chat` | Optional — model name |

### Provider-specific URLs

If using a third-party provider:

| Provider | `DEEPSEEK_BASE_URL` | `DEEPSEEK_MODEL` |
|----------|---------------------|-------------------|
| DeepSeek Official | `https://api.deepseek.com/v1` | `deepseek-chat` |
| OpenRouter | `https://openrouter.ai/api/v1` | `deepseek/deepseek-chat` |
| Together AI | `https://api.together.xyz/v1` | `deepseek-ai/DeepSeek-V3` |
| DeepInfra | `https://api.deepinfra.com/v1/openai` | `deepseek-ai/DeepSeek-V3` |

## Step 4: Deploy

Click **Deploy**. Vercel will build and deploy your app in ~1-2 minutes.

After deployment, your app will be live at `https://your-project.vercel.app`.

## Step 5: Redeploy on Changes

Every push to the `main` branch triggers an automatic redeployment. No manual steps needed.

## Local Development

```bash
cp .env.example .env.local
# Edit .env.local with your actual API key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).