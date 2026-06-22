import { spawn } from "child_process";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Transparent resilient reverse-proxy for API routing to direct control to Python Backend
  app.use("/api", async (req, res, next) => {
    const pythonServerUrl = "http://127.0.0.1:8000";
    const { method, headers, url, body } = req;
    
    try {
      const fetchOptions: any = {
        method,
        headers: {
          "content-type": "application/json",
          ...Object.fromEntries(
            Object.entries(headers).filter(([k]) => !["host", "content-length", "connection"].includes(k.toLowerCase()))
          )
        }
      };

      if (method !== "GET" && method !== "HEAD") {
        fetchOptions.body = JSON.stringify(body);
      }

      const pyUrl = `${pythonServerUrl}/api${url}`;
      const pyResponse = await fetch(pyUrl, fetchOptions);
      
      res.status(pyResponse.status);
      pyResponse.headers.forEach((val, key) => {
        if (!["content-encoding", "transfer-encoding", "content-length"].includes(key.toLowerCase())) {
          res.setHeader(key, val);
        }
      });

      const bodyText = await pyResponse.text();
      return res.send(bodyText);
    } catch (error: any) {
      console.warn(`[Node Gateway Proxy] Python backend not ready or offline (${error.message}). Invoking fallback native JavaScript handlers.`);
      res.status(503).json({
        error: "Service Unavailable",
        message: "The backend service is currently offline. Please try again later."
      });
    }
  });

  // Vite middleware for assets and SPA handling
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
