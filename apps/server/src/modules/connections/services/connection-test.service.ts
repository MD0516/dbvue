import type {
    ConnectionConfigByEngine,
    ConnectionCredentialsByEngine,
} from "@dbvue/shared";
import type { AdapterRegistry } from "../adapters/adapter-registry.js";

export class ConnectionTestService {
    constructor(private readonly adapterRegistry: AdapterRegistry<any>) { }

    async testConnection<
        E extends keyof ConnectionConfigByEngine &
        keyof ConnectionCredentialsByEngine,
    >(
        engine: E,
        config: ConnectionConfigByEngine[E],
        credentials?: ConnectionCredentialsByEngine[E],
    ): Promise<{
        success: true;
        latencyMs: number;
        serverVersion: string;
    }> {
        const adapter = this.adapterRegistry.get(engine);

        let client: Awaited<ReturnType<typeof adapter.connect>> | undefined;
        const startTime = performance.now();

        try {
            client = await adapter.connect(config, credentials);

            await adapter.ping(client);

            const serverVersion = await adapter.getServerVersion(client);
            const latencyMs = Math.round(performance.now() - startTime);

            return {
                success: true,
                latencyMs,
                serverVersion,
            };
        } finally {
            if (client) {
                await adapter.close(client);
            }
        }
    }
}