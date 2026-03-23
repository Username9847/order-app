# order-app server

## Run (Windows PowerShell)

```powershell
cd C:\Work\Cursor\order-app\server
copy .env.example .env
npm.cmd install
npm.cmd run dev
```

## Render / 원격 DB에 스키마 적용

`server/.env`에 Render PostgreSQL의 **External Database URL**을 `DATABASE_URL`로 넣은 뒤:

```powershell
cd C:\Work\Cursor\order-app\server
npm.cmd run db:migrate
```

- 테이블이 없으면 `sql/schema.sql`로 생성합니다.
- `menus`가 비어 있으면 `sql/seed.sql`까지 한 번 넣습니다 (이미 데이터가 있으면 시드는 건너뜀).

## Endpoints (skeleton)

- `GET /health`
- `GET /api/menus`
- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/:orderId`
- `PATCH /api/orders/:orderId/status`

