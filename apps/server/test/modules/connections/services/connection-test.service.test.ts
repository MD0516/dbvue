import { ConnectionTestService } from './../../../../dist/modules/connections/services/connection-test.service.js';
import test from "node:test";
import assert from "node:assert/strict";
import type { AdapterRegistry } from "../../../../dist/modules/connections/adapters/adapter-registry.js";


test("ConnectionTestService", async (t) => {
    const client = { id: "mock-client" };

    let connectCalls = 0;
    let pingCalls = 0;
    let versionCalls = 0;
    let closeCalls = 0;

    let connectError: Error | undefined;
    let pingError: Error | undefined;
    let versionError: Error | undefined;
    let closeError: Error | undefined;

    const mockAdapter = {
        engine: "mysql",

        connect: async () => {
            connectCalls++;

            if (connectError) {
                throw connectError;
            }

            return client;
        },

        ping: async () => {
            pingCalls++;

            if (pingError) {
                throw pingError;
            }
        },

        getServerVersion: async () => {
            versionCalls++;

            if (versionError) {
                throw versionError;
            }

            return "8.4.0";
        },

        close: async () => {
            closeCalls++;

            if (closeError) {
                throw closeError;
            }
        },
    };

    const mockRegistry = {
        get: () => mockAdapter,
    } as unknown as AdapterRegistry<any>;

    const service = new ConnectionTestService(mockRegistry);

    const config = {} as any;
    const credentials = {} as any;

    const reset = () => {
        connectCalls = 0;
        pingCalls = 0;
        versionCalls = 0;
        closeCalls = 0;

        connectError = undefined;
        pingError = undefined;
        versionError = undefined;
        closeError = undefined;
    };

    await t.test("successfully tests a connection", async () => {
        reset();

        const result = await service.testConnection(
            "mysql",
            config,
            credentials,
        );

        assert.deepEqual(result, {
            latencyMs: 0,
            serverVersion: '8.4.0',
            success: true
        });

        assert.equal(connectCalls, 1);
        assert.equal(pingCalls, 1);
        assert.equal(versionCalls, 1);
        assert.equal(closeCalls, 1);
    });

    await t.test("closes the client when ping fails", async () => {
        reset();

        pingError = new Error("Ping failed");

        await assert.rejects(
            service.testConnection("mysql", config, credentials),
            { message: "Ping failed" },
        );

        assert.equal(connectCalls, 1);
        assert.equal(pingCalls, 1);
        assert.equal(versionCalls, 0);
        assert.equal(closeCalls, 1);
    });

    await t.test("closes the client when version retrieval fails", async () => {
        reset();

        versionError = new Error("Version retrieval failed");

        await assert.rejects(
            service.testConnection("mysql", config, credentials),
            { message: "Version retrieval failed" },
        );

        assert.equal(connectCalls, 1);
        assert.equal(pingCalls, 1);
        assert.equal(versionCalls, 1);
        assert.equal(closeCalls, 1);
    });

    await t.test("does not close a client when connect fails", async () => {
        reset();

        connectError = new Error("Connection failed");

        await assert.rejects(
            service.testConnection("mysql", config, credentials),
            { message: "Connection failed" },
        );

        assert.equal(connectCalls, 1);
        assert.equal(pingCalls, 0);
        assert.equal(versionCalls, 0);
        assert.equal(closeCalls, 0);
    });

    await t.test("propagates close errors", async () => {
        reset();

        closeError = new Error("Close failed");

        await assert.rejects(
            service.testConnection("mysql", config, credentials),
            { message: "Close failed" },
        );

        assert.equal(connectCalls, 1);
        assert.equal(pingCalls, 1);
        assert.equal(versionCalls, 1);
        assert.equal(closeCalls, 1);
    });
});