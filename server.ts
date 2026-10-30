import { app } from "./api/index.js";
import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";

// Vite middleware for assets and SPA handling in standalone mode
export async function setupApp(isDev = process.env.NODE_ENV !== "production") {
  if (isDev && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  return app;
}

if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const PORT = parseInt(process.env.PORT || "3000", 10);
  setupApp().then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
}

export { app };
