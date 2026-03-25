# GET /v1/school/theme

## Purpose
Returns the CSS theme variables for the current school (tenant).
Called by the frontend on app init to inject CSS custom properties into the `<style>` tag before first paint. This enables per-school branding without a page reload.

## Roles & Permissions
- **Public** — no authentication required. Called before login to render the branded login page.
- No permission check needed.

## Request Schema
```
GET /v1/school/theme
Headers:
  X-School-ID: <uuid>   OR
  Host: <slug>.schoolos.com
```
No request body.

## Response Schema
```json
{
  "data": {
    "school_id": "uuid",
    "school_name": "Springfield High School",
    "theme": {
      "color_primary": "#1e40af",
      "color_secondary": "#1e3a8a",
      "color_accent": "#3b82f6",
      "color_surface": "#f8fafc",
      "radius_md": "0.5rem",
      "radius_lg": "0.75rem",
      "font_heading": "Inter",
      "font_body": "Inter"
    }
  }
}
```

## Errors
| Code | HTTP | Description |
|------|------|-------------|
| `SCHOOL_NOT_FOUND` | 404 | The school slug or ID does not exist |
| `SCHOOL_INACTIVE` | 403 | The school account has been deactivated |
