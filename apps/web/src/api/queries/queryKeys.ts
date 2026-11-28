import type { QueryClient, QueryKey } from '@tanstack/react-query'

const connectionRoot = ['connections'] as const

/**
 * Centralized query keys for server-side connection data.
 */
export const queryKeys = {
    connections: {
        all: connectionRoot,
        list: [...connectionRoot, 'list'] as const,
        detail: (id: string) =>
            [...connectionRoot, 'detail', id] as const,
        status: [...connectionRoot, 'status'] as const,
        summary: ["connections", "summary"] as const,
    },
} as const

/**
 * Invalidates multiple query caches.
 */
export const invalidateQueries = (
    queryClient: QueryClient,
    queryKeys: readonly QueryKey[],
) => {
    return Promise.all(
        queryKeys.map(queryKey =>
            queryClient.invalidateQueries({ queryKey }),
        ),
    )
}