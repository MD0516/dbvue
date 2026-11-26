import {
    ConnectionDraftSchema,
    ConnectionUriInputSchema,
    type ConnectionDraft,
    type ConnectionUriInput,
    type ConnectionUriParseIssue,
} from './connection-uri.js'

/**
 * A successful parse contains a normalized connection draft. Credentials are
 * deliberately returned separately from the connection configuration.
 */
export type ConnectionUriParseResult =
    | {
        success: true
        draft: ConnectionDraft
    }
    | {
        success: false
        issues: ConnectionUriParseIssue[]
    }

type QueryParameters = Map<string, { originalKey: string; value: string }>

class UriParseFailure extends Error {
    constructor(readonly issues: ConnectionUriParseIssue[]) {
        super(issues.map((issue) => issue.message).join('; '))
        this.name = 'UriParseFailure'
    }
}

function fail(
    code: ConnectionUriParseIssue['code'],
    message: string,
    parameter?: string,
): never {
    throw new UriParseFailure([{
        code,
        message,
        ...(parameter ? { parameter } : {}),
    }])
}

function decodeComponent(value: string, parameter: string): string {
    try {
        return decodeURIComponent(value)
    } catch {
        return fail(
            'INVALID_URI',
            `The ${parameter} contains invalid percent-encoding.`,
            parameter,
        )
    }
}

function decodeDatabasePath(pathname: string): string | undefined {
    if (!pathname || pathname === '/') return undefined

    const encodedName = pathname.startsWith('/')
        ? pathname.slice(1)
        : pathname

    if (!encodedName || encodedName.includes('/')) {
        return fail(
            'INVALID_URI',
            'The URI must contain at most one database path segment.',
            'database',
        )
    }

    const database = decodeComponent(encodedName, 'database')
    return database.length > 0 ? database : undefined
}

function parseQueryParameters(search: string): QueryParameters {
    const parameters: QueryParameters = new Map()
    const searchParams = new URLSearchParams(search)

    for (const [originalKey, value] of searchParams.entries()) {
        const key = originalKey.toLowerCase()

        if (!key) {
            fail('INVALID_URI', 'The URI contains an empty query parameter name.')
        }

        if (parameters.has(key)) {
            fail(
                'INVALID_URI',
                `The query parameter "${originalKey}" is provided more than once.`,
                originalKey,
            )
        }

        parameters.set(key, { originalKey, value })
    }

    return parameters
}

function takeParameter(
    parameters: QueryParameters,
    ...aliases: string[]
): { originalKey: string; value: string } | undefined {
    const matches = aliases
        .map((alias) => alias.toLowerCase())
        .filter((alias) => parameters.has(alias))

    if (matches.length > 1) {
        fail(
            'INVALID_URI',
            `Use only one of these equivalent parameters: ${aliases.join(', ')}.`,
            matches.join(', '),
        )
    }

    const key = matches[0]
    if (!key) return undefined

    const parameter = parameters.get(key)
    parameters.delete(key)
    return parameter
}

function unsupportedParameters(parameters: QueryParameters): never | void {
    if (parameters.size === 0) return

    const issues: ConnectionUriParseIssue[] = [...parameters.values()].map(
        ({ originalKey }) => ({
            code: 'UNSUPPORTED_OPTION',
            parameter: originalKey,
            message: `The URI option "${originalKey}" is not supported by dbvue's connection configuration.`,
        }),
    )

    throw new UriParseFailure(issues)
}

function parseBoolean(value: string, parameter: string): boolean {
    switch (value.trim().toLowerCase()) {
        case 'true':
        case '1':
        case 'yes':
            return true
        case 'false':
        case '0':
        case 'no':
            return false
        default:
            return fail(
                'INVALID_VALUE',
                `The value for "${parameter}" must be true or false.`,
                parameter,
            )
    }
}

