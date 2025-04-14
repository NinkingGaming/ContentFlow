import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, Eye } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { type PublishedFinal } from "@shared/schema";

export function DocumentsTabContent({ projectId }: { projectId: number }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [publishedFinals, setPublishedFinals] = useState<PublishedFinal[]>([]);
  const [finalViewDialogOpen, setFinalViewDialogOpen] = useState(false);
  const [selectedFinal, setSelectedFinal] = useState<PublishedFinal | null>(null);
  
  // Fetch published finals
  useEffect(() => {
    const fetchPublishedFinals = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/published-finals`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setPublishedFinals(data);
        } else {
          console.error("Failed to fetch published finals:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching published finals:", error);
      }
    };
    
    fetchPublishedFinals();
  }, [projectId]);
  
  // View a published final
  const viewFinal = async (doc: PublishedFinal) => {
    try {
      // Fetch the full details of the published final
      const response = await fetch(`/api/published-finals/${doc.id}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch document details');
      }
      
      const finalData = await response.json();
      setSelectedFinal(finalData);
      setFinalViewDialogOpen(true);
    } catch (error) {
      console.error("Error fetching published final:", error);
      toast({
        title: "Error",
        description: "Failed to load the published document",
        variant: "destructive"
      });
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Published Documents</h3>
      </div>
      
      {publishedFinals.length > 0 ? (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Published By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {publishedFinals.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.title}</TableCell>
                  <TableCell>V{doc.version}</TableCell>
                  <TableCell>{doc.creatorDisplayName}</TableCell>
                  <TableCell>{formatDate(doc.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="icon" onClick={() => viewFinal(doc)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-md p-8 flex flex-col items-center justify-center text-center gap-4">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-medium mb-1">No Published Documents</h3>
            <p className="text-muted-foreground">
              Finalize your script and click "Publish" to add documents here.
            </p>
          </div>
        </div>
      )}
      
      {/* Document View Dialog */}
      <Dialog open={finalViewDialogOpen} onOpenChange={setFinalViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedFinal?.title} - V{selectedFinal?.version}</DialogTitle>
            <DialogDescription>
              Published by {selectedFinal?.creatorDisplayName} on {selectedFinal && formatDate(selectedFinal.createdAt)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <div className="border rounded p-4 min-h-[300px] prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedFinal?.content || "" }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}