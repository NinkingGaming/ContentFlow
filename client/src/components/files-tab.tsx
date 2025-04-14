import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import type { ProjectFile, ProjectFolder } from "@shared/schema";
import { PlusCircle, Folder, File, Upload, Edit, Trash2, FolderPlus, ArrowLeft } from "lucide-react";

type FileBrowserProps = {
  projectId: number;
  currentFolderId: number | null;
  onFolderClick: (folderId: number | null) => void;
  onFileSelect?: (file: ProjectFile) => void;
  selectionMode?: boolean;
  acceptedFileTypes?: string[];
};

function FileBrowser({ 
  projectId, 
  currentFolderId, 
  onFolderClick, 
  onFileSelect,
  selectionMode = false,
  acceptedFileTypes = []
}: FileBrowserProps) {
  const { data: folderData } = useQuery({
    queryKey: ['/api/projects', projectId, 'folders', currentFolderId],
    queryFn: () => {
      const endpoint = currentFolderId === null
        ? `/api/projects/${projectId}/folders/root`
        : `/api/projects/${projectId}/folders/${currentFolderId}`;
      return apiRequest("GET", endpoint).then(res => res.json());
    },
  });

  const files = folderData?.files || [];
  const subfolders = folderData?.subfolders || [];
  const parent = folderData?.parent;

  const handleFileClick = (file: ProjectFile) => {
    if (selectionMode && onFileSelect) {
      if (!acceptedFileTypes.length || 
          acceptedFileTypes.includes(file.mimetype) || 
          acceptedFileTypes.some(type => file.mimetype.startsWith(type.replace('*', '')))) {
        onFileSelect(file);
      } else {
        // Could show an error that file type is not accepted
      }
    } else {
      // View file details
      console.log("View file", file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Navigation breadcrumb */}
      <div className="flex items-center space-x-2">
        {currentFolderId !== null && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onFolderClick(parent?.id || null)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        )}
        <span className="text-sm text-muted-foreground">
          {currentFolderId === null ? 'Root' : folderData?.name}
        </span>
      </div>
      
      {/* Subfolders */}
      {subfolders && subfolders.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">Folders</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {subfolders.map((folder: ProjectFolder) => (
              <Card 
                key={folder.id} 
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => onFolderClick(folder.id)}
              >
                <CardContent className="p-3 flex items-center space-x-2">
                  <Folder className="h-5 w-5 text-muted-foreground" />
                  <span className="truncate">{folder.name}</span>
                </CardContent>
              </Card>
            ))}
          </div>
          <Separator className="my-4" />
        </div>
      )}
      
      {/* Files */}
      <div>
        <h3 className="text-sm font-medium mb-2">Files</h3>
        {files && files.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {files.map((file: ProjectFile) => (
              <Card 
                key={file.id} 
                className={`cursor-pointer hover:bg-accent/50 transition-colors ${
                  selectionMode && 
                  acceptedFileTypes.length && 
                  !acceptedFileTypes.includes(file.mimetype) && 
                  !acceptedFileTypes.some(type => file.mimetype.startsWith(type.replace('*', ''))) 
                    ? 'opacity-50' 
                    : ''
                }`}
                onClick={() => handleFileClick(file)}
              >
                <CardContent className="p-3 flex items-center space-x-2">
                  <File className="h-5 w-5 text-muted-foreground" />
                  <div className="truncate flex-1">
                    <div className="truncate">{file.filename}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No files in this folder
          </div>
        )}
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

type FileUploadDialogProps = {
  projectId: number;
  folderId: number | null;
  isOpen: boolean;
  onClose: () => void;
};

function FileUploadDialog({ projectId, folderId, isOpen, onClose }: FileUploadDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  const uploadFiles = async () => {
    if (!files || files.length === 0) return;
    
    setUploading(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        
        // Create a file entry in the database
        const fileData = {
          projectId,
          filename: file.name,
          originalFilename: file.name,
          filepath: URL.createObjectURL(file), // This would be a temporary URL - in a real app we'd upload to server
          mimetype: file.type,
          size: file.size,
          folderId,
        };
        
        await apiRequest('POST', '/api/files', fileData);
      }
      
      toast({
        title: 'Files uploaded',
        description: 'Your files have been uploaded successfully.',
      });
      
      // Invalidate queries to refresh file list
      queryClient.invalidateQueries({ 
        queryKey: ['/api/projects', projectId, 'folders', folderId] 
      });
      
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload files',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Select files to upload to this folder
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label 
              htmlFor="file-upload" 
              className="flex flex-col items-center justify-center cursor-pointer"
            >
              <Upload className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Click to browse files, or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {files ? `${files.length} file${files.length !== 1 ? 's' : ''} selected` : 'No files selected'}
              </p>
            </label>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={uploadFiles} 
              disabled={!files || files.length === 0 || uploading}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type NewFolderDialogProps = {
  projectId: number;
  parentId: number | null;
  isOpen: boolean;
  onClose: () => void;
};

function NewFolderDialog({ projectId, parentId, isOpen, onClose }: NewFolderDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [folderName, setFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const createFolder = async () => {
    if (!folderName.trim()) return;
    
    setIsCreating(true);
    
    try {
      const folderData = {
        projectId,
        name: folderName.trim(),
        parentId,
      };
      
      await apiRequest('POST', '/api/folders', folderData);
      
      toast({
        title: 'Folder created',
        description: 'The folder has been created successfully.',
      });
      
      // Invalidate queries to refresh folder list
      queryClient.invalidateQueries({ 
        queryKey: ['/api/projects', projectId, 'folders', parentId] 
      });
      
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create folder',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Folder</DialogTitle>
          <DialogDescription>
            Create a new folder to organize your files
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              placeholder="Enter folder name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={createFolder} 
              disabled={!folderName.trim() || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Folder'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type FilePickerProps = {
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (file: ProjectFile) => void;
  acceptedFileTypes?: string[];
};

function FilePicker({ projectId, isOpen, onClose, onSelect, acceptedFileTypes = [] }: FilePickerProps) {
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);

  const handleFileSelect = (file: ProjectFile) => {
    onSelect(file);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Select a File</DialogTitle>
          <DialogDescription>
            Browse your project files to select one
          </DialogDescription>
        </DialogHeader>
        
        <div className="h-[60vh] overflow-y-auto">
          <FileBrowser 
            projectId={projectId}
            currentFolderId={currentFolderId}
            onFolderClick={setCurrentFolderId}
            onFileSelect={handleFileSelect}
            selectionMode={true}
            acceptedFileTypes={acceptedFileTypes}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FilesTab({ projectId }: { projectId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  
  // Mutation to delete a file
  const deleteFileMutation = useMutation({
    mutationFn: (fileId: number) => 
      apiRequest('DELETE', `/api/files/${fileId}`),
    onSuccess: () => {
      toast({
        title: 'File deleted',
        description: 'The file has been deleted successfully.',
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/projects', projectId, 'folders', currentFolderId] 
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete the file: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Mutation to delete a folder
  const deleteFolderMutation = useMutation({
    mutationFn: (folderId: number) => 
      apiRequest('DELETE', `/api/folders/${folderId}`),
    onSuccess: () => {
      toast({
        title: 'Folder deleted',
        description: 'The folder has been deleted successfully.',
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/projects', projectId, 'folders', currentFolderId] 
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete the folder: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Files</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setIsNewFolderDialogOpen(true)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
          <Button onClick={() => setIsUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
        </div>
      </div>
      
      <Separator />
      
      <FileBrowser 
        projectId={projectId}
        currentFolderId={currentFolderId}
        onFolderClick={setCurrentFolderId}
      />
      
      <FileUploadDialog 
        projectId={projectId}
        folderId={currentFolderId}
        isOpen={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
      />
      
      <NewFolderDialog
        projectId={projectId}
        parentId={currentFolderId}
        isOpen={isNewFolderDialogOpen}
        onClose={() => setIsNewFolderDialogOpen(false)}
      />
    </div>
  );
}

export { FilePicker };