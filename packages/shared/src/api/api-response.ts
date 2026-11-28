import type { z } from 'zod';
import type { ConnectionErrorDto } from '../database/connection-api.js';

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
 * Validation issues and structured connection errors
 * are included when applicable.
 */
export interface ApiErrorResponse {
    statusCode: number
    error: string
    message: string
    issues?: ApiValidationIssue[]
    connectionError?: ConnectionErrorDto
}

/**
 * Represents metadata returned after establishing
 * a live database connection.
 */
export interface ConnectionSessionDto {
    connectionId: string
    engine: string
    connected: true
    connectedAt: string
}

/**
 * Represents the current runtime status of a connection.
 */
export interface ConnectionStatusDto {
    connectionId: string
    connected: boolean
}

/**
 * Represents the status result for a single database connection.
 *
 * Contains the connection's runtime status when the connection exists,
 * or error details when the connection could not be found.
 */
export interface ConnectionStatusResult {
    connectionId: string
    connected?: boolean
    statusCode?: number
    error?: string
    message?: string
}

/**
 * Represents the status results for a batch of database connections.
 *
 * Each entry corresponds to one connection ID from the status request.
 */
export type ConnectionStatuses = ConnectionStatusResult[]