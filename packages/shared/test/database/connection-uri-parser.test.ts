import assert from 'node:assert/strict'
import test from 'node:test'

import { parseConnectionUri } from '../../src/database/connection-uri-parser.js'

test('parses MySQL URI and keeps password outside config', () => {
    const result = parseConnectionUri({
        engine: 'mysql',
        uri: 'mysql://app%40user:p%40ss%3Aword@localhost:3307/appdb?charset=utf8mb4&connectTimeout=5000&multipleStatements=true',
    })

    assert.equal(result.success, true)
    if (!result.success) return

    assert.equal(result.draft.config.engine, 'mysql')
    if (result.draft.config.engine !== 'mysql') return

    assert.deepEqual(result.draft.config.address, {
        type: 'tcp',
        host: 'localhost',
        port: 3307,
    })
    assert.equal(result.draft.config.username, 'app@user')
    assert.equal(result.draft.config.database, 'appdb')
    assert.equal(result.draft.config.options.charset, 'utf8mb4')
    assert.equal(result.draft.config.options.connectTimeoutMs, 5000)
    assert.equal(result.draft.config.options.multipleStatements, true)
    assert.deepEqual(result.draft.credentials, { password: 'p@ss:word' })
    assert.equal(JSON.stringify(result.draft.config).includes('p@ss:word'), false)
})

test('parses PostgreSQL postgres:// alias, TLS mode and second-based connect timeout', () => {
    const result = parseConnectionUri({
        engine: 'postgres',
        uri: 'postgres://api:secret@db.example.com:5433/service?sslmode=verify-full&connect_timeout=8&application_name=dbvue',
    })

    assert.equal(result.success, true)
    if (!result.success) return

    assert.equal(result.draft.config.engine, 'postgres')
    if (result.draft.config.engine !== 'postgres') return

    assert.deepEqual(result.draft.config.tls, { mode: 'verify-full' })
    assert.equal(result.draft.config.pool.connectionTimeoutMs, 8000)
    assert.equal(result.draft.config.options.applicationName, 'dbvue')
    assert.deepEqual(result.draft.credentials, { password: 'secret' })
})

test('parses PostgreSQL URI without a password', () => {
    const result = parseConnectionUri({
        engine: 'postgres',
        uri: 'postgresql://readonly@localhost/catalog',
    })

    assert.equal(result.success, true)
    if (!result.success) return

    assert.equal(result.draft.config.engine, 'postgres')
    assert.equal(result.draft.credentials, undefined)
})

test('parses MongoDB seed-list hosts and write concern', () => {
    const result = parseConnectionUri({
        engine: 'mongodb',
        uri: 'mongodb://worker:secret@mongo-a:27017,mongo-b:27018/orders?replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=true&w=majority&journal=true&wtimeoutMS=5000',
    })

    assert.equal(result.success, true)
    if (!result.success) return

    assert.equal(result.draft.config.engine, 'mongodb')
    if (result.draft.config.engine !== 'mongodb') return

    assert.deepEqual(result.draft.config.address, {
        type: 'seed-list',
        hosts: [
            { host: 'mongo-a', port: 27017 },
            { host: 'mongo-b', port: 27018 },
        ],
    })
    assert.equal(result.draft.config.options.replicaSet, 'rs0')
    assert.equal(result.draft.config.options.readPreference, 'secondaryPreferred')
    assert.deepEqual(result.draft.config.options.writeConcern, {
        w: 'majority',
        journal: true,
        timeoutMs: 5000,
    })
    assert.deepEqual(result.draft.credentials, { password: 'secret' })
})

test('parses MongoDB SRV URI and applies the SRV TLS default', () => {
    const result = parseConnectionUri({
        engine: 'mongodb',
        uri: 'mongodb+srv://cluster-user:secret@cluster.example.com/app?retryWrites=true&w=majority',
    })

    assert.equal(result.success, true)
    if (!result.success) return

    assert.equal(result.draft.config.engine, 'mongodb')
    if (result.draft.config.engine !== 'mongodb') return

    assert.deepEqual(result.draft.config.address, {
        type: 'srv',
        hostname: 'cluster.example.com',
    })
    assert.deepEqual(result.draft.config.tls, { mode: 'required' })
    assert.equal(result.draft.config.database, 'app')
})

test('allows MongoDB SRV URI to explicitly disable TLS', () => {
    const result = parseConnectionUri({
        engine: 'mongodb',
        uri: 'mongodb+srv://cluster.example.com/app?tls=false',
    })

    assert.equal(result.success, true)
    if (!result.success) return

    assert.equal(result.draft.config.engine, 'mongodb')
    if (result.draft.config.engine !== 'mongodb') return
    assert.equal(result.draft.config.tls, undefined)
})

test('reports unsupported query parameters rather than silently discarding them', () => {
    const result = parseConnectionUri({
        engine: 'mysql',
        uri: 'mysql://root@localhost/db?allowPublicKeyRetrieval=true',
    })

    assert.equal(result.success, false)
    if (result.success) return
    assert.equal(result.issues[0]?.code, 'UNSUPPORTED_OPTION')
    assert.equal(result.issues[0]?.parameter, 'allowPublicKeyRetrieval')
})

test('rejects a URI whose scheme does not match the selected engine', () => {
    const result = parseConnectionUri({
        engine: 'mysql',
        uri: 'postgresql://user:pass@localhost/db',
    })

    assert.equal(result.success, false)
    if (result.success) return
    assert.equal(result.issues[0]?.code, 'INVALID_URI')
})

test('rejects duplicate query parameters', () => {
    const result = parseConnectionUri({
        engine: 'mongodb',
        uri: 'mongodb://localhost/db?retryWrites=true&retryWrites=false',
    })

    assert.equal(result.success, false)
    if (result.success) return
    assert.equal(result.issues[0]?.code, 'INVALID_URI')
})

test('rejects invalid ports', () => {
    const result = parseConnectionUri({
        engine: 'mysql',
        uri: 'mysql://root@localhost:70000/db',
    })

    assert.equal(result.success, false)
    if (result.success) return
    assert.ok(result.issues.length > 0)
})

test('rejects an SRV URI with an explicit port', () => {
    const result = parseConnectionUri({
        engine: 'mongodb',
        uri: 'mongodb+srv://cluster.example.com:27017/app',
    })

    assert.equal(result.success, false)
    if (result.success) return
    assert.equal(result.issues[0]?.parameter, 'port')
})

test('rejects malformed percent-encoding', () => {
    const result = parseConnectionUri({
        engine: 'postgres',
        uri: 'postgresql://user:bad%2@localhost/db',
    })

    assert.equal(result.success, false)
    if (result.success) return
    assert.equal(result.issues[0]?.code, 'INVALID_URI')
})
