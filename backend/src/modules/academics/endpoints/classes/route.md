# Classes Endpoints — /v1/academics/classes

## Purpose
Manage grade/class levels per school. Board-agnostic — schools name them freely (Grade 1, Class 6, LKG, etc.).

## Endpoints
- **POST** /v1/academics/classes — Create class. Permission: `academics.class.create`
- **GET** /v1/academics/classes — List all classes (ordered by order_index). Permission: `academics.class.read`
- **GET** /v1/academics/classes/:id — Get single class. Permission: `academics.class.read`
- **PATCH** /v1/academics/classes/:id — Update class name/order. Permission: `academics.class.update`
- **DELETE** /v1/academics/classes/:id — Soft delete. Permission: `academics.class.delete`
- **PATCH** /v1/academics/classes/reorder — Bulk update order_index array. Permission: `academics.class.update`

## Errors
| Code | HTTP | Description |
|------|------|-------------|
| `NOT_FOUND` | 404 | Class not found |
| `CONFLICT` | 409 | Class name already exists |
