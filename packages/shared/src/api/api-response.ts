import type { z } from 'zod';

/**
 * Represents a successful API response containing data.
 *
 * @typeParam T - Type of the response data.
 */
export interface ApiResponse<T> {
    message: string
    data: T
}

/**
 * Represents a successful API response without a data payload.
 */
export interface ApiMessageResponse {
    message: string
}

/**
 * Represents a validation issue returned by the API.
 */
export type ApiValidationIssue = z.core.$ZodIssue

/**
 * Represents a failed API response.
 *
 * Validation issues are included when request validation fails.
 */
export interface ApiErrorResponse {
    statusCode: number
    error: string
    message: string
    issues?: ApiValidationIssue[]
}