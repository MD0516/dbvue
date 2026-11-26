
import {
    createCipheriv,
    createDecipheriv,
    randomBytes,
} from 'node:crypto'

import type { EncryptedConnectionCredentials, EncryptedSecret } from '../domain/connection-record.js'

const ALGORITHM = 'aes-256-gcm' as const
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH_HEX = 64

/**
 * Reads and validates the application encryption key.
 *
 * The key must be 32 bytes represented as 64 hexadecimal characters.
 */
function getEncryptionKey(): Buffer {
    const value = process.env.DBVUE_ENCRYPTION_KEY

    if (!value || !new RegExp(`^[0-9a-fA-F]{${KEY_LENGTH_HEX}}$`).test(value)) {
        throw new Error(
            'DBVUE_ENCRYPTION_KEY must be set to a valid 64-character hexadecimal key.',
        )
    }

    return Buffer.from(value, 'hex')
}

/**
 * Checks that the encryption key is configured correctly.
 *
 * Call this during server startup so the application fails early
 * instead of failing when a connection is first saved.
 */
export function assertEncryptionKeyConfigured(): void {
    getEncryptionKey()
}

/**
 * Decodes a Base64 value and optionally checks its expected byte length.
 */
function decodeBase64(
    value: string,
    fieldName: string,
    expectedLength?: number,
): Buffer {
    const decoded = Buffer.from(value, 'base64')

    if (decoded.toString('base64') !== value) {
        throw new Error(`Stored credential contains an invalid ${fieldName}.`)
    }

    if (expectedLength !== undefined && decoded.length !== expectedLength) {
        throw new Error(`Stored credential contains an invalid ${fieldName} length.`)
    }

    return decoded
}

/**
 * Encrypts a plaintext secret using AES-256-GCM.
 *
 * A fresh random initialization vector is generated for every encryption.
 * Binary values are Base64-encoded for JSON storage.
 */
export function encryptSecret(plaintext: string): EncryptedSecret {
    const key = getEncryptionKey()
    const iv = randomBytes(IV_LENGTH)

    const cipher = createCipheriv(ALGORITHM, key, iv)

    const cipherText = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ])

    return {
        version: 1,
        algorithm: ALGORITHM,
        iv: iv.toString('base64'),
        authTag: cipher.getAuthTag().toString('base64'),
        cipherText: cipherText.toString('base64'),
    }
}

/**
 * Decrypts an AES-256-GCM encrypted secret.
 *
 * Decryption fails if the key is incorrect or the stored data
 * has been modified.
 */
export function decryptSecret(secret: EncryptedSecret): string {
    if (
        !secret ||
        secret.version !== 1 ||
        secret.algorithm !== ALGORITHM
    ) {
        throw new Error('Unsupported or invalid encrypted credential format.')
    }

    const key = getEncryptionKey()
    const iv = decodeBase64(secret.iv, 'initialization vector', IV_LENGTH)
    const authTag = decodeBase64(
        secret.authTag,
        'authentication tag',
        AUTH_TAG_LENGTH,
    )
    const cipherText = decodeBase64(secret.cipherText, 'ciphertext')

    try {
        const decipher = createDecipheriv(ALGORITHM, key, iv)

        decipher.setAuthTag(authTag)

        const plaintext = Buffer.concat([
            decipher.update(cipherText),
            decipher.final(),
        ])

        return plaintext.toString('utf8')
    } catch {
        throw new Error(
            'Unable to decrypt stored credential. The encryption key may be incorrect or the data may have been modified.',
        )
    }
}

/**
 * Decrypts all stored credentials for a database connection.
 * 
 * Returns undefined when the connection has no stored credentials.
 */
export function decryptCredentials(
    credentials: EncryptedConnectionCredentials | null,
): {
    password?: string,
    tlsPrivateKeyPassphrase?: string
} | undefined {
    if (!credentials) {
        return undefined;
    }

    const decrypted: {
        password?: string
        tlsPrivateKeyPassphrase?: string
    } = {}

    if (credentials.password) {
        decrypted.password = decryptSecret(credentials.password);
    }

    if (credentials.tlsPrivateKeyPassphrase) {
        decrypted.tlsPrivateKeyPassphrase = decryptSecret(
            credentials.tlsPrivateKeyPassphrase
        );
    }

    return decrypted;
}