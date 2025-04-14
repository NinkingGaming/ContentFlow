import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { User } from '@shared/schema';
import { Loader2, Trash2, ClipboardList, Users, FileText } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Link, useLocation } from 'wouter';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from 'react';

interface Project {
  id: number;
  name: string;
  description: string | null;
  type: string;
  createdAt: Date;
  createdBy: number;
  members?: User[];
}

interface ProjectContextMenuProps {
  project: Project;
  children: React.ReactNode;
}

export function ProjectContextMenu({ project, children }: ProjectContextMenuProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Check if current user is admin or the project creator
  const canDelete = user?.role === 'admin' || project.createdBy === user?.id;

  const deleteMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await apiRequest('DELETE', `/api/projects/${projectId}`, undefined);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete project');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: 'Project deleted',
        description: `${project.name} has been deleted successfully.`,
      });
      
      // Navigate to dashboard if we're on the project page
      if (window.location.pathname.includes(`/projects/${project.id}`)) {
        navigate('/');
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting project',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleDelete = () => {
    setConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(project.id);
    setConfirmDialogOpen(false);
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          <ContextMenuItem asChild>
            <Link to={`/projects/${project.id}`} className="flex items-center">
              <ClipboardList className="mr-2 h-4 w-4" />
              <span>Open Project</span>
            </Link>
          </ContextMenuItem>
          
          <ContextMenuItem asChild>
            <Link to={`/projects/${project.id}?tab=script`} className="flex items-center">
              <FileText className="mr-2 h-4 w-4" />
              <span>Edit Script</span>
            </Link>
          </ContextMenuItem>
          
          <ContextMenuItem asChild>
            <Link to={`/projects/${project.id}?tab=team`} className="flex items-center">
              <Users className="mr-2 h-4 w-4" />
              <span>Manage Team</span>
            </Link>
          </ContextMenuItem>
          
          <ContextMenuSeparator />
          
          {canDelete && (
            <ContextMenuItem 
              onClick={handleDelete}
              className="text-red-600 focus:text-red-500 focus:bg-red-50"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete Project</span>
                </>
              )}
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project
              <strong> {project.name}</strong> and all of its data including script, files, and content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}