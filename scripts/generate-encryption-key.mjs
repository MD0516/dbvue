import {
    existsSync,
    readFileSync,
    writeFileSync,
} from 'node:fs'
import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(
    fileURLToPath(new URL('..', import.meta.url)),
)

const envPath = resolve(projectRoot, '.env')

const args = new Set(process.argv.slice(2))
const showKey = args.has('--show')
const force = args.has('--force')

const unknownArgs = [...args].filter(
    (arg) => !['--show', '--force'].includes(arg),
)

if (unknownArgs.length > 0) {
    console.error(`Unknown arguments: ${unknownArgs.join(', ')}`)
    process.exit(1)
}

const existingContent = existsSync(envPath)
    ? readFileSync(envPath, 'utf8')
    : ''

const lines = existingContent.split(/\r?\n/)
const keyLinePattern = /^\s*(?:export\s+)?DBVUE_ENCRYPTION_KEY\s*=/

const existingKeyLine = lines.find(
    (line) => keyLinePattern.test(line),
)

const existingKey = existingKeyLine
    ?.replace(keyLinePattern, '')
    .trim()

if (existingKey && !force) {
    console.error('An encryption key already exists in .env.')
    console.error('Use --force to intentionally generate a replacement.')
    process.exit(1)
}

const encryptionKey = randomBytes(32).toString('hex')
const updatedLines = []
let keyUpdated = false

for (const line of lines) {
    if (keyLinePattern.test(line)) {
        if (!keyUpdated) {
            updatedLines.push(`DBVUE_ENCRYPTION_KEY=${encryptionKey}`)
            keyUpdated = true
        }

        continue
    }

    updatedLines.push(line)
}

if (!keyUpdated) {
    if (updatedLines.length > 0 && updatedLines.at(-1)?.trim() !== '') {
        updatedLines.push('')
    }

    updatedLines.push(`DBVUE_ENCRYPTION_KEY=${encryptionKey}`)
}

const newline = existingContent.includes('\r\n') ? '\r\n' : '\n'

writeFileSync(
    envPath,
    updatedLines.join(newline).replace(/\n*$/, '') + newline,
    'utf8',
)

console.log('Encryption key generated successfully.')
console.log('Updated root .env file.')

if (existingKey && force) {
    console.warn(
        'WARNING: The previous key was replaced. Previously encrypted credentials may no longer be decryptable.',
    )
}

if (showKey) {
    console.log('\nDBVUE_ENCRYPTION_KEY:')
    console.log(encryptionKey)
}