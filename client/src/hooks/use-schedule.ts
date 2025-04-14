import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ScheduleEvent, InsertScheduleEvent } from "@shared/schema";

// Type for updating an existing schedule event
interface UpdateEventParams {
  eventId: number;
  data: Partial<InsertScheduleEvent>;
}

// Export type for creating schedule events
export type ScheduleEventInput = Omit<InsertScheduleEvent, "projectId" | "createdBy">;

export function useSchedule(projectId: number) {
  // Fetch all schedule events for the project
  const { data: events = [], isLoading, error } = useQuery<ScheduleEvent[]>({
    queryKey: [`/api/projects/${projectId}/schedule`],
  });

  // Fetch events for a specific month
  const getMonthEvents = (year: number, month: number) => {
    return useQuery<ScheduleEvent[]>({
      queryKey: [`/api/projects/${projectId}/schedule/month`, { year, month }],
    });
  };

  // Create a new schedule event
  const createMutation = useMutation({
    mutationFn: async (eventData: ScheduleEventInput) => {
      const response = await apiRequest(
        "POST", 
        `/api/projects/${projectId}/schedule`, 
        eventData
      );
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate cached events data
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/schedule`]
      });
    },
  });

  // Update an existing schedule event
  const updateMutation = useMutation({
    mutationFn: async ({ eventId, data }: UpdateEventParams) => {
      const response = await apiRequest(
        "PUT", 
        `/api/projects/${projectId}/schedule/${eventId}`, 
        data
      );
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate cached events data
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/schedule`]
      });
    },
  });

  // Delete a schedule event
  const deleteMutation = useMutation({
    mutationFn: async (eventId: number) => {
      await apiRequest(
        "DELETE", 
        `/api/projects/${projectId}/schedule/${eventId}`
      );
    },
    onSuccess: () => {
      // Invalidate cached events data
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/schedule`]
      });
    },
  });

  // Simplified API for components
  return {
    events,
    isLoading,
    error,
    getMonthEvents,
    createEvent: (data: ScheduleEventInput) => createMutation.mutate(data),
    updateEvent: (params: UpdateEventParams) => updateMutation.mutate(params),
    deleteEvent: (eventId: number) => deleteMutation.mutate(eventId),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}