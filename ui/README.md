# 프런트엔드 (Vite + React)

## 실행 전제

백엔드(`server/`)가 **먼저** 떠 있어야 합니다. 기본 포트는 `3000`입니다.

```powershell
cd ..\server
npm.cmd run dev
```

## 실행

```powershell
cd ui
npm.cmd install
npm.cmd run dev
```

브라우저는 Vite가 안내하는 주소(보통 `http://localhost:5173`)로 접속합니다.

## 연결 오류가 날 때

- `ui/.env.development`의 `VITE_API_URL`이 백엔드 주소와 같은지 확인하세요. (기본: `http://localhost:3000`)
- 백엔드 터미널에 `Server listening on http://localhost:3000` 로그가 있는지 확인하세요.

## Render에 프런트만 올릴 때 (Static Site)

프로덕션 빌드에는 **`VITE_API_URL`** 이 꼭 들어가야 합니다. 이 값이 비어 있으면 요청이 `프런트주소/api/...`로 가서 **404 / Not Found** 가 납니다.

1. **권장:** 저장소의 `ui/.env.production` 에 백엔드 `https://...` 를 넣어 두고 푸시한 뒤 재배포합니다.
2. **또는** Render 대시보드 → Static Site → **Environment** 에 `VITE_API_URL` = `https://백엔드.onrender.com` (끝 `/` 없음) 을 넣고 **다시 빌드**합니다.

- **Build:** `npm install && npm run build`
- **Publish directory:** `dist`