function parseInteger(
    value: string,
    parameter: string,
    options: { min?: number; max?: number; multiplier?: number } = {},
): number {
    if (!/^\d+$/.test(value.trim())) {
        return fail(
            'INVALID_VALUE',
            `The value for "${parameter}" must be a non-negative integer.`,
            parameter,
        )
    }

    const parsed = Number(value) * (options.multiplier ?? 1)
    const min = options.min ?? 0
    const max = options.max ?? Number.MAX_SAFE_INTEGER

    if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
        return fail(
            'INVALID_VALUE',
            `The value for "${parameter}" must be between ${min} and ${max}.`,
            parameter,
        )
    }

    return parsed
}

/** Parse a non-negative duration. Bare values use the supplied default unit. */
function parseDurationMs(
    value: string,
    parameter: string,
    defaultUnit: 'ms' | 'seconds' = 'ms',
): number {
    const match = /^(\d+)(ms|s|sec|seconds|min|minutes)?$/i.exec(value.trim())
    if (!match) {
        return fail(
            'INVALID_VALUE',
            `The value for "${parameter}" must be an integer duration (for example 5000, 5s or 250ms).`,
            parameter,
        )
    }

    const amount = Number(match[1])
    const unit = match[2]?.toLowerCase() ?? defaultUnit
    const multiplier = unit === 'ms'
        ? 1
        : unit === 'min' || unit === 'minutes'
            ? 60_000
            : 1_000

    const result = amount * multiplier
    if (!Number.isSafeInteger(result) || result > 600_000) {
        return fail(
            'INVALID_VALUE',
            `The value for "${parameter}" exceeds the supported timeout range (0–600000 ms).`,
            parameter,
        )
    }

    return result
}

function parseTlsMode(parameters: QueryParameters): { mode: 'required' | 'verify-ca' | 'verify-full' } | undefined {
    const tls = takeParameter(parameters, 'tls')
    const ssl = takeParameter(parameters, 'ssl')
    const sslMode = takeParameter(parameters, 'sslmode', 'ssl-mode')

    if (tls && ssl) {
        const tlsValue = parseBoolean(tls.value, tls.originalKey)
        const sslValue = parseBoolean(ssl.value, ssl.originalKey)
        if (tlsValue !== sslValue) {
            fail('INVALID_VALUE', 'The tls and ssl parameters conflict.', 'tls/ssl')
        }
    }

    if ((tls || ssl) && sslMode) {
        fail('INVALID_VALUE', 'Use either tls/ssl or sslmode, not both.', 'tls/sslmode')
    }

    if (sslMode) {
        switch (sslMode.value.toLowerCase()) {
            case 'disable':
            case 'disabled':
                return undefined
            case 'require':
            case 'required':
                return { mode: 'required' }
            case 'verify-ca':
                return { mode: 'verify-ca' }
            case 'verify-full':
            case 'verify_identity':
                return { mode: 'verify-full' }
            default:
                return fail(
                    'UNSUPPORTED_OPTION',
                    `The TLS mode "${sslMode.value}" cannot be represented by dbvue's TLS configuration.`,
                    sslMode.originalKey,
                )
        }
    }

    const enabledParameter = tls ?? ssl
    if (!enabledParameter) return undefined

    return parseBoolean(enabledParameter.value, enabledParameter.originalKey)
        ? { mode: 'required' }
        : undefined
}

function readString(
    parameters: QueryParameters,
    target: Record<string, unknown>,
    targetKey: string,
    ...aliases: string[]
): void {
    const parameter = takeParameter(parameters, ...aliases)
    if (parameter) target[targetKey] = parameter.value
}

function readBoolean(
    parameters: QueryParameters,
    target: Record<string, unknown>,
    targetKey: string,
    ...aliases: string[]
): void {
    const parameter = takeParameter(parameters, ...aliases)
    if (parameter) target[targetKey] = parseBoolean(parameter.value, parameter.originalKey)
}

