# Student Siblings API

Links sibling students within the same school. The relationship is bi-directional —
linking A→B automatically creates B→A. Used by the Fees module for automatic sibling discount detection.

## Endpoints

| Method | Path                                           | Permission                  | Description                              |
|--------|------------------------------------------------|-----------------------------|------------------------------------------|
| GET    | /v1/students/:id/siblings                      | students.profile.read       | List all siblings of a student           |
| POST   | /v1/students/:id/siblings                      | students.profile.update     | Link a sibling (creates both directions) |
| DELETE | /v1/students/:id/siblings/:siblingId           | students.profile.update     | Unlink a sibling (removes both rows)     |

## Conflict Rules
- A student cannot be linked as their own sibling.
- Duplicate sibling pairs are silently ignored (idempotent POST).

## Notes
- `sibling_id` must belong to the same school.
- When deleted, both `(A→B)` and `(B→A)` rows are removed.
