import { SetMetadata } from '@nestjs/common';
import { SKIP_TRANSFORM_KEY, PAGINATED_RESPONSE_KEY } from '../interceptors/response-transform.interceptor';

/**
 * @SkipTransform() — opt-out of the global response transform interceptor.
 * Use for file download endpoints, SSE streams, etc.
 */
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM_KEY, true);

/**
 * @PaginatedResponse() — tells the transform interceptor to format as paginated list.
 * The service must return { items: T[], total: number, page: number, per_page: number }.
 */
export const PaginatedResponse = () => SetMetadata(PAGINATED_RESPONSE_KEY, true);
