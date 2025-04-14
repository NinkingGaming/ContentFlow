import { ContentCard } from "./content-card";
import { ColumnWithContents } from "@shared/schema";
import { useDrop } from "react-dnd";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface ProjectColumnProps {
  column: ColumnWithContents;
  onAddContent: (columnId: number) => void;
}

export function ProjectColumn({ column, onAddContent }: ProjectColumnProps) {
  const { toast } = useToast();
  
  const [{ isOver }, drop] = useDrop({
    accept: "CONTENT_CARD",
    drop: (item: any) => handleDrop(item.id, item.columnId),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });
  
  const handleDrop = async (contentId: number, sourceColumnId: number) => {
    if (sourceColumnId === column.id) return;
    
    try {
      await apiRequest("POST", `/api/contents/${contentId}/move`, {
        columnId: column.id,
        order: column.contents.length,
      });
      
      // Invalidate both columns to refetch data
      await queryClient.invalidateQueries({ queryKey: [`/api/projects/${column.projectId}/columns`] });
      
      toast({
        title: "Content moved",
        description: "The content has been moved to a new column.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to move the content.",
        variant: "destructive",
      });
    }
  };
  
  // Calculate column width - if width property exists, use it, otherwise default to 1
  const columnWidth = column.width || 1;
  
  return (
    <div 
      ref={drop}
      className={`flex-1 flex flex-col bg-white rounded-md shadow-sm border ${isOver ? 'border-primary border-dashed' : 'border-neutral-200'} min-w-[280px]`}
      style={{ 
        flexGrow: columnWidth, 
        maxWidth: `${columnWidth * 340}px` 
      }}
    >
      <div className="p-3 border-b border-neutral-200 flex items-center justify-between">
        <div className="flex items-center">
          <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: column.color }}></span>
          <h3 className="font-medium text-neutral-800">{column.name}</h3>
          <span className="ml-2 text-xs py-0.5 px-2 bg-neutral-100 rounded-full text-neutral-600">
            {column.contents.length}
          </span>
        </div>
        <button 
          onClick={() => onAddContent(column.id)}
          className="text-neutral-400 hover:text-neutral-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>
      <div className="p-2 flex-1 overflow-y-auto">
        {column.contents.length > 0 ? (
          column.contents.map(content => (
            <ContentCard key={content.id} content={content} columnId={column.id} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center p-4">
            <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </div>
            <p className="text-sm text-neutral-500">Drag items here or add a new card</p>
            <button 
              onClick={() => onAddContent(column.id)}
              className="mt-2 text-sm text-primary flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>Add a card</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
