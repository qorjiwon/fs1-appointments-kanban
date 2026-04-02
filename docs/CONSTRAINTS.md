# 제약 조건, 오류 및 포기 항목

## 1. 문제 오류 또는 제약 조건에서 진행할 수 없었던 항목

<!-- ✏️ 실제로 오류가 있거나 제약 조건으로 진행할 수 없었던 항목을 상세히 기록하세요 -->

### 1.1 SeedAppointmentsFunction 소스 파일 부재

**상황**: `template.yaml`에 `SeedAppointmentsFunction`이 정의되어 있으나, 핸들러로 지정된 `dist/lambda/seedAppointments.handler`에 대응하는 소스 파일 `src/lambda/seedAppointments.ts`가 존재하지 않음

**영향**: `sam build` 시 해당 함수의 빌드가 실패하거나, 빌드 산출물에 핸들러가 없어 Lambda 호출 시 런타임 에러 발생

**결론에 이른 과정**:
1. `template.yaml`의 `SeedAppointmentsFunction`에서 `Handler: dist/lambda/seedAppointments.handler` 확인
2. `backend/src/lambda/` 디렉토리에 `seedAppointments.ts` 파일 부재 확인
3. Makefile의 빌드 타겟에 `build-SeedAppointmentsFunction`이 포함되어 있으므로 빌드는 시도되지만, 컴파일할 소스가 없음

**해결 방안**: 시드 Lambda를 사용하지 않고, DynamoDB 콘솔에서 수동으로 테스트 데이터를 삽입하거나, `POST /appointments` API를 통해 데이터 생성

---

### 1.2 로컬 WebSocket 서버 부재

**상황**: 프론트엔드의 `useWebSocket` 훅이 `VITE_WS_URL` 미설정 시 `ws://localhost:4001`에 연결을 시도하지만, 백엔드 Express 서버(`localhost:4000`)에는 WebSocket 서버가 구현되어 있지 않음

**영향**: 로컬 개발 환경에서 WebSocket 실시간 기능을 테스트할 수 없음

**결론에 이른 과정**:
1. `backend/src/index.ts`에 WebSocket 서버 코드 없음 확인
2. `useWebSocket.ts`에서 fallback URL이 `ws://localhost:4001`인 것 확인
3. Express 서버는 4000번 포트만 사용

**조치**: 로컬에서는 WebSocket 없이 REST API 기반으로 개발, 실시간 기능은 AWS 배포 환경에서 테스트

---

## 2. 시간 부족으로 포기한 부분과 이유

<!-- ✏️ 실제로 시간이 부족하여 구현하지 못한 부분을 기록하세요 -->

### 2.1 테스트 코드

**포기한 이유**: 핵심 기능 구현과 배포에 우선순위를 두어 단위/통합 테스트 작성 시간 확보 불가

**영향**: 상태 머신 전이 규칙, API 엔드포인트, 컴포넌트 렌더링에 대한 자동화 테스트 부재

**구현했다면**:
- `stateMachine.ts`에 대한 순수 함수 단위 테스트 (Jest)
- `appointmentRepository.ts`에 대한 DynamoDB Local 통합 테스트
- React 컴포넌트 렌더링 테스트 (React Testing Library)

---

### 2.2 로컬 WebSocket 서버 구현

**포기한 이유**: AWS WebSocket API로 배포 환경에서는 동작하므로, 로컬 개발용 WS 서버 구현은 후순위

**영향**: 로컬에서 실시간 기능을 테스트하려면 AWS에 배포해야 함

**구현했다면**:
- Express 서버에 `ws` 라이브러리로 WebSocket 서버 추가 (port 4001)
- 인메모리 연결 관리 + 브로드캐스트

---

### 2.3 Seed Lambda 함수 구현

**포기한 이유**: `POST /appointments` API로 수동 데이터 생성이 가능하여 별도 시드 함수의 우선순위 낮음

**영향**: 초기 데모 데이터를 한 번에 넣는 자동화 부재

---

### 2.4 인증/인가

**포기한 이유**: Take-Home 범위에서 인증은 요구사항에 없었으며, Cognito 등 추가 시 복잡도가 크게 증가

**영향**: 누구나 API에 접근 가능 (데모 용도로는 문제 없음)

**구현했다면**:
- Amazon Cognito User Pool + API Gateway Authorizer
- JWT 토큰 기반 인증

---

### 2.5 CI/CD 파이프라인

**포기한 이유**: GitHub Actions + SAM 자동 배포 파이프라인 설정 시간 부족

**영향**: 코드 변경 시 수동 `sam deploy` 필요

**구현했다면**:
- GitHub Actions에서 push 시 자동 `sam build && sam deploy`
- Vercel은 Git 연동으로 자동 배포 됨

---

## 3. 알려진 제한사항

| 항목 | 현재 상태 | 개선 방향 |
|------|----------|----------|
| 다중 상태 필터 조회 | DynamoDB Scan 사용 | 상태별 GSI Query + 병합으로 개선 가능 |
| 페이지네이션 | 전체 결과 로드 후 슬라이싱 | DynamoDB `ExclusiveStartKey` 기반 커서 페이지네이션 |
| WebSocket 연결 수 | Lambda 내 순차 브로드캐스트 | SQS/SNS 팬아웃으로 대규모 연결 처리 |
| 에러 모니터링 | CloudWatch 로그만 사용 | X-Ray 트레이싱, CloudWatch Alarms 추가 |
| 프론트엔드 번들 | 코드 스플리팅 미적용 | React.lazy + Suspense로 지연 로딩 |
