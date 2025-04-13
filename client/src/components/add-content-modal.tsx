import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, Column } from "@shared/schema";

interface AddContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  selectedColumnId: number | null;
  columns: Column[];
  users: User[];
}

export function AddContentModal({ 
  isOpen, 
  onClose, 
  projectId, 
  selectedColumnId,
  columns,
  users 
}: AddContentModalProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Idea");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [columnId, setColumnId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  
  // Set initial column ID when modal opens
  useEffect(() => {
    if (selectedColumnId) {
      setColumnId(selectedColumnId);
    } else if (columns.length > 0) {
      setColumnId(columns[0].id);
    }
  }, [selectedColumnId, columns, isOpen]);
  
  const resetForm = () => {
    setTitle("");
    setType("Idea");
    setDescription("");
    setAssignedTo("");
    setDueDate("");
    setPriority("Medium");
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Content title is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!columnId) {
      toast({
        title: "Error",
        description: "Column is required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const contentData = {
        title,
        description,
        type,
        columnId,
        projectId,
        assignedTo: assignedTo ? parseInt(assignedTo) : undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        priority
      };
      
      await apiRequest("POST", "/api/contents", contentData);
      
      // Invalidate columns query to refresh the board
      await queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/columns`] });
      
      toast({
        title: "Success",
        description: "Content added successfully",
      });
      
      handleClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add content",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium text-neutral-900">Add Content</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="mb-4">
            <Label htmlFor="title" className="block text-sm font-medium text-neutral-700 mb-1">Content Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter content title"
              className="w-full"
            />
          </div>
          <div className="mb-4">
            <Label htmlFor="type" className="block text-sm font-medium text-neutral-700 mb-1">Content Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Idea">Idea</SelectItem>
                <SelectItem value="Script">Script</SelectItem>
                <SelectItem value="Storyboard">Storyboard</SelectItem>
                <SelectItem value="Shooting">Shooting</SelectItem>
                <SelectItem value="Editing">Editing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mb-4">
            <Label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-1">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the content"
              rows={3}
              className="w-full"
            />
          </div>
          <div className="mb-4">
            <Label htmlFor="column" className="block text-sm font-medium text-neutral-700 mb-1">Column</Label>
            <Select 
              value={columnId?.toString() || ""} 
              onValueChange={(value) => setColumnId(parseInt(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map(column => (
                  <SelectItem key={column.id} value={column.id.toString()}>
                    {column.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="assignedTo" className="block text-sm font-medium text-neutral-700 mb-1">Assigned To</Label>
              <Select 
                value={assignedTo} 
                onValueChange={setAssignedTo}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dueDate" className="block text-sm font-medium text-neutral-700 mb-1">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          <div className="mb-4">
            <Label className="block text-sm font-medium text-neutral-700 mb-1">Priority</Label>
            <RadioGroup value={priority} onValueChange={setPriority} className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Low" id="low" />
                <Label htmlFor="low">Low</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Medium" id="medium" />
                <Label htmlFor="medium">Medium</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="High" id="high" />
                <Label htmlFor="high">High</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="mb-4">
            <Label className="block text-sm font-medium text-neutral-700 mb-1">Attachments</Label>
            <div className="border border-dashed border-neutral-300 rounded-md p-4 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              <p className="text-sm text-neutral-500 mb-1 mt-2">Drag and drop files here, or click to browse</p>
              <Button variant="outline" size="sm" className="mt-1">Browse files</Button>
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
                Adding...
              </>
            ) : 'Add Content'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
