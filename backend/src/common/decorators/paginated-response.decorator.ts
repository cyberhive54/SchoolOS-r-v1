/**
 * Re-export from skip-transform.decorator to support named import.
 * @PaginatedResponse() — tells the transform interceptor to format as paginated list.
 * The service must return { items: T[], total: number, page: number, per_page: number }.
 */
export { PaginatedResponse } from './skip-transform.decorator';
