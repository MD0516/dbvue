
import axios from 'axios'

import type {
    ApiErrorResponse,
    ApiValidationIssue,
    ConnectionErrorDto,
} from '@dbvue/shared'

/**
 * Represents a normalized API request error.
 *
 * Preserves HTTP status, error category, validation issues
 * and structured database connection errors.
 */
export class ApiError extends Error {
    readonly statusCode?: number
    readonly code?: string
    readonly issues?: ApiValidationIssue[]
    readonly connectionError?: ConnectionErrorDto

    constructor(
        message: string,
        options?: {
            statusCode?: number
            code?: string
            issues?: ApiValidationIssue[]
            connectionError?: ConnectionErrorDto
        },
    ) {
        super(message)

        this.name = 'ApiError'
        this.statusCode = options?.statusCode
        this.code = options?.code
        this.issues = options?.issues
        this.connectionError = options?.connectionError
    }
}

/**
 * Returns a readable message from an unknown error.
 */
export const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message
    }

    return 'Something went wrong.'
}

/**
 * Shared Axios instance for all backend API requests.
 */
export const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
})

api.interceptors.response.use(
    (response) => response,

    (error: unknown) => {
        // Preserve request cancellation errors.
        if (axios.isCancel(error)) {
            return Promise.reject(error)
        }

        if (axios.isAxiosError<ApiErrorResponse>(error)) {
            const data = error.response?.data

            return Promise.reject(
                new ApiError(
                    typeof data?.message === 'string'
                        ? data.message
                        : error.message || 'Something went wrong.',
                    {
                        statusCode:
                            data?.statusCode ?? error.response?.status,
                        code: data?.error,
                        issues: data?.issues,
                        connectionError: data?.connectionError,
                    },
                ),
            )
        }

        return Promise.reject(
            error instanceof Error
                ? error
                : new Error('Something went wrong.'),
        )
    },
)