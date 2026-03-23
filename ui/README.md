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
