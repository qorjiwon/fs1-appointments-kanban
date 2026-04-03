# API 명세

## `POST /appointments` — 예약 생성

```json
{
  "patient_name": "김철수",
  "datetime": "2026-03-31T10:00:00Z",
  "treatment_type": "스케일링"
}
```

## `GET /appointments` — 예약 목록 조회

| 파라미터 | 설명 |
|---------|------|
| `status` | 상태 필터 (복수 선택 가능, 반복 파라미터) |
| `from` / `to` | 날짜 범위 (ISO 8601) |
| `q` | 환자명 검색 |
| `page` / `limit` | 페이지네이션 (기본 limit: 200) |

## `GET /appointments/:id` — 예약 상세 조회

## `PATCH /appointments/:id/transition` — 상태 전이

```json
{ "target_status": "confirmed", "changed_by": "admin" }
```

허용되지 않은 전이 → 400, 낙관적 잠금 충돌 → 409, 미존재 → 404