function readInteger(
    parameters: QueryParameters,
    target: Record<string, unknown>,
    targetKey: string,
    aliases: string[],
    min = 0,
    max = Number.MAX_SAFE_INTEGER,
): void {
    const parameter = takeParameter(parameters, ...aliases)
    if (parameter) {
        target[targetKey] = parseInteger(parameter.value, parameter.originalKey, { min, max })
    }
}

function readDuration(
    parameters: QueryParameters,
    target: Record<string, unknown>,
    targetKey: string,
    aliases: string[],
    defaultUnit: 'ms' | 'seconds' = 'ms',
): void {
    const parameter = takeParameter(parameters, ...aliases)
    if (parameter) {
        target[targetKey] = parseDurationMs(
            parameter.value,
            parameter.originalKey,
            defaultUnit,
        )
    }
}

function decodeUserInfo(
    username: string,
    password: string,
    parameter = 'credentials',
): { username: string; password?: string } {
    const decodedUsername = decodeComponent(username, `${parameter} username`)
    const decodedPassword = password.length > 0
        ? decodeComponent(password, `${parameter} password`)
        : undefined

    return {
        username: decodedUsername,
        ...(decodedPassword !== undefined ? { password: decodedPassword } : {}),
    }
}

function parseStandardUrl(uri: string, protocols: readonly string[]): URL {
    let url: URL
    try {
        url = new URL(uri)
    } catch {
        return fail('INVALID_URI', 'The connection URI is malformed.')
    }

    if (!protocols.includes(url.protocol.toLowerCase())) {
        return fail(
            'INVALID_URI',
            `Expected one of these URI schemes: ${protocols.map((protocol) => protocol.replace(':', '')).join(', ')}.`,
            'scheme',
        )
    }

    if (uri.includes('#')) {
        return fail('INVALID_URI', 'URI fragments are not supported.')
    }

    if (!url.hostname) {
        return fail('INVALID_URI', 'A hostname is required.', 'host')
    }

    return url
}

function normalizeHostname(hostname: string): string {
    // WHATWG URL preserves square brackets around IPv6 literals in hostname.
    return hostname.startsWith('[') && hostname.endsWith(']')
        ? hostname.slice(1, -1)
        : hostname
}

function parseMySqlUri(uri: string): unknown {
    const url = parseStandardUrl(uri, ['mysql:'])
    const userInfo = decodeUserInfo(url.username, url.password, 'MySQL URI')

    if (!userInfo.username) {
        fail('INVALID_VALUE', 'A username is required for MySQL connections.', 'username')
    }

    const parameters = parseQueryParameters(url.search)
    const tls = parseTlsMode(parameters)
    const options: Record<string, unknown> = {}
    const pool: Record<string, unknown> = {}

    readDuration(parameters, options, 'connectTimeoutMs', ['connecttimeout', 'connecttimeoutms'])
    readString(parameters, options, 'charset', 'charset')
    readString(parameters, options, 'timezone', 'timezone')
    readBoolean(parameters, options, 'enableKeepAlive', 'enablekeepalive')
    readDuration(parameters, options, 'keepAliveInitialDelayMs', ['keepaliveinitialdelay', 'keepaliveinitialdelayms'])
    readBoolean(parameters, options, 'supportBigNumbers', 'supportbignumbers')
    readBoolean(parameters, options, 'bigNumberStrings', 'bignumberstrings')
    readBoolean(parameters, options, 'decimalNumbers', 'decimalnumbers')
    readBoolean(parameters, options, 'namedPlaceholders', 'namedplaceholders')
    readBoolean(parameters, options, 'multipleStatements', 'multiplestatements')

    const dateStrings = takeParameter(parameters, 'datestrings')
    if (dateStrings) {
        const normalized = dateStrings.value.trim().toLowerCase()
        if (normalized === 'true' || normalized === 'false' || normalized === '1' || normalized === '0') {
            options.dateStrings = parseBoolean(normalized, dateStrings.originalKey)
        } else {
            const values = dateStrings.value.split(',').map((value) => value.trim().toUpperCase())
            const allowed = new Set(['DATE', 'DATETIME', 'TIMESTAMP'])
            if (values.length === 0 || values.some((value) => !allowed.has(value))) {
                fail('INVALID_VALUE', 'dateStrings must be a boolean or a comma-separated list of DATE, DATETIME and TIMESTAMP.', dateStrings.originalKey)
            }
            options.dateStrings = values
        }
    }

    readInteger(parameters, pool, 'connectionLimit', ['connectionlimit'], 1, 1000)
    readInteger(parameters, pool, 'maxIdle', ['maxidle'], 0, 1000)
    readDuration(parameters, pool, 'idleTimeoutMs', ['idletimeout', 'idletimeoutms'])
    readBoolean(parameters, pool, 'waitForConnections', 'waitforconnections')
    readInteger(parameters, pool, 'queueLimit', ['queuelimit'], 0, 100_000)

    unsupportedParameters(parameters)

    const database = decodeDatabasePath(url.pathname)
    const config = {
        engine: 'mysql',
        address: {
            type: 'tcp',
            host: normalizeHostname(url.hostname),
            port: url.port ? Number(url.port) : 3306,
        },
        username: userInfo.username,
        ...(database ? { database } : {}),
        ...(tls ? { tls } : {}),
        options,
        pool,
    }

    return {
        config,
        ...(userInfo.password !== undefined ? { credentials: { password: userInfo.password } } : {}),
    }
}

