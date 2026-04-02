# 배포 과정 및 트러블슈팅

## 1. 클라우드 계정 및 인프라 설정

### AWS 계정 설정

<!-- ✏️ 실제 수행한 내용으로 작성하세요 -->

1. **AWS 계정 생성/로그인**: AWS Management Console에 접속하여 계정 생성
2. **IAM 사용자 생성**: 루트 계정 대신 IAM 사용자를 생성하고, `AdministratorAccess` 정책 할당
3. **AWS CLI 설정**: `aws configure`로 Access Key/Secret Key, 리전(`ap-northeast-2`) 설정
4. **SAM CLI 설치**: `brew install aws-sam-cli` (macOS)
5. **예산 알림 설정**: AWS Budgets에서 월 $5 예산 설정 + 80%, 100% 도달 시 이메일 알림

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

## 2. 배포 절차

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

<!-- ✏️ 실제 경험한 문제와 해결 과정을 상세히 기록하세요 -->
<!-- 아래는 예시 템플릿입니다. 실제 내용으로 교체하세요 -->

### 문제 1: CORS 에러

**증상**: 프론트엔드에서 API 호출 시 브라우저 콘솔에 CORS 에러 발생
```
Access to fetch at 'https://xxx.execute-api.ap-northeast-2.amazonaws.com/prod/appointments'
from origin 'https://xxx.vercel.app' has been blocked by CORS policy
```

**원인**: API Gateway HTTP API의 CORS 설정에서 `AllowOrigins`가 `*`로 설정되어 있으나, 프리플라이트(OPTIONS) 요청에 대한 응답 헤더가 누락

**해결**:
- `template.yaml`의 `CorsConfiguration`에 `AllowOrigins`, `AllowMethods`, `AllowHeaders`를 명시적으로 설정
- Lambda 응답에도 CORS 헤더가 포함되도록 확인

```yaml
CorsConfiguration:
  AllowOrigins:
    - '*'
  AllowMethods:
    - GET
    - POST
    - PATCH
  AllowHeaders:
    - '*'
```

---

### 문제 2: Lambda 경로 불일치 (Stage prefix)

**증상**: 배포 후 모든 API 요청이 404 반환

**원인**: API Gateway HTTP API가 경로에 스테이지 이름(`/prod`)을 포함시키는데, Lambda 핸들러가 `/prod/appointments`를 인식하지 못함

**해결**: `appointmentsHandler.ts`에 `normalizeHttpPath()` 함수를 추가하여 스테이지 prefix를 자동 제거

```typescript
function normalizeHttpPath(event): string {
  let p = raw.replace(/\/{2,}/g, '/');
  const stage = event.requestContext.stage;
  if (stage && stage !== '$default') {
    const prefix = `/${stage}`;
    if (p.startsWith(`${prefix}/`)) {
      p = p.slice(prefix.length) || '/';
    }
  }
  return p;
}
```

---

### 문제 3: WebSocket API 배포 오류

**증상**: `sam deploy` 시 WebSocket 관련 리소스 생성 실패

**원인**: <!-- ✏️ 실제 원인을 기록하세요 -->

**해결**: <!-- ✏️ 실제 해결 방법을 기록하세요 -->

---

### 문제 4: DynamoDB IAM 권한 부족

**증상**: Lambda 실행 시 `AccessDeniedException` 발생

**원인**: Lambda 함수의 IAM 정책에 DynamoDB 테이블 접근 권한이 누락

**해결**: `template.yaml`에서 `DynamoDBCrudPolicy`를 두 테이블(Appointments, Connections) 모두에 적용

```yaml
Policies:
  - DynamoDBCrudPolicy:
      TableName: !Ref AppointmentsTable
  - DynamoDBCrudPolicy:
      TableName: !Ref ConnectionsTable
  - Statement:
      - Effect: Allow
        Action:
          - execute-api:ManageConnections
        Resource: !Sub 'arn:aws:execute-api:...'
```

---

### 문제 5: 환경 변수 미설정

**증상**: WebSocket 브로드캐스트가 동작하지 않음 (로그에 `WS_API_ENDPOINT not set` 경고)

**원인**: Lambda 환경 변수 `WS_API_ENDPOINT`가 WebSocket API 배포 전에 참조되어 빈 값

**해결**: SAM `template.yaml`에서 `!Sub`를 사용하여 WebSocket API ID를 동적으로 참조

```yaml
WS_API_ENDPOINT: !Sub "https://${WebSocketApi}.execute-api.${AWS::Region}.amazonaws.com/prod"
```

---

### 문제 6: Vercel 프론트엔드 라우팅

**증상**: 새로고침 시 404 에러

**원인**: SPA의 클라이언트 사이드 라우팅이 Vercel에서 처리되지 않음

**해결**: `vercel.json`에 모든 경로를 `index.html`로 리라이트하는 설정 추가

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 4. 배포 검증 체크리스트

- [ ] API Gateway HTTP API URL로 `GET /appointments` 응답 확인
- [ ] `POST /appointments`로 예약 생성 후 DynamoDB 콘솔에서 데이터 확인
- [ ] `PATCH /appointments/:id/transition`으로 상태 전이 테스트
- [ ] 프론트엔드에서 칸반 보드 렌더링 확인
- [ ] WebSocket 연결 상태 배너가 `connected`로 표시되는지 확인
- [ ] 두 브라우저 탭에서 동시에 열고, 한 쪽에서 상태 변경 시 다른 쪽에 반영되는지 확인
- [ ] 잘못된 상태 전이 시 에러 메시지가 표시되는지 확인

---

## 5. 클라우드 콘솔 확인 포인트

데모 시 아래 항목을 클라우드 콘솔에서 직접 보여줄 수 있습니다:

1. **CloudFormation** → 스택 `fs-1-backend` → 리소스 탭 → 생성된 리소스 목록
2. **Lambda** → `inspline-appointments` → 모니터링 탭 → 호출 횟수, 에러율
3. **DynamoDB** → `fs-1-backend-appointments` → 항목 탐색 → 저장된 예약 데이터
4. **API Gateway** → HTTP API → 스테이지 → `prod` → API URL
5. **API Gateway** → WebSocket API → `inspline-ws` → 스테이지 → WebSocket URL
6. **CloudWatch Logs** → Lambda 로그 그룹 → 실행 로그 확인
7. **AWS Budgets** → 예산 설정 확인
