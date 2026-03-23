import "dotenv/config";
import express from "express";
import cors from "cors";
import { menusRouter } from "./routes/menus.js";
import { ordersRouter } from "./routes/orders.js";
import { pool } from "./db.js";

const app = express();

app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV !== "production") {
  app.use((req, _res, next) => {
    // eslint-disable-next-line no-console
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

app.get("/", (_req, res) => {
  res.status(200).type("text/html; charset=utf-8").send(`<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>COZY Backend</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; margin: 0; padding: 32px; background: #f8fafc; color: #0f172a; }
      .card { max-width: 760px; margin: 0 auto; background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 22px; box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08); }
      h1 { margin: 0 0 8px; font-size: 18px; }
      p { margin: 0 0 14px; color: #475569; }
      code { background: #f1f5f9; padding: 2px 6px; border-radius: 6px; }
      ul { margin: 0; padding-left: 18px; color: #0f172a; }
      li { margin: 6px 0; }
      a { color: #2563eb; text-decoration: none; }
      a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>COZY 백엔드 서버가 실행 중입니다</h1>
      <p>아래 엔드포인트로 접속해 동작을 확인할 수 있습니다.</p>
      <ul>
        <li><a href="/health"><code>GET /health</code></a></li>
        <li><a href="/health/db"><code>GET /health/db</code></a></li>
        <li><code>/api/menus</code>, <code>/api/orders</code></li>
      </ul>
    </div>
  </body>
</html>`);
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/health/db", async (_req, res) => {
  try {
    await pool.query("select 1 as ok");
    return res.json({ ok: true, db: true });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      db: false,
      message: err instanceof Error ? err.message : "DB error",
    });
  }
});

app.use("/api/menus", menusRouter);
app.use("/api/orders", ordersRouter);

app.use((_req, res) => {
  res
    .status(404)
    .type("text/html; charset=utf-8")
    .send(
      `<!doctype html><meta charset="utf-8" /><title>404</title><h2>404 Not Found</h2><p>사용 가능한 경로: <code>/</code>, <code>/health</code>, <code>/health/db</code>, <code>/api/*</code></p>`,
    );
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${port}`);
});
