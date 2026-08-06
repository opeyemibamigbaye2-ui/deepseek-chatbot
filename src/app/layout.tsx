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
