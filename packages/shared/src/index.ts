import { z } from 'zod'

export const databaseEngineSchema = z.enum(['mysql', 'postgresql', 'mongodb'])

export type DatabaseEngine = z.infer<typeof databaseEngineSchema>
