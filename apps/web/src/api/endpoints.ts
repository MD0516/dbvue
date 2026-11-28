
import type {
    ApiResponse,
    ApiMessageResponse,
    ConnectionDto,
    CreateConnectionRequest,
    UpdateConnectionRequest,
    ConnectionSessionDto,
    ConnectionStatusResult,
    ConnectionStatusDto,
    TestConnectionRequest,
    TestConnectionResult,
    ConnectionSummary,
} from '@dbvue/shared'

import { api } from './client'

type ConnectionsResponse = ApiResponse<ConnectionDto[]>
type ConnectionResponse = ApiResponse<ConnectionDto>
type DeleteConnectionResponse = ApiMessageResponse
type ConnectionSessionResponse = ApiResponse<ConnectionSessionDto>
type ConnectionStatusResponse = ApiResponse<ConnectionStatusResult>
type TestConnectionResponse = ApiResponse<TestConnectionResult>
type ConnectionSummaryResponse = ApiResponse<ConnectionSummary>

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

    connect: (id: string): Promise<ConnectionSessionResponse> =>
        api.post<ConnectionSessionResponse>(`/connections/${id}/connect`)
            .then(res => res.data),

    disconnect: (id: string): Promise<ApiMessageResponse> =>
        api.post<ApiMessageResponse>(`/connections/${id}/disconnect`)
            .then(res => res.data),

    status: (data: ConnectionStatusDto): Promise<ConnectionStatusResponse> =>
        api.post<ConnectionStatusResponse>(`/connections/status`, data)
            .then(res => res.data),

    test: (data: TestConnectionRequest): Promise<TestConnectionResponse> =>
        api.post<TestConnectionResponse>("/connections/test", data)
            .then(res => res.data),

    summary: (signal?: AbortSignal): Promise<ConnectionSummaryResponse> =>
        api.get<ConnectionSummaryResponse>("/connections/summary", { signal })
            .then(res => res.data),
}
