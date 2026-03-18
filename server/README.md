# order-app server

## Run (Windows PowerShell)

```powershell
cd C:\Work\Cursor\order-app\server
copy .env.example .env
npm.cmd install
npm.cmd run dev
```

## Endpoints (skeleton)

- `GET /health`
- `GET /api/menus`
- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/:orderId`
- `PATCH /api/orders/:orderId/status`

