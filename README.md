# COZY — order-app

주문·관리자 UI(Vite + React)와 Express + PostgreSQL API로 구성된 모노레포입니다.

## 구조

| 경로 | 설명 |
|------|------|
| `server/` | Express API (`/api/menus`, `/api/orders`, …) |
| `ui/` | React 프런트엔드 |
| `docs/PRD.md` | 요구사항 |

## 로컬 실행

**1. DB** — PostgreSQL에 스키마·시드 적용:

```powershell
cd server
copy .env.example .env
# .env 에 DATABASE_URL 또는 DB_* 설정
npm install
npm run db:init
```

**2. 백엔드** (기본 포트 3000 권장):

```powershell
cd server
npm run dev
```

**3. 프런트**

```powershell
cd ui
npm install
# ui/.env.development → VITE_API_URL=http://localhost:3000
npm run dev
```

브라우저: `http://localhost:5173` (Vite 안내 포트 확인)

## Render 배포

백엔드와 프런트는 **서로 다른 서비스**로 올리는 것을 권장합니다.

### 1) 백엔드 (Web Service)

- **Root Directory:** `server`
- **Build:** `npm install`
- **Start:** `npm start`
- **환경 변수**
  - `DATABASE_URL` — Render PostgreSQL **Internal Database URL** 권장
  - `PORT` — Render가 자동 설정 (수동 입력 불필요)
- 배포 후 로컬에서 한 번: `DATABASE_URL`을 `.env`에 넣고 `npm run db:migrate` (스키마·빈 DB 시 시드)

### 2) 프런트 (Static Site)

- **Root Directory:** `ui`
- **Build:** `npm install && npm run build`
- **Publish directory:** `dist`
- **환경 변수 (빌드 시 필요):** `VITE_API_URL` = 백엔드 공개 URL  
  예: `https://your-backend.onrender.com` (**끝에 `/` 없음**)  
  저장소에 `ui/.env.production` 이 있으면 Render 대시보드 없이도 빌드에 포함됩니다.

프런트 URL로 접속하면 로컬 `5173`과 같은 화면이 보이고, API는 위 백엔드로 호출됩니다.

### Blueprint (선택)

저장소 루트의 [`render.yaml`](./render.yaml)로 백엔드 Web + Static Site를 한 번에 정의할 수 있습니다.  
Static Site의 `VITE_API_URL`은 대시보드에서 백엔드 URL로 채우거나, 배포 후 수정해 재빌드하세요.

## GitHub

```powershell
git add -A
git commit -m "메시지"
git push
```
