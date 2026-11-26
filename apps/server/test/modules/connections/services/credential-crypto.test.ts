
import assert from 'node:assert/strict'
import {
    afterEach,
    beforeEach,
    describe,
    it,
} from 'node:test'

import {
    decryptCredentials,
    decryptSecret,
    encryptSecret,
} from '../../../../dist/modules/connections/services/credential-crypto.js'

const TEST_KEY = 'a'.repeat(64)
const originalKey = process.env.DBVUE_ENCRYPTION_KEY

beforeEach(() => {
    process.env.DBVUE_ENCRYPTION_KEY = TEST_KEY
})

afterEach(() => {
    if (originalKey === undefined) {
        delete process.env.DBVUE_ENCRYPTION_KEY
    } else {
        process.env.DBVUE_ENCRYPTION_KEY = originalKey
    }
})

describe('Credential encryption', () => {
    it('should encrypt and decrypt a secret correctly', () => {
        const plaintext = 'MyDatabasePassword@123'

        const encrypted = encryptSecret(plaintext)
        const decrypted = decryptSecret(encrypted)

        assert.notEqual(encrypted.cipherText, plaintext)
        assert.equal(decrypted, plaintext)
        assert.equal(encrypted.version, 1)
        assert.equal(encrypted.algorithm, 'aes-256-gcm')

        assert.equal(
            Buffer.from(encrypted.iv, 'base64').length,
            12,
        )

        assert.equal(
            Buffer.from(encrypted.authTag, 'base64').length,
            16,
        )
    })

    it('should correctly encrypt Unicode secrets', () => {
        const plaintext = 'पासवर्ड🔐数据库'

        const encrypted = encryptSecret(plaintext)

        assert.equal(
            decryptSecret(encrypted),
            plaintext,
        )
    })

    it('should generate a unique IV for every encryption', () => {
        const plaintext = 'SamePassword123'

        const first = encryptSecret(plaintext)
        const second = encryptSecret(plaintext)

        assert.notEqual(first.iv, second.iv)
        assert.notEqual(first.cipherText, second.cipherText)

        assert.equal(decryptSecret(first), plaintext)
        assert.equal(decryptSecret(second), plaintext)
    })

    it('should reject modified encrypted data', () => {
        const encrypted = encryptSecret('SensitivePassword')

        const modifiedCipherText = Buffer.from(
            encrypted.cipherText,
            'base64',
        )

        modifiedCipherText[0] = modifiedCipherText[0]! ^ 1

        const tampered = {
            ...encrypted,
            cipherText: modifiedCipherText.toString('base64'),
        }

        assert.throws(
            () => decryptSecret(tampered),
            /Unable to decrypt stored credential/,
        )
    })

    it('should reject an incorrect encryption key', () => {
        const encrypted = encryptSecret('SensitivePassword')

        process.env.DBVUE_ENCRYPTION_KEY = 'b'.repeat(64)

        assert.throws(
            () => decryptSecret(encrypted),
            /Unable to decrypt stored credential/,
        )
    })

    it('should reject a missing encryption key', () => {
        delete process.env.DBVUE_ENCRYPTION_KEY

        assert.throws(
            () => encryptSecret('SensitivePassword'),
            /DBVUE_ENCRYPTION_KEY must be set/,
        )
    })

    it('should reject an incorrectly formatted encryption key', () => {
        process.env.DBVUE_ENCRYPTION_KEY = 'invalid-key'

        assert.throws(
            () => encryptSecret('SensitivePassword'),
            /DBVUE_ENCRYPTION_KEY must be set/,
        )
    })
})

describe('Credential decryption', () => {
    it('should decrypt all supplied connection credentials', () => {
        const password = 'DatabasePassword123'
        const passphrase = 'PrivateKeyPassphrase456'

        const encryptedCredentials = {
            password: encryptSecret(password),
            tlsPrivateKeyPassphrase: encryptSecret(passphrase),
        }

        const decrypted = decryptCredentials(encryptedCredentials)

        assert.deepEqual(decrypted, {
            password,
            tlsPrivateKeyPassphrase: passphrase,
        })
    })

    it('should return undefined when no credentials are stored', () => {
        assert.equal(
            decryptCredentials(null),
            undefined,
        )
    })
})
