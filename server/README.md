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

### Render Web Service 체크리스트

- **Root Directory:** `server`
- **Start Command:** `npm start` (`node src/index.js` 직접 지정 금지)
- **Health check:** `GET /health` (경로 `/health`)
- 프로덕션에서는 요청 로그 미들웨어가 비활성화됩니다 (`NODE_ENV=production`).

프런트(주문 화면)는 저장소 루트 `README.md`의 **Static Site** 절을 따르세요.

## Endpoints (skeleton)

- `GET /health`
- `GET /api/menus`
- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/:orderId`
- `PATCH /api/orders/:orderId/status`

