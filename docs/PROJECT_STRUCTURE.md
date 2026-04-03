# 프로젝트 구조

폴더·모듈 구성 요약입니다.

```
fs1_copy/
├── README.md                          # 프로젝트 개요
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
│       │   ├── connectionsRepository.ts # WebSocket 연결 ID 관리 (Lambda)
│       │   └── localWsServer.ts         # 로컬 개발용 WS 서버 (ws, :4001)
│       └── lambda/
│           ├── appointmentsHandler.ts  # HTTP API Lambda 핸들러
│           ├── broadcast.ts           # WebSocket 브로드캐스트
│           └── websocketHandlers.ts   # $connect / $disconnect
│
└── frontend/                          # React SPA
    ├── README.md
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
