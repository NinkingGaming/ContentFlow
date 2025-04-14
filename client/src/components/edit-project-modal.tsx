import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { InsertProject, Project, User } from "@shared/schema";

interface EditProjectModalProps {
  project: Project;
  users: User[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProjectModal({ project, users, open, onOpenChange }: EditProjectModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for team members management
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");

  // Fetch current team members
  const { data: members = [] } = useQuery<User[]>({
    queryKey: [`/api/projects/${project.id}/members`],
    enabled: open, // Only fetch when modal is open
  });

  // Setup form schema
  const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    director: z.string().optional(),
    writer: z.string().optional(),
    actors: z.string().optional(),
  });

  // Initialize react-hook-form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: project.name,
      description: project.description || "",
      director: project.director || "",
      writer: project.writer || "",
      actors: project.actors || "",
    },
  });

  // Update default values when project data changes
  useEffect(() => {
    if (project) {
      form.reset({
        name: project.name,
        description: project.description || "",
        director: project.director || "",
        writer: project.writer || "",
        actors: project.actors || "",
      });
    }
  }, [project, form]);

  // Update team members state when members data changes
  useEffect(() => {
    setTeamMembers(members);
  }, [members]);

  // Mutation for updating project
  const updateProjectMutation = useMutation({
    mutationFn: async (data: Partial<InsertProject>) => {
      const res = await apiRequest("PUT", `/api/projects/${project.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project updated",
        description: "Your project has been updated successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred while updating the project.",
        variant: "destructive",
      });
    },
  });

  // Mutation for adding team member
  const addMemberMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/projects/${project.id}/members`, { userId });
      return await res.json();
    },
    onSuccess: (data) => {
      setTeamMembers(data);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/members`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}`] });
      toast({
        title: "Member added",
        description: "Team member has been added successfully.",
      });
      setSelectedMemberId("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred while adding the team member.",
        variant: "destructive",
      });
    },
  });

  // Mutation for removing team member
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/projects/${project.id}/members/${userId}`);
      return await res.json();
    },
    onSuccess: (data) => {
      setTeamMembers(data);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/members`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}`] });
      toast({
        title: "Member removed",
        description: "Team member has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred while removing the team member.",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    updateProjectMutation.mutate(data);
  };

  // Handle adding a team member
  const handleAddMember = () => {
    if (selectedMemberId) {
      const userId = parseInt(selectedMemberId);
      // Check if user is already a member
      const isMember = teamMembers.some(member => member.id === userId);
      if (isMember) {
        toast({
          title: "Error",
          description: "This user is already a team member.",
          variant: "destructive",
        });
        return;
      }
      addMemberMutation.mutate(userId);
    }
  };

  // Handle removing a team member
  const handleRemoveMember = (userId: number) => {
    // Prevent removing the project creator
    if (project.createdBy === userId) {
      toast({
        title: "Error",
        description: "You cannot remove the project creator.",
        variant: "destructive",
      });
      return;
    }
    removeMemberMutation.mutate(userId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="director"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Director</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="writer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Writer</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="actors"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Actors</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-medium mb-2">Team Members</h3>
                
                <div className="flex items-end gap-2 mb-4">
                  <div className="flex-1">
                    <FormLabel htmlFor="member">Add Team Member</FormLabel>
                    <Select
                      value={selectedMemberId}
                      onValueChange={setSelectedMemberId}
                    >
                      <SelectTrigger id="member">
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.displayName} ({user.username})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    type="button" 
                    onClick={handleAddMember}
                    disabled={!selectedMemberId || addMemberMutation.isPending}
                  >
                    Add Member
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-2">
                  {teamMembers.length === 0 ? (
                    <p className="text-sm text-neutral-500 p-2">No team members added yet.</p>
                  ) : (
                    teamMembers.map((member) => (
                      <div key={member.id} className="flex justify-between items-center p-2 bg-neutral-50 rounded border">
                        <div className="flex items-center">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs mr-2"
                            style={{ backgroundColor: member.avatarColor || "#3B82F6" }}
                          >
                            {member.avatarInitials}
                          </div>
                          <div>
                            <div className="font-medium">{member.displayName}</div>
                            <div className="text-xs text-neutral-500">{member.username}</div>
                          </div>
                        </div>
                        {project.createdBy !== member.id && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={removeMemberMutation.isPending}
                            className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                          >
                            Remove
                          </Button>
                        )}
                        {project.createdBy === member.id && (
                          <div className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            Owner
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateProjectMutation.isPending}>
                  {updateProjectMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}