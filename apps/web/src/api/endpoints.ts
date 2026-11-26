
import type {
    ApiResponse,
    ApiMessageResponse,
    ConnectionDto,
    CreateConnectionRequest,
    UpdateConnectionRequest,
} from '@dbvue/shared'

import { api } from './client'

type ConnectionsResponse = ApiResponse<ConnectionDto[]>
type ConnectionResponse = ApiResponse<ConnectionDto>
type DeleteConnectionResponse = ApiMessageResponse

/**
 * Provides HTTP operations for managing saved database connections.
 */
export const connection = {
    findAll: (signal?: AbortSignal): Promise<ConnectionsResponse> =>
        api.get<ConnectionsResponse>('/connections', { signal })
            .then(res => res.data),

    findById: (id: string, signal?: AbortSignal): Promise<ConnectionResponse> =>
        api.get<ConnectionResponse>(`/connections/${id}`, { signal })
            .then(res => res.data),

    create: (data: CreateConnectionRequest): Promise<ConnectionResponse> =>
        api.post<ConnectionResponse>('/connections', data)
            .then(res => res.data),

    update: (
        id: string,
        data: UpdateConnectionRequest,
    ): Promise<ConnectionResponse> =>
        api.patch<ConnectionResponse>(`/connections/${id}`, data)
            .then(res => res.data),

    delete: (id: string): Promise<DeleteConnectionResponse> =>
        api.delete<DeleteConnectionResponse>(`/connections/${id}`)
            .then(res => res.data),
}
