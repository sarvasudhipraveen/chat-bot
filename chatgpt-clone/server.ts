/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: any = null;

function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured. Please open Settings > Secrets to add your Gemini API Key.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

function formatGeminiError(err: any): string {
  const errMsg = err.message || (typeof err === "string" ? err : JSON.stringify(err));
  
  if (
    errMsg.includes("RESOURCE_EXHAUSTED") || 
    errMsg.includes("429") || 
    errMsg.includes("quota") || 
    errMsg.includes("Too Many Requests")
  ) {
    return "Gemini API Quota Exceeded (429: Too Many Requests). The active API key has exceeded its query limits or free tier allowance. Please verify your billing details or plan limits in the Google AI Studio console, or switch to another key.";
  }

  if (
    errMsg.includes("API_KEY_INVALID") || 
    errMsg.includes("invalid") || 
    errMsg.includes("forbidden") || 
    errMsg.includes("not authorized")
  ) {
    return "Invalid Gemini API Key. Please check your credential details. You can configure a valid 'GEMINI_API_KEY' in the Secrets tab of the Settings menu.";
  }

  return errMsg;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoint for streaming chat completions
  app.post("/api/chat", async (req, res) => {
    try {
      const { model, messages, systemInstruction, searchEnabled } = req.body;

      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: "The 'messages' field is required and must be an array." });
        return;
      }

      // Check key exists before lazy initialization
      const ai = getGeminiClient();

      // Convert messages to Gemini format: map 'assistant' output role to 'model'
      const contents = messages.map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const config: any = {
        systemInstruction: systemInstruction || undefined,
        temperature: 0.7,
      };

      if (searchEnabled) {
        config.tools = [{ googleSearch: {} }];
      }

      // Set Server-Sent Events (SSE) headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      // Stream the responses from Gemini model
      const responseStream = await ai.models.generateContentStream({
        model: model || "gemini-3.5-flash",
        contents,
        config,
      });

      for await (const chunk of responseStream) {
        const text = chunk.text || "";
        const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const payload = { text, groundingChunks };
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err: any) {
      console.error("Gemini stream error:", err);
      const friendlyMessage = formatGeminiError(err);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: friendlyMessage })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: friendlyMessage });
      }
    }
  });

  // Serve static files / mount Vite
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
