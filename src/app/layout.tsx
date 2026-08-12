import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DeepSeek Chatbot",
  description:
    "A modern AI chatbot powered by DeepSeek V4 Pro with streaming responses, markdown rendering, and conversation history.",
  keywords: ["AI chatbot", "DeepSeek", "ChatGPT", "LLM", "Next.js"],
  authors: [{ name: "DeepSeek Chatbot" }],
  openGraph: {
    title: "DeepSeek Chatbot",
    description: "AI-powered chat with DeepSeek V4 Pro",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Fonts: Space Grotesk (headings), Inter (body), JetBrains Mono (code) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Prevent FOUC on theme load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
