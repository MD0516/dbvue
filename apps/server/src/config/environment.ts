import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

const envFilePath = fileURLToPath(
    new URL('../../../../.env', import.meta.url),
)

/**
 * Loads the project's root .env file when it exists.
 * 
 * Environment variables supplied by the hosting environment can
 * still be used when no local .env file is present.
 */
export function loadApplicationEnvironment(): void {
    if (existsSync(envFilePath)) {
        loadEnvFile(envFilePath)
    }
}