
import assert from 'node:assert/strict'
import test, { describe } from 'node:test'

import type { DatabaseEngine } from '@dbvue/shared'

import {
    AdapterRegistry,
    MysqlAdapter,
    PostgresAdapter,
    MongoDBAdapter,
} from '../../../../dist/modules/connections/adapters/index.js'

describe('Adapter Registry', () => {
    const adapters = {
        mysql: new MysqlAdapter(),
        postgres: new PostgresAdapter(),
        mongodb: new MongoDBAdapter(),
    }

    const registry = new AdapterRegistry(adapters)

    test('resolves the MySQL adapter', () => {
        const adapter: MysqlAdapter = registry.get('mysql')

        assert.strictEqual(adapter, adapters.mysql)
        assert.equal(adapter.engine, 'mysql')
    })

    test('resolves the PostgreSQL adapter', () => {
        const adapter: PostgresAdapter = registry.get('postgres')

        assert.strictEqual(adapter, adapters.postgres)
        assert.equal(adapter.engine, 'postgres')
    })

    test('resolves the MongoDB adapter', () => {
        const adapter: MongoDBAdapter = registry.get('mongodb')

        assert.strictEqual(adapter, adapters.mongodb)
        assert.equal(adapter.engine, 'mongodb')
    })

    test('preserves the registered adapter instances', () => {
        assert.strictEqual(registry.get('mysql'), adapters.mysql)
        assert.strictEqual(registry.get('postgres'), adapters.postgres)
        assert.strictEqual(registry.get('mongodb'), adapters.mongodb)
    })

    test('rejects an adapter registered under the wrong engine', () => {
        const invalidAdapters = {
            mysql: new PostgresAdapter(),
            postgres: new PostgresAdapter(),
            mongodb: new MongoDBAdapter(),
        } as unknown as typeof adapters

        assert.throws(
            () => new AdapterRegistry(invalidAdapters),
            /Adapter registered for "mysql" has engine "postgres"/,
        )
    })

    test('rejects a missing adapter at runtime', () => {
        const incompleteAdapters = {
            mysql: new MysqlAdapter(),
            postgres: new PostgresAdapter(),
        } as unknown as typeof adapters

        assert.throws(
            () => new AdapterRegistry(incompleteAdapters),
            /No adapter registered for database engine "mongodb"/,
        )
    })

    test('rejects an unsupported engine lookup at runtime', () => {
        assert.throws(
            () => registry.get('redis' as DatabaseEngine),
            /No adapter registered for database engine "redis"/,
        )
    })
})