function parsePostgresUri(uri: string): unknown {
    const url = parseStandardUrl(uri, ['postgres:', 'postgresql:'])
    const userInfo = decodeUserInfo(url.username, url.password, 'PostgreSQL URI')

    if (!userInfo.username) {
        fail('INVALID_VALUE', 'A username is required for PostgreSQL connections.', 'username')
    }

    const parameters = parseQueryParameters(url.search)
    const tls = parseTlsMode(parameters)
    const options: Record<string, unknown> = {}
    const pool: Record<string, unknown> = {}

    readString(parameters, options, 'applicationName', 'application_name', 'applicationname')
    readBoolean(parameters, options, 'keepAlive', 'keepalives', 'keepalive')
    readDuration(parameters, options, 'keepAliveInitialDelayMs', ['keepalives_idle', 'keepaliveinitialdelayms'], 'seconds')
    readDuration(parameters, options, 'statementTimeoutMs', ['statement_timeout', 'statementtimeoutms'])
    readDuration(parameters, options, 'queryTimeoutMs', ['query_timeout', 'querytimeoutms'])
    readDuration(parameters, options, 'lockTimeoutMs', ['lock_timeout', 'locktimeoutms'])
    readDuration(parameters, options, 'idleInTransactionSessionTimeoutMs', ['idle_in_transaction_session_timeout', 'idleintransactionsessiontimeoutms'])
    readString(parameters, options, 'clientEncoding', 'client_encoding', 'clientencoding')
    readString(parameters, options, 'timezone', 'timezone')

    // PostgreSQL libpq's connect_timeout is expressed in seconds.
    const connectTimeout = takeParameter(parameters, 'connect_timeout')
    const connectionTimeoutMillis = takeParameter(parameters, 'connectiontimeoutmillis')
    if (connectTimeout && connectionTimeoutMillis) {
        fail('INVALID_URI', 'Use only one of connect_timeout or connectionTimeoutMillis.', 'connect_timeout')
    }
    if (connectTimeout) {
        pool.connectionTimeoutMs = parseDurationMs(connectTimeout.value, connectTimeout.originalKey, 'seconds')
    } else if (connectionTimeoutMillis) {
        pool.connectionTimeoutMs = parseDurationMs(connectionTimeoutMillis.value, connectionTimeoutMillis.originalKey)
    }
    readInteger(parameters, pool, 'max', ['pool_max', 'max'], 1, 1000)
    readInteger(parameters, pool, 'min', ['pool_min', 'min'], 0, 1000)
    readDuration(parameters, pool, 'idleTimeoutMs', ['idle_timeout', 'idletimeoutms'])
    readInteger(parameters, pool, 'maxLifetimeSeconds', ['max_lifetime_seconds', 'maxlifetimeseconds'], 0)
    readInteger(parameters, pool, 'maxUses', ['max_uses', 'maxuses'], 1)

    unsupportedParameters(parameters)

    const database = decodeDatabasePath(url.pathname)
    const config = {
        engine: 'postgres',
        address: {
            type: 'tcp',
            host: normalizeHostname(url.hostname),
            port: url.port ? Number(url.port) : 5432,
        },
        username: userInfo.username,
        ...(database ? { database } : {}),
        ...(tls ? { tls } : {}),
        options,
        pool,
    }

    return {
        config,
        ...(userInfo.password !== undefined ? { credentials: { password: userInfo.password } } : {}),
    }
}

