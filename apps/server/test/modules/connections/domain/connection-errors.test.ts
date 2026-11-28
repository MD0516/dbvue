import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { ConnectionErrorCode } from '@dbvue/shared'

import { toConnectionErrorDto } from '../../../../dist/modules/connections/domain/connection-errors.js'

interface ClassificationCase {
    name: string
    error: unknown
    expectedCode: ConnectionErrorCode
    retryable: boolean
}

function createDriverError(
    code: string | number,
    message = 'Sensitive driver error details',
): Error {
    return Object.assign(new Error(message), { code })
}

const cases: ClassificationCase[] = [
    // Authentication
    {
        name: 'MySQL authentication failure',
        error: createDriverError('ER_ACCESS_DENIED_ERROR'),
        expectedCode: 'AUTHENTICATION_FAILED',
        retryable: false,
    },
    {
        name: 'PostgreSQL authentication failure',
        error: createDriverError('28P01'),
        expectedCode: 'AUTHENTICATION_FAILED',
        retryable: false,
    },
    {
        name: 'MongoDB authentication failure',
        error: createDriverError(18),
        expectedCode: 'AUTHENTICATION_FAILED',
        retryable: false,
    },

    // TLS
    {
        name: 'TLS certificate validation failure',
        error: createDriverError('ERR_TLS_CERT_ALTNAME_INVALID'),
        expectedCode: 'TLS_ERROR',
        retryable: false,
    },
    {
        name: 'Expired TLS certificate',
        error: createDriverError('CERT_HAS_EXPIRED'),
        expectedCode: 'TLS_ERROR',
        retryable: false,
    },

    // Network and timeout
    {
        name: 'Connection refused',
        error: createDriverError('ECONNREFUSED'),
        expectedCode: 'CONNECTION_REFUSED',
        retryable: true,
    },
    {
        name: 'Connection timeout',
        error: createDriverError('ETIMEDOUT'),
        expectedCode: 'CONNECTION_TIMEOUT',
        retryable: true,
    },
    {
        name: 'MongoDB network timeout',
        error: createDriverError('MongoNetworkTimeoutError'),
        expectedCode: 'CONNECTION_TIMEOUT',
        retryable: true,
    },
    {
        name: 'Host not found',
        error: createDriverError('ENOTFOUND'),
        expectedCode: 'HOST_UNREACHABLE',
        retryable: false,
    },
    {
        name: 'Temporary DNS resolution failure',
        error: createDriverError('EAI_AGAIN'),
        expectedCode: 'HOST_UNREACHABLE',
        retryable: false,
    },
    {
        name: 'Host unreachable',
        error: createDriverError('EHOSTUNREACH'),
        expectedCode: 'HOST_UNREACHABLE',
        retryable: false,
    },

    // Configuration
    {
        name: 'MongoDB URI parsing failure',
        error: createDriverError('MongoParseError'),
        expectedCode: 'INVALID_CONFIGURATION',
        retryable: false,
    },
    {
        name: 'PostgreSQL database does not exist',
        error: createDriverError('3D000'),
        expectedCode: 'INVALID_CONFIGURATION',
        retryable: false,
    },
    {
        name: 'MySQL database does not exist',
        error: createDriverError('ER_BAD_DB_ERROR'),
        expectedCode: 'INVALID_CONFIGURATION',
        retryable: false,
    },

    // Unknown
    {
        name: 'Unrecognized driver error',
        error: new Error('Unexpected database failure'),
        expectedCode: 'UNKNOWN',
        retryable: false,
    },
]

describe('Connection Error Mapping', () => {
    describe('error classification', () => {
        for (const testCase of cases) {
            it(testCase.name, () => {
                const result = toConnectionErrorDto(testCase.error)

                assert.equal(result.code, testCase.expectedCode)
                assert.equal(result.retryable, testCase.retryable)
                assert.ok(result.message.length > 0)
            })
        }
    })

    describe('nested errors', () => {
        it('classifies an underlying network error from cause', () => {
            const underlyingError = createDriverError('ETIMEDOUT')
            const wrappedError = new Error('Database connection failed', {
                cause: underlyingError,
            })

            const result = toConnectionErrorDto(wrappedError)

            assert.equal(result.code, 'CONNECTION_TIMEOUT')
            assert.equal(result.retryable, true)
        })
    })

    describe('safe error output', () => {
        it('does not expose raw driver error messages', () => {
            const rawMessage =
                'Access denied for user admin at internal-db.example.com'

            const result = toConnectionErrorDto(
                createDriverError('ER_ACCESS_DENIED_ERROR', rawMessage),
            )

            assert.equal(result.code, 'AUTHENTICATION_FAILED')
            assert.notEqual(result.message, rawMessage)
            assert.ok(!result.message.includes('internal-db.example.com'))
        })

        it('returns only the standardized DTO fields', () => {
            const result = toConnectionErrorDto(
                createDriverError('ECONNREFUSED'),
            )

            assert.deepEqual(
                Object.keys(result).sort(),
                ['code', 'message', 'retryable'],
            )
        })
    })
})