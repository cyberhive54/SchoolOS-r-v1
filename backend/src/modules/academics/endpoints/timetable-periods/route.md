# Timetable Periods API

Period slot configuration for a school's timetable structure. Defines the named time slots
(Period 1, Period 2, Lunch Break, etc.) per academic year. These are then used to build
the actual schedule via Timetable Slots.

## Endpoints

| Method | Path                               | Permission                       | Description                                     |
|--------|------------------------------------|----------------------------------|-------------------------------------------------|
| POST   | /v1/academics/timetable/periods    | academics.timetable.write        | Create a period slot definition                 |
| GET    | /v1/academics/timetable/periods    | academics.timetable.read         | List all periods for an academic year           |
| GET    | /v1/academics/timetable/periods/:id| academics.timetable.read         | Get a single period                             |
| PATCH  | /v1/academics/timetable/periods/:id| academics.timetable.write        | Update a period                                 |
| DELETE | /v1/academics/timetable/periods/:id| academics.timetable.write        | Delete a period (only if no slots reference it) |

## Query Params (GET list)

| Param            | Type   | Required | Description                      |
|------------------|--------|----------|----------------------------------|
| academic_year_id | UUID   | yes      | Filter periods by academic year  |

## Conflict Rules
- `period_number` must be unique per `(school_id, academic_year_id)`.
- A period cannot be deleted if timetable_slots reference it.

## Notes
- `is_break: true` periods (Lunch, Recess) are informational — no subject/teacher is assigned to them in slots.
- Times are 24-hour HH:MM strings. `end_time` must be after `start_time`.
