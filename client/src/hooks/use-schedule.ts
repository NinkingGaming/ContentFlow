import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "./use-toast";
import { ScheduleEvent } from "@shared/schema";

export type ScheduleEventInput = {
  title: string;
  type: 'filming_day' | 'upload_day' | 'secondary_filming_day';
  date: string;
  notes?: string;
  color: string;
};

export function useSchedule(projectId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const scheduleQueryKey = [`/api/projects/${projectId}/schedule`];
  
  // Get all schedule events
  const eventsQuery = useQuery<ScheduleEvent[]>({
    queryKey: scheduleQueryKey,
  });
  
  // Get schedule events for a specific month
  const getMonthEvents = (year: number, month: number) => {
    return useQuery<ScheduleEvent[]>({
      queryKey: [...scheduleQueryKey, 'month', year, month],
      queryFn: () => apiRequest('GET', `/api/projects/${projectId}/schedule/month/${year}/${month}`).then(res => res.json()),
    });
  };
  
  // Create a new schedule event
  const createEventMutation = useMutation({
    mutationFn: (newEvent: ScheduleEventInput) => {
      return apiRequest('POST', `/api/projects/${projectId}/schedule`, newEvent).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleQueryKey });
      toast({
        title: "Event created",
        description: "The schedule event has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create event: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Update a schedule event
  const updateEventMutation = useMutation({
    mutationFn: ({ eventId, data }: { eventId: number, data: Partial<ScheduleEventInput> }) => {
      return apiRequest('PUT', `/api/projects/${projectId}/schedule/${eventId}`, data).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleQueryKey });
      toast({
        title: "Event updated",
        description: "The schedule event has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update event: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Delete a schedule event
  const deleteEventMutation = useMutation({
    mutationFn: (eventId: number) => {
      return apiRequest('DELETE', `/api/projects/${projectId}/schedule/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleQueryKey });
      toast({
        title: "Event deleted",
        description: "The schedule event has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete event: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  return {
    events: eventsQuery.data || [],
    isLoading: eventsQuery.isLoading,
    getMonthEvents,
    createEvent: createEventMutation.mutate,
    isCreating: createEventMutation.isPending,
    updateEvent: updateEventMutation.mutate,
    isUpdating: updateEventMutation.isPending,
    deleteEvent: deleteEventMutation.mutate,
    isDeleting: deleteEventMutation.isPending,
  };
}