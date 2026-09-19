# 내 지표 대시보드

매일 체크하고 싶은 지표(암호화폐, 환율, 주가지수, 원자재 등)를 자동으로 수집하고, 전일 대비
크게 움직인 것만 하이라이트해서 보여주는 개인용 대시보드입니다.

`pipeline/`의 파이썬 스크립트가 무료 공개 API에서 값을 가져오고, GitHub Actions가 매일 그
스크립트를 돌려서 `src/data/liveData.json`을 갱신·커밋하고 GitHub Pages에 다시 배포합니다.
파이프라인이 아직 한 번도 돌지 않았거나 실패했을 때는 `src/data/mockData.ts`의 샘플 데이터로
자동 대체되어 화면이 비어 보이지 않습니다.

## 구성

- 🔔 **지금 해야 할 것** — 수집에 실패한 지표 알림 (원인과 재시도 명령 포함)
- 📅 **최근 업데이트** — 값이 실제로 바뀐 지표만 모은 갱신 로그
- ⭐ **오늘의 주목할만한 지표** — 카테고리별로 전일 대비 임계치를 넘은 지표 (🔴 긴급 · 🟠 주의)
- 🗓 **카테고리별 갱신 현황** — 전체 카테고리의 정상/지연 상태 그리드

라이트/다크 테마를 지원하며 선택한 테마는 브라우저에 저장됩니다. 헤더의 배지로 지금 보고 있는
데이터가 실시간(파이프라인 결과)인지 샘플인지 표시됩니다.

## 데이터 파이프라인

```
pipeline/
  config/indicators.json      # 추적할 지표 목록 (여기에 추가/삭제)
  sources/                    # 소스별 fetch 함수 (coingecko / fx / yahoo)
  fetch_all.py                # 1) 전체 지표를 fetch해서 data/history/*.csv에 누적
  build_dashboard_data.py     # 2) history를 읽어 src/data/liveData.json 생성
  data/history/*.csv          # 지표별 원장 (값이 실제로 바뀐 날만 한 줄 추가)
```

로컬에서 직접 실행하려면:

```bash
python3 pipeline/fetch_all.py
python3 pipeline/build_dashboard_data.py
```

### 지표 추가하기

`pipeline/config/indicators.json`에 항목을 하나 추가하면 됩니다.

```json
{
  "id": "고유id",
  "category": "화면에 보일 카테고리명",
  "title": "지표 이름",
  "source": "coingecko | fx | yahoo",
  "params": { "...소스별 파라미터..." },
  "unit": "USD | KRW | pt | ...",
  "threshold_pct": 3
}
```

- `coingecko`: `{"coin_id": "bitcoin"}` — [CoinGecko 코인 ID 목록](https://api.coingecko.com/api/v3/coins/list)
- `fx`: `{"base": "USD", "target": "KRW"}` — [open.er-api.com](https://www.exchangerate-api.com/docs/free)
- `yahoo`: `{"symbol": "^KS11"}` — Yahoo Finance 차트 API 심볼 (지수는 `^` 접두사, 선물은 `=F` 접미사, 예:
  `^GSPC` S&P 500, `^IXIC` 나스닥, `CL=F` WTI, `GC=F` 금). 원래는 Stooq의 CSV 다운로드를 썼는데, Stooq가
  스크립트 요청을 차단(HTML 안내 페이지 반환)해서 Yahoo Finance 차트 엔드포인트로 교체했습니다.

`threshold_pct`는 하루 변동률이 이 값 이상이면 🟠 주의, 2배 이상이면 🔴 긴급으로 "오늘의 주목할만한
지표"에 뜨는 기준입니다.

### 자동 실행 (GitHub Actions) — 최초 1회 설정

`.github/workflows/update-dashboard.yml`이 매일 지표를 갱신하고 GitHub Pages에 배포합니다.
저장소에서 딱 한 번만 설정하면 됩니다:

1. **Settings → Pages → Build and deployment → Source**를 `GitHub Actions`로 설정
2. **Settings → Actions → General → Workflow permissions**을 `Read and write permissions`로 설정
   (파이프라인이 갱신된 데이터를 커밋·푸시하려면 필요합니다)
3. ⚠️ GitHub의 `schedule` 트리거는 **저장소의 기본 브랜치(main)에 있는 워크플로 파일만** 실행합니다.
   지금 이 브랜치가 병합되기 전까지는 매일 자동 실행되지 않으니, 병합하거나 Actions 탭에서
   **Run workflow**로 수동 실행해서 테스트하세요.

## 개발

```bash
npm install
npm run dev      # 개발 서버 (http://localhost:5173)
npm run build    # 타입체크 + 프로덕션 빌드
npm run lint     # oxlint
```

## 스택

- React 19 + TypeScript, Vite, Tailwind CSS v4 (프런트엔드)
- Python 3 표준 라이브러리만 사용 (파이프라인, 외부 의존성 없음)
- GitHub Actions (스케줄 실행 + Pages 배포)
