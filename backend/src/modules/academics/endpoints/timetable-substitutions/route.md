# Timetable Substitutions API

Daily substitution records. When a teacher is absent, records who covers their slot.
Used for printing daily substitution registers and building substitute-teacher reports.

## Endpoints

| Method | Path                                              | Permission                | Description                              |
|--------|---------------------------------------------------|---------------------------|------------------------------------------|
| POST   | /v1/academics/timetable/substitutions             | academics.timetable.write | Record a substitution for a day+slot     |
| GET    | /v1/academics/timetable/substitutions             | academics.timetable.read  | List substitutions (filter by date)      |
| GET    | /v1/academics/timetable/substitutions/:id         | academics.timetable.read  | Get a single substitution record         |
| PATCH  | /v1/academics/timetable/substitutions/:id         | academics.timetable.write | Update substitute teacher or notes       |
| DELETE | /v1/academics/timetable/substitutions/:id         | academics.timetable.write | Cancel a substitution record             |

## Query Params (GET list)

| Param           | Type   | Required | Description                             |
|-----------------|--------|----------|-----------------------------------------|
| date            | string | no       | ISO date (YYYY-MM-DD) filter            |
| absent_staff_id | UUID   | no       | Filter by absent teacher                |
