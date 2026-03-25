# Promotions Endpoint — /v1/academics/promotions
Bulk-promote students from one academic year to the next across class-sections.
Permission: `academics.promotion.manage`

## POST /v1/academics/promotions
Async BullMQ job. Returns 202 Accepted with job_id.
Requires `Idempotency-Key` header (UUID) to prevent duplicate submissions.

### Request Headers
- `Authorization: Bearer <token>`
- `Idempotency-Key: <uuid>` — REQUIRED

### Request Body
```json
{
  "from_academic_year_id": "uuid",
  "to_academic_year_id": "uuid",
  "promotions": [
    {
      "student_id": "uuid",
      "from_class_section_id": "uuid",
      "to_class_section_id": "uuid",
      "status": "promoted" | "detained" | "transferred_out"
    }
  ]
}
```

### Response 202 Accepted
```json
{
  "data": {
    "job_id": "string",
    "status": "queued",
    "total": 42,
    "message": "Promotion job queued for 42 student(s)."
  }
}
```

### Emits
- `student.promoted` event per student (handled by processor)

### Idempotency
- Duplicate requests with the same `Idempotency-Key` return 409 Conflict with existing `job_id`.

### Notes
- Student enrollment record updates are handled by the BullMQ processor.
- Full student record writes require the Students module (Phase 2 Task #2).
- The processor emits one `student.promoted` event per promotion item.
