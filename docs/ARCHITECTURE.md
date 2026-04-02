# 아키텍처 결정 근거

## 1. 클라우드 선택: AWS

### 왜 AWS인가?

- **안전한 서버리스 생태계**: Lambda + API Gateway + DynamoDB 조합은 AWS에서 가장 안정적이고, SAM/CloudFormation으로 IaC 관리가 검증되어 있음
- **WebSocket 네이티브 지원**: API Gateway가 WebSocket API를 자체 지원하여, 별도 서버 없이 실시간 통신 구현 가능 (GCP/Azure는 별도 서비스 필요)
- **프리 티어**: Lambda 월 100만 건, DynamoDB 25GB + 25 WCU/RCU, API Gateway 100만 건 — 현재 규모에서 과금 없이 운영 가능
- **리전**: `ap-northeast-2` (서울) — 한국 기반 서비스에 최적의 레이턴시

### 고려했으나 선택하지 않은 대안

| 대안 | 미선택 이유 |
|------|------------|
| GCP Cloud Run | WebSocket 연결 유지에 추가 구성 필요, Cloud Functions는 WebSocket 미지원 |
| Azure Functions | WebSocket 지원이 SignalR에 의존적이라 복잡도 증가 |
| Render/Railway | 무료 플랜 콜드 스타트 50초+, WebSocket은 인프라 직접 관리 필요 |

---

## 2. 데이터베이스 선택: DynamoDB

### 왜 DynamoDB인가?

- **서버리스 네이티브**: Lambda와 같은 AWS 생태계 내에서 IAM 기반 인증, 콜드 스타트 없는 즉시 응답
- **온디맨드 과금 (PAY_PER_REQUEST)**: 트래픽이 불규칙한 Take-Home 과제에 최적 — 사용한 만큼만 과금
- **단일 테이블 설계에 적합**: 예약 엔티티가 하나이고, `status + datetime` GSI 하나로 주요 조회 패턴을 커버
- **낙관적 잠금 지원**: `ConditionExpression`을 통한 `version` 기반 동시성 제어가 DynamoDB의 네이티브 기능

### 스키마 설계

```
AppointmentsTable
├── PK: id (String, UUID)
├── GSI: status-datetime-index
│   ├── HASH: status
│   └── RANGE: datetime
└── Attributes: patient_name, treatment_type, transition_history, version, ...

ConnectionsTable
├── PK: connectionId (String)
└── 용도: WebSocket 연결 ID 저장/조회/삭제
```

**GSI 설계 근거**: 칸반 보드의 주 조회 패턴은 "특정 상태의 예약을 시간순으로 조회"이므로 `status`를 파티션 키, `datetime`을 소트 키로 구성

### 고려했으나 선택하지 않은 대안

| 대안 | 미선택 이유 |
|------|------------|
| RDS (PostgreSQL) | 서버리스 Lambda와 커넥션 풀 관리 복잡, RDS Proxy 추가 비용 |
| Aurora Serverless v2 | 최소 0.5 ACU 과금 (~$43/월), Take-Home 규모에 과도 |
| MongoDB Atlas | 외부 SaaS 의존성 추가, DynamoDB 대비 AWS 통합 이점 없음 |

---

## 3. 서버리스 아키텍처를 선택한 이유

### 왜 서버리스인가?

1. **인프라 관리 제거**: EC2/ECS 인스턴스 관리, 스케일링 설정, 패치 불필요
2. **비용 효율**: 요청 없으면 과금 0원 — 데모/평가 용도에 최적
3. **자동 스케일링**: 평가 시 동시 접속이 늘어도 Lambda가 자동 확장
4. **IaC 단일 파일**: `template.yaml` 하나로 전체 인프라 정의 → 재현 가능한 배포

### 왜 Express도 유지하는가? (듀얼 런타임)

```
backend/src/
├── index.ts + routes/ + services/  ← 로컬 개발용 Express (인메모리)
├── lambda/ + dynamo/               ← AWS 배포용 Lambda (DynamoDB)
└── services/stateMachine.ts        ← 공유 비즈니스 로직
```

