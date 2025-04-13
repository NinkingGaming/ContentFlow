import { ContentWithAssignee } from "@shared/schema";
import { format } from "date-fns";
import { useDrag } from "react-dnd";

interface ContentCardProps {
  content: ContentWithAssignee;
  columnId: number;
}

export function ContentCard({ content, columnId }: ContentCardProps) {
  const [{ isDragging }, drag] = useDrag({
    type: "CONTENT_CARD",
    item: { id: content.id, columnId },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });
  
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "";
    return format(new Date(date), "MMM d");
  };
  
  const getTypeStyle = () => {
    switch (content.type) {
      case "Idea":
        return "bg-yellow-100 text-yellow-800";
      case "Script":
        return "bg-blue-100 text-blue-800";
      case "Storyboard":
        return "bg-blue-100 text-blue-800";
      case "Shooting":
        return "bg-purple-100 text-purple-800";
      case "Editing":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  const getPriorityBadge = () => {
    if (content.priority === "High") {
      return (
        <span className="text-xs py-0.5 px-2 bg-red-100 text-red-800 rounded-full mr-1">High Priority</span>
      );
    }
    return null;
  };
  
  return (
    <div 
      ref={drag}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="mb-2 bg-white rounded-md border border-neutral-200 shadow-sm p-3 cursor-move hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start">
        <span className={`text-xs py-0.5 px-2 rounded-full ${getTypeStyle()}`}>{content.type}</span>
        <button className="text-neutral-400 hover:text-neutral-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
        </button>
      </div>
      <h4 className="font-medium mt-2 text-neutral-800">{content.title}</h4>
      <p className="text-sm text-neutral-600 mt-1">{content.description}</p>
      
      {content.progress !== undefined && content.progress > 0 && (
        <div className="flex items-center mt-2">
          <div className="w-full bg-neutral-200 rounded-full h-1.5">
            <div 
              className="bg-blue-500 h-1.5 rounded-full" 
              style={{ width: `${content.progress}%` }}
            ></div>
          </div>
          <span className="ml-2 text-xs text-neutral-500">{content.progress}%</span>
        </div>
      )}
      
      {content.priority === "High" && (
        <div className="mt-2 flex">
          {getPriorityBadge()}
          {content.dueDate && (
            <span className="text-xs py-0.5 px-2 bg-orange-100 text-orange-800 rounded-full">Scheduled</span>
          )}
        </div>
      )}
      
      <div className="mt-4 flex justify-between items-center">
        <div className="flex items-center">
          {content.assignee && (
            <div 
              className="w-6 h-6 rounded-full text-white flex items-center justify-center text-xs"
              style={{ backgroundColor: content.assignee.avatarColor || "#3B82F6" }}
            >
              {content.assignee.avatarInitials}
            </div>
          )}
          {content.dueDate && (
            <div className="text-xs text-neutral-500 ml-1">{formatDate(content.dueDate)}</div>
          )}
        </div>
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-neutral-400 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.48-8.48l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
          <span className="text-xs text-neutral-500">{content.attachmentCount || 0}</span>
        </div>
      </div>
    </div>
  );
}
