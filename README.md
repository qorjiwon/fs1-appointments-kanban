# 치과 예약 관리 시스템

치과 예약 시스템의 **관리자 대시보드**입니다. 칸반 보드에서 예약을 실시간으로 모니터링하고 관리할 수 있습니다.

**배포된 페이지 바로가기:** [https://fs1-appointments-kanban.vercel.app/](https://fs1-appointments-kanban.vercel.app/)

---

## 아키텍처 다이어그램

### 시스템 아키텍처

<img width="700" alt="system architecture" src="https://github.com/user-attachments/assets/4826dfee-bd75-4d02-bd8a-fb214807223f" />


```
┌─────────────────────────────────────────────────────────────────────┐
│                          클라이언트 (브라우저)                           │
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
│  - 브로드캐스트 트리거       │      │   └──────────┬──────────────┘
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

## AI 활용 및 도구

### 사용한 AI

- **Cursor** (Pro Plan)
- **Opus 4.6**: 초기 설계·환경 세팅·어려운 버그 추적·전체 맥락이 필요한 작업
- **Auto 모드**: 이후 수정·리팩터·문서 다듬기·빠른 반복 작업

(일반적으로는 **Claude Sonnet 4.6**을 “기능 개발·보통 난이도 버그”에 쓰는 편이지만, 이번 저장소 작업 로그상으로는 **Opus 4.6 + Auto** 조합으로 진행했습니다.)

### 모델·모드를 고르는 기준 (평소)

| 상황 | 선택 |
|------|------|
| 작은 수정, 짧은 질문 | **Auto** |
| 웬만한 기능 추가·일반적인 버그 수정 | **Claude Sonnet 4.6** |
| 어렵고 복잡한 문제, 깊은 추론이 필요할 때 | **Opus급** 또는 상위 reasoning 모델 |
| 대형 코드베이스·긴 컨텍스트 | 위 모델에 **Max Mode** 등으로 컨텍스트 여유 확보 |

### 이번 과제에서만의 선택

비교적 작은 규모의 프로젝트이고, 처음 Opus 4.6으로 환경 세팅·보일러플레이트·핵심 API까지 잡았을 때 한 번에 나온 결과가 충분히 좋았습니다. 그래서 이후에는 Auto 모드만으로도 빠르게 UI·문서·자잘한 수정을 이어갈 수 있었고, Sonnet은 사용하지 않았습니다.

### 이 프로젝트에서 AI가 맡은 개발 범위 (사실상 전부)

- **프론트엔드**: Vite + React + TypeScript 구조, 칸반 UI·상세 패널·필터·URL 동기화, WebSocket 훅·재연결, API 연동, 에러/빈 상태 UI 등
- **백엔드**: Express 로컬 경로, Lambda 핸들러(HTTP·WebSocket connect/disconnect), DynamoDB 리포지토리·GSI 조회 로직, 상태 머신·낙관적 잠금·브로드캐스트
- **인프라(IaC)**: SAM `template.yaml`·리소스 정의, IAM·CORS·환경 변수 연동 등 배포에 필요한 설정
- **문서**: README 초안

### AI 활용 방법

1. **개발을 맡긴 뒤, 같은 맥락에서 문서화를 요청합니다.**  
   구현 직후 에이전트에게 README·API 명세·폴더 구조 설명을 쓰게 하면, 나중에 **문서를 다시 짤 때 시간이 줄고**, 복잡한 코드를 **직접 전부 이해할 필요**도 적어집니다.

2. **첫 개발(환경 세팅·보일러플레이트)** 단계에서는 프롬프트에 다음을 한꺼번에 넣습니다.  
   - **비즈니스 컨텍스트** (도메인, 화면 흐름)  
   - **클라우드·스택 선택** (예: Lambda, API Gateway, DynamoDB, WebSocket)  
   - **요구사항 명세** (API, 상태 전이, 실시간 갱신 등)

3. **이후에는 Auto 또는 Sonnet으로 검토와 수정을 반복**하면서, 에이전트에게 **문서 갱신**을 반복 요청합니다.
   이번 과제에서는 초기 Opus 결과가 좋아 **검토·수정 루프를 주로 Auto**로 돌렸습니다.

### 사용한 도구

- **Cursor IDE** (에디터 + AI 에이전트·채팅·인라인 편집)


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

---

## 아키텍처 결정 이유

**① 인프라·DB·배포(아키텍처)**, **② 폴더 구조(모듈)**, **③ 핵심 구현 선택(코드)** 순서로 설명합니다.

## 1. 클라우드 선택: AWS

### 범용 애플리케이션과 인프라에 강점인 AWS

이 프로젝트는 «관리자용 칸반 대시보드»에 **실시간 반영**이 필요하고, 각 플랫폼이 잘하는 영역을 기준으로 비교했습니다.

**AWS**

- 다양한 서비스와 기능을 제공합니다.
- 인프라가 성숙해 있고, 글로벌 네트워크·리전 선택지가 넓습니다.

**GCP**

- 데이터 분석·머신 러닝 쪽에 강점이 있습니다.
- 빅데이터 서비스와 Google의 기술·네트워크 인프라와 잘 맞습니다.

저 역시 **AWS**는 범용 애플리케이션·인프라(컴퓨트, API, 저장소 등) 목적으로, **GCP**는 분석·ML·AI 관련 목적으로 주로 사용해 왔습니다. 이번 과제는 HTTP API·NoSQL·실시간 알림이 묶인 **업무용 웹 대시보드**에 가깝기 때문에, 위와 같은 특성을 기준으로 할 때 **AWS**를 선택했습니다.

이어서 **AWS**에서는 아래 서비스를 조합해 구현했습니다.

- **서버리스 + IaC**: Lambda·API Gateway·DynamoDB를 함께 쓰는 패턴과 자료가 많고, **SAM·CloudFormation**으로 인프라를 코드로 남기기 수월했습니다.
- **API Gateway WebSocket API**: 별도의 장기 실행 서버 없이 브라우저와 WebSocket 연결을 유지하며, 연결별 실시간 이벤트 전송을 구현할 수 있습니다.
- **프리 티어**: Lambda·DynamoDB·API Gateway 무료 한도 내에서 사용했습니다.
- **리전 `ap-northeast-2` (서울)**

### 고려했으나 선택하지 않은 대안

| 대안 | 미선택 이유 |
|------|------------|
| GCP Cloud Run | WebSocket 연결 유지를 위해 추가 설정이 필요하고, Cloud Functions는 WebSocket을 지원하지 않습니다. |
| Azure Functions | WebSocket이 SignalR 등에 기대는 형태가 많아, 이번 범위에서는 복잡도가 커질 수 있었습니다. |
| Render / Railway | 무료 플랜에서 콜드 스타트가 길 수 있고, WebSocket은 인프라를 더 직접 다뤄야 하는 경우가 많습니다. |

---

## 2. 데이터베이스 선택: DynamoDB

### 왜 DynamoDB인가?

백엔드를 Lambda로 두었기 때문에, **연결을 오래 붙잡지 않고** 응답만 빠르게 주는 저장소가 잘 맞습니다. 또 과제 특성상 트래픽이 일정하지 않을 수 있어, 켜 두는 비용보다 **요청 단위 과금**이 부담이 적었습니다.

- **서버리스와 같은 방식으로 쓰기 좋음**: Lambda와 IAM으로 연결하고, 콜드 스타트 없이 즉시 응답합니다.
- **온디맨드 과금 (PAY_PER_REQUEST)**: 사용한 만큼만 과금되어, 스파이크가 적은 데모·과제 환경에 맞습니다.
- **이번 도메인에 맞는 단순한 모델**: 예약 엔티티가 중심이고, `status`와 `datetime`으로 칸반 조회를 커버할 수 있어 단일 테이블 + GSI 설계로 충분했습니다.
- **낙관적 잠금을 네이티브로 지원**: `ConditionExpression`과 `version` 필드로 동시 수정을 막을 수 있어, 요구사항(동시 편집)에 직접 대응하기 좋았습니다.

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

**GSI를 이렇게 잡은 이유**: 칸반에서는 “특정 상태 열에 속한 예약을, 예약 시각 순으로 보여 주는” 조회가 가장 많습니다. 그래서 GSI의 파티션 키는 `status`, 정렬 키는 `datetime`으로 두었습니다.

### 고려했으나 선택하지 않은 대안

| 대안 | 미선택 이유 |
|------|------------|
| RDS (PostgreSQL) | Lambda와 함께 쓸 때 커넥션 관리가 부담되고, RDS Proxy를 쓰면 비용·구성이 늘어납니다. |
| Aurora Serverless v2 | 최소 과금 단위가 존재합니다. 0.5 ACU (~$43/월) |
| MongoDB Atlas | 외부 SaaS 의존성이 추가되고, DynamoDB 대비 AWS 통합 이점이 없습니다. |

---

## 3. 서버리스 아키텍처를 선택한 이유

### 적은 비용과 확장성

1. **운영 부담 감소**: EC2/ECS처럼 인스턴스를 직접 관리하거나 패치 일정을 맞출 필요가 없습니다.
2. **비용**: 요청이 없을 때 과금이 거의 들지 않아, 제출·데모용으로 부담이 적습니다.
3. **자동 스케일**: 동시에 여러 명이 접속해도 Lambda가 확장되는 쪽에 맡길 수 있습니다.
4. **IaC 한 파일**: `template.yaml`로 스택을 정의해 두면, 같은 설정으로 다시 배포하기 쉽습니다.

### SSE 대신 WebSocket을 선택한 이유

여러 탭에 같은 변경을 밀어 주는 대시보드이기에 **SSE(Server-Sent Events)**와 **WebSocket** 중에서 고민했습니다. 이 프로젝트에서는 아래와 같은 이유로 **WebSocket**을 택했습니다.

- **전송 방향**: SSE는 기본적으로 **서버 → 클라이언트 한 방향**입니다. WebSocket은 **양방향**이라, 이후에 클라이언트에서 heartbeat·구독 범위 전달 등을 넣을 여지가 있습니다.
- **선택한 AWS 구성과의 맞춤**: 여기서는 **API Gateway WebSocket API**와 `PostToConnection`으로 **연결 ID마다** 짧은 JSON을 보내는 브로드캐스트 모델을 썼습니다. SSE로 같은 UX를 내려면 **HTTP 장시간 스트림**이 되는데, API Gateway(HTTP)·Lambda만으로는 **타임아웃·스트리밍 응답**을 별도로 설계해야 하는 경우가 많습니다. WebSocket API는 “연결 유지 + 서버 푸시”가 제품 모델에 맞게 제공됩니다.
- **이벤트 단위 갱신**: 칸반은 예약 생성·수정처럼 **짧은 이벤트**가 터질 때마다 모든 열려 있는 대시보드에 알리면 되므로, 스트림을 계속 열어 두는 SSE보다 **메시지 단위**인 WebSocket이 구현 목표와 잘 맞았습니다.

### 왜 Express도 유지하는가? (듀얼 런타임)

로컬에서 매번 SAM Local을 올리지 않아도 API를 돌릴 수 있도록, **Express 경로**를 남겨 두었습니다. 배포 환경에서는 **Lambda + DynamoDB**를 쓰고, 두 경로가 **같은 비즈니스 규칙**을 쓰도록 맞췄습니다.

```
backend/src/
├── index.ts + routes/ + services/  ← 로컬 개발용 Express (인메모리)
├── lambda/ + dynamo/               ← AWS 배포용 Lambda (DynamoDB)
└── services/stateMachine.ts        ← 공유 비즈니스 로직
```

- **로컬 개발이 빠릅니다**: `npm run dev`만으로 API를 띄워 UI와 함께 바로 확인할 수 있습니다.
- **규칙을 한곳에서**: `stateMachine.ts`의 상태 전이 규칙을 Express와 Lambda가 공유해, “로컬에서는 되는데 배포만 다름”을 줄이려 했습니다.
- **배포 이슈 시 대안**: 필요하면 Express 기반으로 다른 호스팅으로 옮기는 것도 가능합니다.

---

## 4. 모듈 구성

### 백엔드 레이어 구조

```
models/           → 타입 정의 (순수 TypeScript 인터페이스)
services/         → 비즈니스 로직 (상태 머신, 인메모리 저장소)
dynamo/           → 데이터 액세스 (DynamoDB 전용 리포지토리)
lambda/           → 진입점 (AWS Lambda 핸들러)
routes/           → 진입점 (Express 라우트 — 로컬용)
websocket/        → WebSocket 연결 관리
```

- **`models/`**: 다른 레이어에 끌려가지 않는 순수 타입만 둡니다.
- **`services/stateMachine.ts`**: DB에 의존하지 않는 순수 로직이라, 나중에 테스트나 교체가 쉽습니다.
- **`dynamo/`**: AWS SDK와 DynamoDB 접근만 담당하고, 전이 가능 여부 등은 `stateMachine`에 맡깁니다.
- **`lambda/`**: API Gateway 이벤트를 파싱하고, 응답 형식만 맞춥니다.

### 프론트엔드 구조

```
components/       → UI 렌더링 전담 (프레젠테이션)
hooks/            → 상태 관리 + 부수효과 (비즈니스 로직)
services/         → 외부 API 통신 (인프라)
types/            → 공유 타입 정의
```

**Custom Hook을 쓴 이유**: 화면 수와 상태가 Redux까지 필요할 만큼 크지 않다고 판단했습니다. 대신 훅으로 묶어서, 컴포넌트는 “무엇을 그릴지”에만 집중하게 했습니다.

- 별도 전역 상태 라이브러리 없이 React만으로도 충분한 규모였습니다.
- **`useAppointments`**: 목록 조회·갱신·WebSocket으로 들어온 실시간 이벤트를 한곳에서 다룹니다.
- **`useFilters`**: 필터 상태와 URL 쿼리를 맞춰 두어, 새로고침해도 같은 화면을 복원하기 쉽습니다.
- **`useWebSocket`**: 연결·재연결(지수 백오프)을 UI 컴포넌트와 분리했습니다.

---

## 5. 핵심 코드 구성

### 낙관적 잠금 (Optimistic Locking)

과제 문서에 **동시 수정**이나 **버전 필드**를 넣으라는 요구는 없었습니다. 다만 같은 예약을 **여러 탭·여러 명이 거의 동시에** 바꾸는 상황을 가정할 수 있었고, 그때 **나중에 저장한 쪽만 남고 앞선 변경이 조용히 덮어씌워지는 문제(Lost update)** 가 생길 수 있다고 보았습니다. 그래서 DynamoDB의 `version` 속성과 `ConditionExpression`으로 **낙관적 잠금**을 추가로 넣었습니다.

```typescript
ConditionExpression:
  'attribute_exists(id) AND (... #version = :expectedVersion)'
```

- 여러 관리자가 **동시에 같은 예약**을 수정할 때, 마지막 저장만 남는 실수를 막는 것이 목적입니다.
- 버전이 맞지 않으면 DynamoDB가 거절하고, API는 **409**와 함께 최신 데이터를 돌려줍니다.
- 프론트엔드는 그때 사용자에게 알리고 목록을 다시 맞춥니다.

### WebSocket 브로드캐스트

```
HTTP 요청 → Lambda 처리 → DynamoDB 저장 → broadcastAppointmentEventSafe()
                                              ↓
                                    ConnectionsTable 조회 → PostToConnection
```

- **저장은 반드시 성공으로 마무리**: 브로드캐스트는 `broadcastAppointmentEventSafe`로 감싸 두어, 실패해도 HTTP 응답 자체는 깨지지 않게 했습니다. (실시간은 부가 기능이므로.)
- **끊긴 연결 정리**: `PostToConnection`이 410을 주면, 그 connectionId는 테이블에서 지워 다음부터는 보내지 않습니다.
- **SNS/SQS 없이**: 과제 범위에서는 Lambda에서 직접 `PostToConnection`을 호출하는 단순한 경로로 충분하다고 판단했습니다.

---

## 6. 기술적 트레이드오프 정리

모든 선택에는 타협이 있습니다. 과제 범위에서 **의도적으로 받아들인 점**을 표로만 정리합니다.

| 결정 | 장점 | 단점 / 알고 있는 리스크 |
|------|------|------------------------|
| DynamoDB 단일 테이블 | 구조가 단순하고 비용을 낮게 가져가기 좋습니다 | 아주 복잡한 조건 검색에는 Scan 등이 필요할 수 있습니다 |
| 다중 상태 필터 → Scan | 구현이 단순하고 빠르게 완성할 수 있습니다 | 데이터가 매우 많아지면 Scan 비용·지연이 커질 수 있습니다 (현재 규모에서는 문제가 없다고 가정합니다) |
| Lambda에서 직접 브로드캐스트 | 중간 큐 없이 아키텍처가 단순합니다 | 연결이 매우 많으면 한 번의 Lambda 실행 시간이 길어질 수 있습니다 |
| 로컬 Express + 인메모리 | 개발 피드백이 빠릅니다 | 로컬과 AWS 환경(영속성 등)이 다를 수 있어, 통합 테스트는 배포 쪽에서 확인합니다 |
| 전역 상태 라이브러리 미사용 | 의존성과 번들이 가볍습니다 | 화면·상태가 크게 늘면 훅만으로는 정리가 어려워질 수 있습니다 |

---

## 배포 과정 및 트러블슈팅

## 1. 클라우드 계정 및 인프라 설정

### AWS 계정 생성 및 CLI

1. **루트 사용자로 AWS 계정 생성**: 이메일로 가입하여 결제 수단을 등록해 루트 계정을 생성합니다.
2. **IAM 사용자 생성 및 권한 부여**: IAM에서 사용자를 만들고, 이 프로젝트 배포에 필요한 권한을 붙입니다. (개인 프로젝트이기에 `AdministratorAccess`로 진행했습니다. 조직에서는 최소 권한 원칙에 맞게 좁힙니다.)
3. **액세스 키 발급**: IAM 사용자로 **Access Key / Secret Access Key**를 발급합니다.
4. **AWS CLI 설정**: `aws configure`로 위 키와 리전(`ap-northeast-2`)을 설정합니다.

### 예산 알림 설정

1. 콘솔에서 **Billing and Cost Management** → **Budgets**로 이동합니다.
2. **월 $1** 예산을 만들고, 임계값 알림을 1%($0.01)로 설정합니다.
3. **Budget actions**(콘솔의 **예산 작업**)은 따로 추가하지 않습니다.

### 사용한 AWS 리소스

| 리소스 | 이름 | 용도 |
|--------|------|------|
| CloudFormation Stack | `fs-1-backend` | SAM 배포 스택 |
| Lambda | `inspline-appointments` | HTTP API 핸들러 |
| Lambda | `inspline-ws-connect` | WebSocket $connect |
| Lambda | `inspline-ws-disconnect` | WebSocket $disconnect |
| DynamoDB | `fs-1-backend-appointments` | 예약 데이터 저장 |
| DynamoDB | `fs-1-backend-connections` | WebSocket 연결 ID |
| API Gateway HTTP API | - | REST API 엔드포인트 |
| API Gateway WebSocket | `inspline-ws` | 실시간 통신 |
| S3 | SAM 아티팩트 버킷 | Lambda 코드 패키지 저장 |

---

## 2. 배포

### 백엔드 (AWS SAM)

```bash
cd backend
sam build          # TypeScript 컴파일 + Lambda 아티팩트 준비
sam deploy         # CloudFormation으로 AWS 리소스 배포
```

SAM 설정 (`samconfig.toml`):

```toml
stack_name = "fs-1-backend"
region = "ap-northeast-2"
capabilities = "CAPABILITY_IAM"
resolve_s3 = true
```

### 프론트엔드 (Vercel)

1. Vercel 대시보드에서 Git 저장소 Import
2. Root Directory: `frontend`
3. Framework Preset: Vite
4. 환경 변수 설정:
   - `VITE_API_URL`: API Gateway HTTP API URL
   - `VITE_WS_URL`: API Gateway WebSocket URL

---

## 3. 배포 중 만난 문제와 해결 과정

### 문제 1: 배포 후 API 404 (환경 변수·URL)

**증상**: 배포 후 브라우저에서 API 호출이 404로 떨어짐

**원인**: **`VITE_API_URL`** 을 잡을 때 **스테이지 prefix**(예: `/prod`)를 **포함한 채로** 넣어 두고 요청을 보내, 최종 URL이 게이트웨이·Lambda가 기대하는 경로와 맞지 않았습니다.

**해결**: Vercel **환경 변수 설정에서 스테이지 prefix를 직접 제거**했습니다.

---

### 문제 2: `GET /appointments` 500 (DynamoDB Query 조건)

**증상**: 프론트엔드에서 예약 목록을 불러올 때 `GET /appointments` 응답이 **500 Internal Server Error**였습니다.

**원인 추적**: Cursor **Opus 4.6**으로 코드를 따라가 보니, 요청은 최종적으로 DynamoDB 조회 함수 `listAppointmentsDdb()`까지 연결되는 것이 확인되었습니다. 문제가 된 분기는 **필터 `status`가 없거나 여러 개인 경우**였고, 그 안에서 `QueryCommand`에 아래와 비슷한 조건이 쓰이고 있었습니다.

```typescript
KeyConditionExpression: '#status <> :x'
```

의도는 “특정 `status` 하나만 빼고 나머지를 조회”에 가깝지만, **GSI 파티션 키**에 대해서는 `Query`의 `KeyConditionExpression`에 **`=` 외의 비교 연산을 둘 수 없습니다.** TypeScript 상으로는 문제없어 보여도, 실행 시 DynamoDB가 **ValidationException**을 던지는 코드였습니다.

**흐름 정리**: 프론트 `GET /appointments` → Lambda에서 잘못된 `Query` 실행 → DynamoDB 예외 → 핸들러가 잡아 **500**을 반환했습니다.

**해결**: 해당 분기에서는 `Query`로 “제외 조건”을 표현하지 않도록 로직을 고쳤습니다. (필요 시 `Scan`·여러 번의 `Query`·애플리케이션 측 필터 등 허용되는 패턴으로 대체.)

---

### 문제 3: SAM 배포 실패 — 리소스 이름 충돌

**증상**: `sam deploy`가 **초기 검증(Early Validation)** 단계에서 막히거나, 리소스 생성 단계에서 이름 충돌로 실패하는 경우가 있었습니다.

**원인**: `template.yaml`에 **물리 리소스 이름이 고정 문자열**로 박혀 있었습니다. (예: 테이블·함수·WebSocket API 등 — `Appointments`, `Connections`, `inspline-appointments`, `inspline-seed-appointments`, `inspline-ws-connect`, `inspline-ws-disconnect`, `inspline-ws` 등.) 로컬에서 YAML을 수정·삭제했는지와 별개로, **이전 배포 실패의 잔여물이나 수동으로 만든 동일 이름 리소스**가 계정에 남아 있으면 CloudFormation이 새로 만들지 못하고 실패할 수 있습니다.

**이 과정에서 정리한 점**

- 템플릿만 볼 것이 아니라 **AWS 콘솔에서 동일 이름의 리소스·남은 스택**이 있는지 함께 봐야 합니다.
- 고정 이름을 유지할 거면 배포 전에 **충돌 나는 리소스를 정리**하거나, 스택/리소스 이름 규칙을 바꿔 **이름 충돌이 나지 않게** 맞춥니다.

---

## 참고

<details>
<summary>프로젝트 구조·API 명세</summary>

- **프로젝트 구조** (디렉터리 트리·역할): [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md)
- **API 명세** (엔드포인트·요청·응답 코드): [`docs/API.md`](docs/API.md)

</details>
