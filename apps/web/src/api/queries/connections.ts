import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { invalidateQueries, queryKeys } from "./queryKeys"
import { connection } from "../endpoints"
import type { ConnectionDto, CreateConnectionRequest, UpdateConnectionRequest } from "@dbvue/shared"
import { toast } from 'sonner'
import { getErrorMessage } from "../client"

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
        onSuccess: async (response) => {
            toast.success(response.message ?? 'Connection created successfully')
            await invalidateQueries(queryClient, [
                queryKeys.connections.list
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
        onSuccess: async (response, variables) => {
            toast.success(response.message ?? 'Connection update successfully')
            await invalidateQueries(queryClient, [
                queryKeys.connections.list,
                queryKeys.connections.detail(variables.id),
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
        onSuccess: async (response, id) => {
            toast.success(response.message, { id })

            queryClient.removeQueries({
                queryKey: queryKeys.connections.detail(id),
                exact: true,
            })

            await invalidateQueries(queryClient, [
                queryKeys.connections.list,
            ])
        },
        onError: (error, id) => {
            toast.error(getErrorMessage(error) || 'Failed to create connection', { id })
        },
    })
}