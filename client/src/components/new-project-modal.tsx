import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { User } from "@shared/schema";
import { X } from "lucide-react";

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
}

export function NewProjectModal({ isOpen, onClose, users }: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("YouTube Series");
  const [description, setDescription] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [newMemberInput, setNewMemberInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const resetForm = () => {
    setName("");
    setType("YouTube Series");
    setDescription("");
    setSelectedUsers([]);
    setNewMemberInput("");
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const project = await apiRequest("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          type,
          memberIds: selectedUsers.map(u => u.id)
        })
      });
      
      // Invalidate projects query
      await queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      
      toast({
        title: "Success",
        description: "Project created successfully",
      });
      
      handleClose();
      
      // Navigate to the new project
      setLocation(`/projects/${project.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleAddMember = (username: string) => {
    const foundUser = users.find(u => 
      u.username.toLowerCase() === username.toLowerCase() ||
      u.displayName.toLowerCase() === username.toLowerCase()
    );
    
    if (foundUser && !selectedUsers.some(u => u.id === foundUser.id)) {
      setSelectedUsers([...selectedUsers, foundUser]);
      setNewMemberInput("");
    }
  };
  
  const handleRemoveMember = (userId: number) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };
  
  const filteredUsers = users.filter(u => 
    !selectedUsers.some(su => su.id === u.id) && 
    u.id !== user?.id &&
    (u.username.toLowerCase().includes(newMemberInput.toLowerCase()) || 
     u.displayName.toLowerCase().includes(newMemberInput.toLowerCase()))
  );
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium text-neutral-900">Create New Project</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="mb-4">
            <Label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">Project Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              className="w-full"
            />
          </div>
          <div className="mb-4">
            <Label htmlFor="type" className="block text-sm font-medium text-neutral-700 mb-1">Project Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select project type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="YouTube Series">YouTube Series</SelectItem>
                <SelectItem value="Video Pitch">Video Pitch</SelectItem>
                <SelectItem value="Interview Series">Interview Series</SelectItem>
                <SelectItem value="Tutorial Series">Tutorial Series</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mb-4">
            <Label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-1">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the project"
              rows={3}
              className="w-full"
            />
          </div>
          <div className="mb-4">
            <Label htmlFor="team" className="block text-sm font-medium text-neutral-700 mb-1">Team Members</Label>
            <div className="flex flex-wrap gap-2 p-2 border border-neutral-300 rounded-md">
              {selectedUsers.map(user => (
                <div key={user.id} className="flex items-center bg-primary/10 text-primary-800 px-2 py-1 rounded-md">
                  <span className="text-sm">{user.displayName}</span>
                  <button 
                    onClick={() => handleRemoveMember(user.id)}
                    className="ml-1 text-primary hover:text-primary/70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <div className="relative flex-1 min-w-[120px]">
                <Input
                  id="new-member"
                  value={newMemberInput}
                  onChange={(e) => setNewMemberInput(e.target.value)}
                  placeholder="Add team members..."
                  className="border-0 shadow-none focus-visible:ring-0 p-1 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newMemberInput) {
                      e.preventDefault();
                      handleAddMember(newMemberInput);
                    }
                  }}
                />
                {newMemberInput && filteredUsers.length > 0 && (
                  <div className="absolute top-full left-0 w-full bg-white border border-neutral-200 rounded-md shadow-md mt-1 z-10">
                    {filteredUsers.map(user => (
                      <div 
                        key={user.id}
                        className="p-2 hover:bg-neutral-100 cursor-pointer"
                        onClick={() => handleAddMember(user.username)}
                      >
                        <div className="flex items-center">
                          <div 
                            className="w-6 h-6 rounded-full text-white flex items-center justify-center mr-2"
                            style={{ backgroundColor: user.avatarColor }}
                          >
                            <span className="text-xs">{user.avatarInitials}</span>
                          </div>
                          <span className="text-sm">{user.displayName} ({user.username})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
