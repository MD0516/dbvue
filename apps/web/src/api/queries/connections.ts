import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { invalidateQueries, queryKeys } from "./queryKeys"
import { connection } from "../endpoints"
import type { ConnectionDto, ConnectionStatusDto, CreateConnectionRequest, TestConnectionRequest, UpdateConnectionRequest } from "@dbvue/shared"
import { toast } from 'sonner'
import { ApiError, getErrorMessage } from "../client"

export const useConnectionsQuery = () => {
    return useQuery<ConnectionDto[]>({
        queryKey: queryKeys.connections.list,
        queryFn: ({ signal }) => connection.findAll(signal).then(res => res.data),
    })
}

export const useConnectionQuery = (id: string) => {
    return useQuery<ConnectionDto>({
        queryKey: queryKeys.connections.detail(id),
        queryFn: ({ signal }) => connection.findById(id, signal).then(res => res.data),
        enabled: Boolean(id)
    })
}

export const useCreateConnectionMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateConnectionRequest) =>
            connection.create(data),
        onSuccess: (response) => {
            toast.success(response.message ?? 'Connection created successfully')
            return invalidateQueries(queryClient, [
                queryKeys.connections.list,
                queryKeys.connections.status,
                queryKeys.connections.summary,
            ])
        },
        onError: (error) => {
            toast.error(getErrorMessage(error) || "Failed to create connection");
        },
    })
}

export const useUpdateConnectionMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string, data: UpdateConnectionRequest }) =>
            connection.update(id, data),
        onSuccess: (response, variables) => {
            toast.success(response.message ?? 'Connection update successfully')
            return invalidateQueries(queryClient, [
                queryKeys.connections.list,
                queryKeys.connections.detail(variables.id),
                queryKeys.connections.status,
                queryKeys.connections.summary,
            ])
        },
        onError: (error) => {
            toast.error(getErrorMessage(error) || "Failed to update connection");
        },
    })
}

export const useDeleteConnectionMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) =>
            connection.delete(id),
        onMutate: (id) => {
            toast.loading("Deleting...", { id })
        },
        onSuccess: (response, id) => {
            toast.success(response.message, { id })

            queryClient.removeQueries({
                queryKey: queryKeys.connections.detail(id),
                exact: true,
            })

            return invalidateQueries(queryClient, [
                queryKeys.connections.list,
            ])
        },
        onError: (error, id) => {
            toast.error(getErrorMessage(error) || 'Failed to create connection', { id })
        },
    })
}

export const useConnectMutation = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => connection.connect(id),
        onSuccess: (_, id) => {
            toast.success('Connection established successfully')

            return invalidateQueries(queryClient, [
                queryKeys.connections.list,
                queryKeys.connections.detail(id),
                queryKeys.connections.status,
                queryKeys.connections.summary,
            ])
        },
        onError: (error, id) => {
            toast.error(getErrorMessage(error))
            return invalidateQueries(queryClient, [
                queryKeys.connections.list,
                queryKeys.connections.detail(id),
                queryKeys.connections.status,
                queryKeys.connections.summary,
            ])
        },
    })
}

export const useDisconnectMutation = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => connection.disconnect(id),
        onSuccess: (_, id) => {
            toast.success('Disconnected successfully')

            return invalidateQueries(queryClient, [
                queryKeys.connections.list,
                queryKeys.connections.detail(id),
                queryKeys.connections.status,
                queryKeys.connections.summary,
            ])
        },
        onError: (error) => {
            toast.error(getErrorMessage(error))
        },
    })
}

export const useStatusMutation = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: ConnectionStatusDto) => connection.status(data),
        mutationKey: queryKeys.connections.status,
        onSuccess: () => {
            return invalidateQueries(queryClient, [
                queryKeys.connections.status
            ])
        }
    })
}

export const useTestConnectionMutation = () => {
    return useMutation({
        mutationFn: (data: TestConnectionRequest) => connection.test(data),

        onSuccess: (response) => {
            const result = response.data

            if (result.success) {
                toast.success("Test connection successful", {
                    description: [
                        `Latency: ${result.latencyMs}ms`,
                        ...(result.serverVersion ? [`Version: ${result.serverVersion}`] : []),
                    ].join(" · "),
                })
            }
        },

        onError: (error) => {
            const description =
                error instanceof ApiError && error.connectionError
                    ? error.connectionError.message
                    : getErrorMessage(error)

            toast.error("Test connection failed", {
                description,
            })
        },
    })
}

export const useConnectionSummaryQuery = () => {
    return useQuery({
        queryKey: queryKeys.connections.summary,
        queryFn: ({ signal }) => connection.summary(signal),
    })
}