- **로컬 개발 속도**: `npm run dev`로 즉시 API 서버 실행, SAM Local 없이도 빠른 피드백 루프
- **비즈니스 로직 공유**: `stateMachine.ts`의 전이 규칙은 Express와 Lambda 모두에서 동일하게 사용
- **Render 폴백**: AWS 배포 문제 시 Express + Render로 빠르게 전환 가능

---

## 4. 모듈 구성 이유

### 백엔드 레이어 구조

```
models/           → 타입 정의 (순수 TypeScript 인터페이스)
services/         → 비즈니스 로직 (상태 머신, 인메모리 저장소)
dynamo/           → 데이터 액세스 (DynamoDB 전용 리포지토리)
lambda/           → 진입점 (AWS Lambda 핸들러)
routes/           → 진입점 (Express 라우트 — 로컬용)
websocket/        → WebSocket 연결 관리
```

**관심사 분리 원칙**:
- `models/` — 어디에도 의존하지 않는 순수 타입
- `services/stateMachine.ts` — DB에 의존하지 않는 순수 함수 (테스트 용이)
- `dynamo/` — AWS SDK에만 의존, 비즈니스 로직은 `stateMachine` 호출
- `lambda/` — AWS 이벤트 파싱 + 응답 포맷팅만 담당

### 프론트엔드 구조

```
components/       → UI 렌더링 전담 (프레젠테이션)
hooks/            → 상태 관리 + 부수효과 (비즈니스 로직)
services/         → 외부 API 통신 (인프라)
types/            → 공유 타입 정의
```

**Custom Hooks 패턴 선택 이유**:
- 상태 관리 라이브러리(Redux, Zustand) 없이 React 내장 기능으로 충분한 규모
- `useAppointments` — 데이터 페칭/캐시/실시간 업데이트를 하나의 훅으로 캡슐화
- `useFilters` — URL 쿼리파라미터와 필터 상태의 양방향 동기화
- `useWebSocket` — 연결 생명주기 + 지수 백오프 재연결을 컴포넌트로부터 분리

---

## 5. 코드 구성의 핵심 결정

### 낙관적 잠금 (Optimistic Locking)

```typescript
ConditionExpression:
  'attribute_exists(id) AND (... #version = :expectedVersion)'
```

- 여러 관리자가 동시에 같은 예약의 상태를 변경할 때 데이터 정합성 보장
- `ConditionalCheckFailedException` 발생 시 409 응답 + 최신 상태 반환
- 프론트엔드에서 충돌 감지 후 자동 리프레시

### WebSocket 브로드캐스트 전략

```
HTTP 요청 → Lambda 처리 → DynamoDB 저장 → broadcastAppointmentEventSafe()
                                              ↓
                                    ConnectionsTable 조회 → PostToConnection
```

- **Fire-and-forget**: 브로드캐스트 실패가 HTTP 응답에 영향을 주지 않음 (`broadcastAppointmentEventSafe`)
- **Stale connection 정리**: `PostToConnection`이 410 반환 시 ConnectionsTable에서 자동 삭제
- SNS/SQS 같은 별도 메시징 서비스 없이 Lambda에서 직접 `PostToConnection` API 호출

### API Gateway 스테이지 경로 정규화

```typescript
function normalizeHttpPath(event): string {
  // /prod/appointments → /appointments 로 정규화
}
```

- HTTP API의 스테이지 이름이 경로에 포함되는 AWS 동작 차이를 핸들러 레벨에서 처리
- 로컬 테스트와 배포 환경 간 경로 불일치 방지

---

## 6. 기술적 트레이드오프 정리

| 결정 | 장점 | 단점/리스크 |
|------|------|------------|
| DynamoDB 단일 테이블 | 단순, 비용 효율적 | 복잡한 조회 시 Scan 필요 |
| 다중 상태 필터 → Scan | 구현 단순 | 데이터 많으면 성능 저하 (현재 규모에서는 문제 없음) |
| Lambda에서 직접 브로드캐스트 | 아키텍처 단순 | 연결 수 많으면 Lambda 타임아웃 가능 |
| 인메모리 Express (로컬) | 개발 속도 빠름 | 로컬과 배포 환경 간 동작 차이 가능성 |
| 외부 상태 관리 라이브러리 미사용 | 의존성 최소화, 번들 크기 작음 | 상태가 복잡해지면 관리 어려움 |
