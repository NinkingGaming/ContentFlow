import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type ScriptData, type ScriptCorrelation, type SpreadsheetRow } from "@shared/schema";
import { useToast } from "./use-toast";

export interface ScriptDataPayload {
  scriptContent: string;
  finalContent?: string;
  correlations: ScriptCorrelation[];
  spreadsheetData: SpreadsheetRow[];
}

export function useScriptData(projectId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const queryKey = [`/api/projects/${projectId}/script-data`];
  
  // Fetch script data
  const scriptDataQuery = useQuery<ScriptData>({
    queryKey,
    retry: false,
    throwOnError: false,
    staleTime: 10 * 1000, // 10 seconds - relatively low because we want collaborative editing
  });
  
  // Create script data mutation
  const createScriptData = useMutation({
    mutationFn: (data: ScriptDataPayload) => {
      return apiRequest(queryKey[0], {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: "Script data created",
        description: "Script data has been saved successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Error creating script data:", error);
      toast({
        title: "Error creating script data",
        description: error?.message || "Failed to create script data",
        variant: "destructive",
      });
    },
  });
  
  // Update script data mutation
  const updateScriptData = useMutation({
    mutationFn: (data: Partial<ScriptDataPayload>) => {
      return apiRequest(queryKey[0], {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      // Set the query data manually instead of invalidating the query
      // This prevents automatic refetching and overwrites
      queryClient.setQueryData(queryKey, data);
      // We don't show a toast on every update as it would be too frequent and annoying
    },
    onError: (error: any) => {
      console.error("Error updating script data:", error);
      toast({
        title: "Error saving script data",
        description: error?.message || "Failed to save script data",
        variant: "destructive",
      });
    },
  });
  
  // Debounced update function for autosave
  const updateScriptDataDebounced = (data: Partial<ScriptDataPayload>) => {
    if (updateScriptData.isPending) return;
    
    // If no existing script data, we need to create it first
    if (!scriptDataQuery.data && !scriptDataQuery.isLoading) {
      if (
        data.scriptContent !== undefined &&
        data.correlations !== undefined &&
        data.spreadsheetData !== undefined
      ) {
        createScriptData.mutate({
          scriptContent: data.scriptContent,
          finalContent: data.finalContent || "",
          correlations: data.correlations,
          spreadsheetData: data.spreadsheetData,
        });
      } else {
        console.error("Missing required fields for script data creation");
      }
    } else {
      // Otherwise update existing data
      updateScriptData.mutate(data);
    }
  };
  
  return {
    scriptData: scriptDataQuery.data,
    isLoading: scriptDataQuery.isLoading,
    error: scriptDataQuery.error,
    updateScriptData: updateScriptDataDebounced,
    isUpdating: updateScriptData.isPending || createScriptData.isPending,
  };
}