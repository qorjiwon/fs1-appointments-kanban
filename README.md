# 치과 예약 관리 시스템

치과 예약 시스템의 **관리자 대시보드**입니다. 칸반 보드에서 예약을 실시간으로 모니터링하고 관리할 수 있습니다.

> 📌 상세 문서는 아래 링크를 참고하세요.
>
> | 문서 | 설명 |
> |------|------|
> | [아키텍처 결정 근거](docs/ARCHITECTURE.md) | 클라우드·DB·서버리스 선택 이유, 모듈/코드 구성 |
> | [배포 과정 및 트러블슈팅](docs/DEPLOYMENT.md) | 클라우드 배포 과정, 만난 문제와 해결 |
> | [AI 활용 및 도구](docs/AI_AND_TOOLS.md) | AI 활용 방법, 무료 크레딧/Plan 활용, 본인 수정 부분 |
> | [제약 조건 및 포기 항목](docs/CONSTRAINTS.md) | 오류·제약 조건, 시간 부족으로 포기한 부분 |
> | [프론트엔드 README](frontend/README.md) | 프론트엔드 상세 + **배포 URL** |

---

## 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────────┐
│                          클라이언트 (브라우저)                         │
│              React 18 + TypeScript + Vite (Vercel 배포)              │
└──────────┬──────────────────────────────────────┬───────────────────┘
           │ HTTPS (REST API)                     │ WSS (WebSocket)
           ▼                                      ▼
┌─────────────────────────┐          ┌──────────────────────────────┐
│   API Gateway (HTTP)    │          │   API Gateway (WebSocket)    │
│   - POST /appointments  │          │   - $connect                 │
│   - GET  /appointments  │          │   - $disconnect              │
│   - GET  /appointments/ │          │                              │
│         {id}            │          │   wss://xxx.execute-api      │
│   - PATCH /appointments/│          │   .ap-northeast-2            │
│         {id}/transition │          │   .amazonaws.com/prod        │
└──────────┬──────────────┘          └─────────┬────────────────────┘
           │                                   │
           ▼                                   ▼
┌─────────────────────────┐          ┌─────────────────────────┐
│  AppointmentsFunction   │          │  WS Connect/Disconnect  │
│  (Lambda - Node 20)     │──────┐   │  (Lambda - Node 20)     │
│  - CRUD + 상태 전이       │      │   │  - 연결 ID 관리           │
│  - 브로드캐스트 트리거      │      │   └──────────┬──────────────┘
└──────────┬──────────────┘      │              │
           │                     │              │
           ▼                     │              ▼
┌─────────────────────────┐      │   ┌─────────────────────────┐
│  AppointmentsTable      │      │   │  ConnectionsTable       │
│  (DynamoDB)             │      │   │  (DynamoDB)             │
│  PK: id                 │      │   │  PK: connectionId       │
│  GSI: status-datetime   │      │   └─────────────────────────┘
└─────────────────────────┘      │
                                 │   ┌─────────────────────────┐
                                 └──▶│  PostToConnection API   │
                                     │  (WebSocket 브로드캐스트)  │
                                     └─────────────────────────┘
```

---

## 기술 스택

| 영역 | 기술 | 비고 |
|------|------|------|
| **프론트엔드** | React, TypeScript, Vite | 18.3, 5.6, 6.0 |
| **백엔드** | AWS Lambda (Node.js), TypeScript | Node 20.x |
| **API 게이트웨이** | AWS API Gateway (HTTP API + WebSocket API) | v2 |
| **데이터베이스** | Amazon DynamoDB | On-demand |
| **IaC** | AWS SAM (CloudFormation) | 2016-10-31 |
| **프론트 배포** | Vercel | - |
| **실시간 통신** | API Gateway WebSocket + DynamoDB 연결 관리 | - |

---

## 프로젝트 구조

```
fs1/
├── README.md                          # 프로젝트 개요 (이 파일)
├── docs/
│   ├── ARCHITECTURE.md                # 아키텍처 결정 근거
│   ├── DEPLOYMENT.md                  # 배포 과정 및 트러블슈팅
│   ├── AI_AND_TOOLS.md                # AI 활용, 도구, 크레딧 내역
│   └── CONSTRAINTS.md                 # 제약 조건 및 포기 항목
│
├── backend/                           # 서버리스 백엔드
│   ├── template.yaml                  # SAM 인프라 정의
│   ├── samconfig.toml                 # SAM 배포 설정
│   ├── Makefile                       # Lambda 빌드 아티팩트
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                   # Express 진입점 (로컬 개발용)
│       ├── models/
│       │   └── appointment.ts         # Appointment, TransitionRecord 타입
│       ├── routes/
│       │   └── appointments.ts        # Express REST 라우트
│       ├── services/
│       │   ├── appointmentService.ts   # 인메모리 저장소 (로컬용)
│       │   └── stateMachine.ts        # 상태 전이 규칙
│       ├── dynamo/
│       │   └── appointmentRepository.ts # DynamoDB CRUD + 낙관적 잠금
│       ├── websocket/
│       │   └── connectionsRepository.ts # WebSocket 연결 ID 관리
│       └── lambda/
│           ├── appointmentsHandler.ts  # HTTP API Lambda 핸들러
│           ├── broadcast.ts           # WebSocket 브로드캐스트
│           └── websocketHandlers.ts   # $connect / $disconnect
│
└── frontend/                          # React SPA
    ├── README.md                      # 프론트엔드 상세 + 배포 URL
    ├── package.json
    ├── vite.config.ts
    ├── vercel.json                    # Vercel SPA 설정
    └── src/
        ├── main.tsx
        ├── App.tsx                    # 메인 앱 (칸반 보드 + 상세 패널)
        ├── styles.css
        ├── types/index.ts
        ├── services/api.ts            # REST API 클라이언트
        ├── hooks/
        │   ├── useAppointments.ts     # 예약 데이터 페칭·캐시
        │   ├── useWebSocket.ts        # WebSocket 연결·재연결
        │   ├── useFilters.ts          # 필터 + URL 동기화
        │   ├── useToast.ts            # 토스트 알림
        │   └── useOnlineStatus.ts     # 네트워크 상태 감지
        └── components/
            ├── KanbanBoard.tsx
            ├── KanbanColumn.tsx
            ├── AppointmentCard.tsx
            ├── DetailPanel.tsx
            ├── FilterBar.tsx
            ├── CreateAppointmentModal.tsx
            ├── ToastContainer.tsx
            ├── ConnectionBanner.tsx
            └── EmptyState.tsx
