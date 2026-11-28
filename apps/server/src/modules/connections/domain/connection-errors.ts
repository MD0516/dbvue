
import type {
    ConnectionErrorCode,
    ConnectionErrorDto,
} from '@dbvue/shared'

/**
 * Safe, user-facing messages and retry policies for connection failures.
 */
const ERROR_DETAILS: Record<
    ConnectionErrorCode,
    Omit<ConnectionErrorDto, 'code'>
> = {
    AUTHENTICATION_FAILED: {
        message:
            'Database authentication failed. Check the username, password and authentication settings.',
        retryable: false,
    },

    CONNECTION_REFUSED: {
        message:
            'The database server refused the connection. Check that the server is running and accepting connections.',
        retryable: true,
    },

    HOST_UNREACHABLE: {
        message:
            'The database host could not be reached. Check the hostname, DNS and network connection.',
        retryable: false,
    },

    CONNECTION_TIMEOUT: {
        message:
            'The connection attempt timed out. Check the server availability and network settings.',
        retryable: true,
    },

    TLS_ERROR: {
        message:
            'The TLS connection could not be established. Check the TLS mode and certificate configuration.',
        retryable: false,
    },

    INVALID_CONFIGURATION: {
        message:
            'The connection configuration is invalid. Check the host, port, database name and connection options.',
        retryable: false,
    },

    UNKNOWN: {
        message:
            'An unexpected error occurred while connecting to the database.',
        retryable: false,
    },
}

/**
 * Properties commonly exposed by Node.js and database-driver errors.
 */
interface DriverError {
    code?: unknown
    codeName?: unknown
    name?: unknown

    cause?: unknown
    originalError?: unknown
    parent?: unknown
}

/**
 * Collects the original error and nested causes.
 *
 * Database drivers sometimes wrap Node.js network errors in
 * their own error classes. Inspecting nested causes allows
 * those errors to be classified correctly.
 */
function collectErrors(error: unknown): DriverError[] {
    const collected: DriverError[] = []
    const visited = new Set<object>()
    const pending: unknown[] = [error]

    while (pending.length > 0 && collected.length < 10) {
        const current = pending.shift()

        if (
            typeof current !== 'object' ||
            current === null ||
            visited.has(current)
        ) {
            continue
        }

        visited.add(current)

        const driverError = current as DriverError
        collected.push(driverError)

        pending.push(
            driverError.cause,
            driverError.originalError,
            driverError.parent,
        )
    }

    return collected
}

/**
 * Returns normalized error identifiers from a driver error.
 */
function getIdentifiers(errors: DriverError[]): string[] {
    const identifiers: string[] = []

    for (const error of errors) {
        for (const value of [
            error.code,
            error.codeName,
            error.name,
        ]) {
            if (typeof value === 'string' || typeof value === 'number') {
                identifiers.push(String(value).toUpperCase())
            }
        }
    }

    return identifiers
}

function matchesPrefix(
    identifiers: string[],
    prefixes: string[],
): boolean {
    return identifiers.some(identifier =>
        prefixes.some(prefix => identifier.startsWith(prefix)),
    )
}

/**
 * Classifies errors originating from MySQL, PostgreSQL, MongoDB
 * and their underlying Node.js network connections.
 */
function classifyError(error: unknown): ConnectionErrorCode {
    const errors = collectErrors(error)
    const identifiers = getIdentifiers(errors)

    // Authentication errors
    if (
        identifiers.some(identifier =>
            [
                'ER_ACCESS_DENIED_ERROR',
                'ER_DBACCESS_DENIED_ERROR',
                'AUTHENTICATIONFAILED',
                'AUTHENTICATION_FAILED',
            ].includes(identifier),
        ) ||
        identifiers.some(identifier =>
            identifier === '18' || /^28[A-Z0-9]{3}$/.test(identifier),
        )
    ) {
        return 'AUTHENTICATION_FAILED'
    }

    // TLS and certificate errors
    if (
        matchesPrefix(identifiers, [
            'ERR_TLS_',
            'ERR_SSL_',
            'ERR_OSSL_',
            'CERT_',
            'SELF_SIGNED_CERT',
            'UNABLE_TO_VERIFY',
            'DEPTH_ZERO_SELF_SIGNED',
        ]) ||
        identifiers.some(identifier =>
            [
                'ERR_TLS_CERT_ALTNAME_INVALID',
                'ERR_TLS_CERTIFICATE_REQUIRED',
                'ERR_SSL_WRONG_VERSION_NUMBER',
            ].includes(identifier),
        )
    ) {
        return 'TLS_ERROR'
    }

    // Connection timeout errors
    if (
        identifiers.some(identifier =>
            [
                'ETIMEDOUT',
                'ESOCKETTIMEDOUT',
                'ETIME',
                'MONGONETWORKTIMEOUTERROR',
                'MONGOSERVERSELECTIONERROR',
                'MONGOWAITQUEUETIMEOUTERROR',
            ].includes(identifier),
        )
    ) {
        return 'CONNECTION_TIMEOUT'
    }

    // Connection refused
    if (identifiers.includes('ECONNREFUSED')) {
        return 'CONNECTION_REFUSED'
    }

    // Host and network resolution errors
    if (
        identifiers.some(identifier =>
            [
                'ENOTFOUND',
                'EAI_AGAIN',
                'EHOSTUNREACH',
                'ENETUNREACH',
                'ENETDOWN',
                'EHOSTDOWN',
            ].includes(identifier),
        )
    ) {
        return 'HOST_UNREACHABLE'
    }

    // Invalid configuration and database selection errors
    if (
        identifiers.some(identifier =>
            [
                'MONGOPARSEERROR',
                'MONGOINVALIDARGUMENTERROR',
                'ERR_INVALID_ARG_TYPE',
                'ERR_INVALID_URL',
                'ER_BAD_DB_ERROR',
                '3D000',
            ].includes(identifier),
        )
    ) {
        return 'INVALID_CONFIGURATION'
    }

    return 'UNKNOWN'
}

/**
 * Converts a raw database-driver error into a standardized
 * and safe API-compatible connection error.
 *
 * Raw driver messages are deliberately not exposed.
 */
export function toConnectionErrorDto(
    error: unknown,
): ConnectionErrorDto {
    const code = classifyError(error)

    return {
        code,
        ...ERROR_DETAILS[code],
    }
}
