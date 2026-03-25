# Timetable Slots API

Assigns a subject and teacher to a specific period+day for a class-section.
One slot = one cell in the class timetable grid.

## Endpoints

| Method | Path                                    | Permission                | Description                                     |
|--------|-----------------------------------------|---------------------------|-------------------------------------------------|
| POST   | /v1/academics/timetable/slots           | academics.timetable.write | Create a slot (assign teacher+subject to period)|
| GET    | /v1/academics/timetable/slots           | academics.timetable.read  | List slots (filter by class_section or staff)   |
| GET    | /v1/academics/timetable/slots/:id       | academics.timetable.read  | Get a single slot                               |
| PATCH  | /v1/academics/timetable/slots/:id       | academics.timetable.write | Update teacher or subject on a slot             |
| DELETE | /v1/academics/timetable/slots/:id       | academics.timetable.write | Remove a slot assignment                        |

## Query Params (GET list)

| Param             | Type   | Required | Description                                    |
|-------------------|--------|----------|------------------------------------------------|
| academic_year_id  | UUID   | yes      | Filter by academic year                        |
| class_section_id  | UUID   | no       | Get timetable for a specific class-section     |
| staff_id          | UUID   | no       | Get timetable for a specific teacher           |
| day_of_week       | int    | no       | 1=Mon...7=Sun — filter to a specific day       |

## Conflict Rules
- Each `(school_id, class_section_id, timetable_period_id, day_of_week)` combination must be unique.
- `is_free_period: true` means `subject_id` and `staff_id` may be null.