```

---

## 상태 머신 (State Machine)

예약은 아래 규칙에 따라 단방향으로 전이됩니다. 유효하지 않은 전이 요청은 400 에러를 반환합니다.

```
requested ──→ confirmed ──→ checked_in ──→ in_treatment ──→ completed
    │              │
    ▼              ▼
 cancelled     cancelled
```

| 현재 상태 | 가능한 전이 |
|-----------|-------------|
| `requested` | `confirmed`, `cancelled` |
| `confirmed` | `checked_in`, `cancelled` |
| `checked_in` | `in_treatment` |
| `in_treatment` | `completed` |
| `completed` | (종료 상태) |
| `cancelled` | (종료 상태) |

---

## API 명세

### `POST /appointments` — 예약 생성

```json
{
  "patient_name": "김철수",
  "datetime": "2026-03-31T10:00:00Z",
  "treatment_type": "스케일링"
}
```

### `GET /appointments` — 예약 목록 조회

| 파라미터 | 설명 |
|---------|------|
| `status` | 상태 필터 (복수 선택 가능, 반복 파라미터) |
| `from` / `to` | 날짜 범위 (ISO 8601) |
| `q` | 환자명 검색 |
| `page` / `limit` | 페이지네이션 (기본 limit: 200) |

### `GET /appointments/:id` — 예약 상세 조회

### `PATCH /appointments/:id/transition` — 상태 전이

```json
{ "target_status": "confirmed", "changed_by": "admin" }
```

허용되지 않은 전이 → 400, 낙관적 잠금 충돌 → 409, 미존재 → 404

---

## 데이터 모델

```typescript
interface Appointment {
  id: string;                          // UUID v4
  patient_name: string;                // 환자 이름
  datetime: string;                    // 예약 일시 (ISO 8601)
  treatment_type: string;              // 진료 유형
  status: AppointmentStatus;           // 6개 상태 중 하나
  transition_history: TransitionRecord[]; // 상태 전이 이력
  version: number;                     // 낙관적 잠금용 버전
  created_at: string;
  updated_at: string;
}

interface TransitionRecord {
  timestamp: string;
  from_status: AppointmentStatus;
  to_status: AppointmentStatus;
  changed_by: string;
}
```

---

## 로컬 실행

### 사전 요구사항

- Node.js 18+
- npm

### 백엔드

```bash
cd backend
npm install
npm run dev
```

### 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

---

## 주요 기능

1. **칸반 보드** — 6개 상태 열(requested~cancelled)에 예약 카드 표시
2. **상세 패널** — 카드 클릭 시 예약 정보 + 전이 이력 타임라인
3. **규칙 기반 상태 전이** — 허용된 전이만 버튼 활성화, 불가능한 전이에 안내
4. **낙관적 잠금** — DynamoDB `ConditionExpression`으로 동시 수정 충돌 감지 (409)
5. **실시간 갱신** — WebSocket으로 다른 클라이언트의 변경사항 즉시 반영
6. **자동 재연결** — 연결 끊김 시 최대 3회 지수 백오프 (1s → 2s → 4s)
7. **필터 + URL 동기화** — 상태/날짜/환자명 필터가 URL 쿼리파라미터에 반영
8. **예약 생성** — 모달을 통한 새 예약 등록
9. **에러 처리** — 토스트 알림 (3초 자동소멸), 오프라인 배너
10. **빈 상태 UI** — 예약이 없을 때 안내 일러스트