function splitMongoAuthority(uri: string): {
    authority: string
    pathAndSearch: string
    scheme: 'mongodb' | 'mongodb+srv'
} {
    const match = /^(mongodb(?:\+srv)?):\/\//i.exec(uri)
    if (!match) return fail('INVALID_URI', 'Expected a mongodb:// or mongodb+srv:// URI.', 'scheme')

    const scheme = match[1]?.toLowerCase()
    if (scheme !== 'mongodb' && scheme !== 'mongodb+srv') {
        return fail('INVALID_URI', 'Unsupported MongoDB URI scheme.', 'scheme')
    }

    const remainder = uri.slice(match[0].length)
    const authorityEnd = remainder.search(/[/?#]/)
    const authority = authorityEnd === -1 ? remainder : remainder.slice(0, authorityEnd)
    const pathAndSearch = authorityEnd === -1 ? '' : remainder.slice(authorityEnd)

    if (!authority) return fail('INVALID_URI', 'A MongoDB host is required.', 'host')
    if (pathAndSearch.includes('#')) return fail('INVALID_URI', 'URI fragments are not supported.')

    return { authority, pathAndSearch, scheme }
}

function parseMongoHost(entry: string): {
    host: string
    port: number
    hasExplicitPort: boolean
} {
    const value = entry.trim()
    if (!value) return fail('INVALID_URI', 'A MongoDB seed host cannot be empty.', 'host')

    let host: string
    let portValue: string | undefined

    if (value.startsWith('[')) {
        const closingBracket = value.indexOf(']')
        if (closingBracket === -1) {
            return fail('INVALID_URI', `Invalid IPv6 seed host "${value}".`, 'host')
        }

        host = value.slice(1, closingBracket)
        const suffix = value.slice(closingBracket + 1)
        if (suffix) {
            if (!suffix.startsWith(':') || suffix.length === 1) {
                return fail('INVALID_URI', `Invalid port in MongoDB seed host "${value}".`, 'port')
            }
            portValue = suffix.slice(1)
        }
    } else {
        const colonCount = (value.match(/:/g) ?? []).length
        if (colonCount > 1) {
            return fail('INVALID_URI', 'IPv6 MongoDB seed hosts must be enclosed in square brackets.', 'host')
        }

        if (colonCount === 1) {
            const separator = value.lastIndexOf(':')
            host = value.slice(0, separator)
            portValue = value.slice(separator + 1)
        } else {
            host = value
        }
    }

    if (!host || /\s/.test(host) || host.includes('@')) {
        return fail('INVALID_URI', `Invalid MongoDB seed host "${value}".`, 'host')
    }

    return {
        host,
        port: portValue === undefined ? 27017 : parseInteger(portValue, 'port', { min: 1, max: 65535 }),
        hasExplicitPort: portValue !== undefined,
    }
}

function parseMongoUri(uri: string): unknown {
    const { authority, pathAndSearch, scheme } = splitMongoAuthority(uri)

    const atIndex = authority.lastIndexOf('@')
    const userInfoRaw = atIndex >= 0 ? authority.slice(0, atIndex) : undefined
    const hostsRaw = atIndex >= 0 ? authority.slice(atIndex + 1) : authority

    if (atIndex !== authority.indexOf('@')) {
        return fail('INVALID_URI', 'Reserved @ characters in credentials must be percent-encoded.', 'credentials')
    }

    let username: string | undefined
    let password: string | undefined

    if (userInfoRaw !== undefined) {
        const separator = userInfoRaw.indexOf(':')
        const rawUsername = separator === -1 ? userInfoRaw : userInfoRaw.slice(0, separator)
        const rawPassword = separator === -1 ? '' : userInfoRaw.slice(separator + 1)
        const decoded = decodeUserInfo(rawUsername, rawPassword, 'MongoDB URI')
        username = decoded.username
        password = decoded.password

        if (!username) {
            return fail('INVALID_VALUE', 'A password cannot be supplied without a username.', 'username')
        }
    }

    if (!hostsRaw) return fail('INVALID_URI', 'A MongoDB host is required.', 'host')

    const questionIndex = pathAndSearch.indexOf('?')
    const rawPath = questionIndex === -1 ? pathAndSearch : pathAndSearch.slice(0, questionIndex)
    const search = questionIndex === -1 ? '' : pathAndSearch.slice(questionIndex)
    const database = decodeDatabasePath(rawPath)
    const parameters = parseQueryParameters(search)
    const options: Record<string, unknown> = {}
    const pool: Record<string, unknown> = {}

    const tlsParameter = takeParameter(parameters, 'tls')
    const sslParameter = takeParameter(parameters, 'ssl')
    if (tlsParameter && sslParameter) {
        const tlsValue = parseBoolean(tlsParameter.value, tlsParameter.originalKey)
        const sslValue = parseBoolean(sslParameter.value, sslParameter.originalKey)
        if (tlsValue !== sslValue) {
            fail('INVALID_VALUE', 'The tls and ssl parameters conflict.', 'tls/ssl')
        }
    }

    const explicitTls = tlsParameter ?? sslParameter
    const tlsEnabled = explicitTls
        ? parseBoolean(explicitTls.value, explicitTls.originalKey)
        : scheme === 'mongodb+srv'

    const tls = tlsEnabled ? { mode: 'required' as const } : undefined

    readString(parameters, options, 'appName', 'appname')
    readString(parameters, options, 'authSource', 'authsource')
    readString(parameters, options, 'authMechanism', 'authmechanism')
    readString(parameters, options, 'replicaSet', 'replicaset')
    readBoolean(parameters, options, 'directConnection', 'directconnection')
    readBoolean(parameters, options, 'retryReads', 'retryreads')
    readBoolean(parameters, options, 'retryWrites', 'retrywrites')
    readDuration(parameters, options, 'connectTimeoutMs', ['connecttimeoutms'])
    readDuration(parameters, options, 'serverSelectionTimeoutMs', ['serverselectiontimeoutms'])
    readDuration(parameters, options, 'socketTimeoutMs', ['sockettimeoutms'])
    readString(parameters, options, 'readPreference', 'readpreference')
    readString(parameters, options, 'readConcernLevel', 'readconcernlevel')

    const writeConcern: Record<string, unknown> = {}
    const writeConcernW = takeParameter(parameters, 'w')
    if (writeConcernW) {
        const value = writeConcernW.value.trim()
        writeConcern.w = /^\d+$/.test(value)
            ? parseInteger(value, writeConcernW.originalKey, { min: 0 })
            : value
    }

    readBoolean(parameters, writeConcern, 'journal', 'journal')
    readDuration(parameters, writeConcern, 'timeoutMs', ['wtimeoutms', 'wtimeout'])
    if (Object.keys(writeConcern).length > 0) options.writeConcern = writeConcern

    readInteger(parameters, pool, 'maxPoolSize', ['maxpoolsize'], 1, 1000)
    readInteger(parameters, pool, 'minPoolSize', ['minpoolsize'], 0, 1000)
    readInteger(parameters, pool, 'maxConnecting', ['maxconnecting'], 1, 100)
    readDuration(parameters, pool, 'maxIdleTimeMs', ['maxidletimems'])
    readDuration(parameters, pool, 'waitQueueTimeoutMs', ['waitqueuetimeoutms'])

    unsupportedParameters(parameters)

    let address: Record<string, unknown>
    if (scheme === 'mongodb+srv') {
        if (hostsRaw.includes(',')) {
            fail('INVALID_URI', 'MongoDB SRV URIs must contain exactly one hostname.', 'host')
        }

        const parsedHost = parseMongoHost(hostsRaw)
        if (parsedHost.hasExplicitPort) {
            fail('INVALID_URI', 'MongoDB SRV URIs must not specify a port.', 'port')
        }
        if (parsedHost.host.includes(':') || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(parsedHost.host)) {
            fail('INVALID_URI', 'MongoDB SRV URIs require a DNS hostname, not an IP address.', 'host')
        }

        address = { type: 'srv', hostname: parsedHost.host }
    } else {
        const hosts = hostsRaw.split(',').map(parseMongoHost)
        address = {
            type: 'seed-list',
            hosts: hosts.map(({ host, port }) => ({ host, port })),
        }
    }

    const config = {
        engine: 'mongodb',
        address,
        ...(database ? { database } : {}),
        ...(username ? { username } : {}),
        ...(tls ? { tls } : {}),
        options,
        pool,
    }

    return {
        config,
        ...(password !== undefined ? { credentials: { password } } : {}),
    }
}

function mapZodIssues(
    issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
): ConnectionUriParseIssue[] {
    return issues.map((issue) => {
        const parameter = issue.path.map(String).join('.')
        return {
            code: 'INVALID_VALUE',
            message: parameter ? `${parameter}: ${issue.message}` : issue.message,
            ...(parameter ? { parameter } : {}),
        }
    })
}

/**
 * Parses a database connection URI into dbvue's normalized config/credentials
 * draft. It never returns the raw URI and never puts passwords in `config`.
 *
 * Unsupported query options are reported instead of silently discarded.
 */
export function parseConnectionUri(
    input: ConnectionUriInput,
): ConnectionUriParseResult {
    const parsedInput = ConnectionUriInputSchema.safeParse(input)
    if (!parsedInput.success) {
        return {
            success: false,
            issues: mapZodIssues(parsedInput.error.issues),
        }
    }

    // Reject malformed percent escapes before WHATWG URLSearchParams can
    // silently replace malformed sequences with replacement characters.
    try {
        // Also validate percent-encoded UTF-8 sequences, which URLSearchParams
        // otherwise replaces silently. The decoded string is never used.
        decodeURIComponent(parsedInput.data.uri)
    } catch {
        return {
            success: false,
            issues: [{
                code: 'INVALID_URI',
                message: 'The URI contains invalid percent-encoding or UTF-8.',
            }],
        }
    }

    if (/%(?![\da-f]{2})/i.test(parsedInput.data.uri)) {
        return {
            success: false,
            issues: [{
                code: 'INVALID_URI',
                message: 'The URI contains an invalid percent-encoding sequence.',
            }],
        }
    }

    try {
        const draft = parsedInput.data.engine === 'mysql'
            ? parseMySqlUri(parsedInput.data.uri)
            : parsedInput.data.engine === 'postgres'
                ? parsePostgresUri(parsedInput.data.uri)
                : parseMongoUri(parsedInput.data.uri)

        const validatedDraft = ConnectionDraftSchema.safeParse(draft)
        if (!validatedDraft.success) {
            return {
                success: false,
                issues: mapZodIssues(validatedDraft.error.issues),
            }
        }

        return {
            success: true,
            draft: validatedDraft.data,
        }
    } catch (error) {
        if (error instanceof UriParseFailure) {
            return { success: false, issues: error.issues }
        }

        return {
            success: false,
            issues: [{
                code: 'INVALID_URI',
                message: 'The connection URI could not be parsed.',
            }],
        }
    }
}
