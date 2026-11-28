
import type { DatabaseEngine } from '@dbvue/shared'

import type { DatabaseAdapter } from './contracts/database-adapter.js'

/**
 * Maps each supported database engine to its adapter.
 *
 * `any` is used only at the heterogeneous registry boundary because
 * each adapter has a different native client type.
 *
 * The concrete types are preserved by TAdapters and returned by get().
 */
type AdapterMap = {
    [E in DatabaseEngine]: DatabaseAdapter<E, any>
}

/**
 * Central registry for database-engine adapters.
 *
 * The registry resolves adapters but does not create or manage
 * database connections.
 */
export class AdapterRegistry<TAdapters extends AdapterMap> {
    private readonly adapters: TAdapters

    constructor(adapters: TAdapters) {
        const supportedEngines = [
            'mysql',
            'postgres',
            'mongodb',
        ] as const

        // Ensure every supported engine has a matching adapter.
        for (const engine of supportedEngines) {
            const adapter = adapters[engine]

            if (!adapter) {
                throw new Error(
                    `No adapter registered for database engine "${engine}".`,
                )
            }

            if (adapter.engine !== engine) {
                throw new Error(
                    `Adapter registered for "${engine}" has engine "${adapter.engine}".`,
                )
            }
        }

        this.adapters = { ...adapters }
    }

    /**
     * Returns the adapter registered for the requested engine.
     *
     * The concrete adapter type is preserved.
     */
    get<E extends DatabaseEngine>(engine: E): TAdapters[E] {
        const adapter = this.adapters[engine]

        if (!adapter) {
            throw new Error(
                `No adapter registered for database engine "${engine}".`,
            )
        }

        return adapter
    }
}
