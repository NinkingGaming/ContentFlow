import { useRef } from "react";
import { useDrag } from "react-dnd";
import { ScheduleEvent } from "@shared/schema";
import { cn } from "@/lib/utils";

interface EventItemProps {
  event: ScheduleEvent;
  isPlaced?: boolean;
  onRemove?: (eventId: number) => void;
}

export function EventItem({ event, isPlaced = false, onRemove }: EventItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  
  const [{ isDragging }, drag] = useDrag({
    type: "SCHEDULE_EVENT",
    item: { id: event.id, type: event.type, title: event.title, color: event.color },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  
  // Connect the drag ref
  drag(ref);
  
  // Visual styles based on event type
  const typeStyles = {
    filming_day: "bg-red-500 border-red-600 bg-gradient-to-r from-red-500 to-red-600",
    upload_day: "bg-green-500 border-green-600 bg-gradient-to-r from-green-500 to-green-600",
    secondary_filming_day: "bg-blue-500 border-blue-600 bg-gradient-to-r from-blue-500 to-blue-600",
  };
  
  // Icons for different event types
  const typeIcons = {
    filming_day: "📹",
    upload_day: "🚀",
    secondary_filming_day: "🎬",
  };
  
  const eventStyle = event.type in typeStyles 
    ? typeStyles[event.type as keyof typeof typeStyles]
    : "bg-gray-500 border-gray-600";
    
  const eventIcon = event.type in typeIcons
    ? typeIcons[event.type as keyof typeof typeIcons]
    : "📅";
  
  return (
    <div
      ref={ref}
      className={cn(
        "relative rounded-md p-2 text-white font-medium text-sm shadow-md border-2 cursor-move",
        eventStyle,
        isDragging ? "opacity-50" : "opacity-100",
        isPlaced ? "mb-1" : "mb-2"
      )}
      style={{ maxWidth: isPlaced ? "100%" : "200px" }}
    >
      <div className="flex justify-between items-center">
        <span className="flex items-center">
          <span className="mr-1">{eventIcon}</span>
          <span>{event.title}</span>
        </span>
        {isPlaced && onRemove && (
          <button 
            onClick={() => onRemove(event.id)}
            className="ml-2 text-white hover:text-red-200 focus:outline-none"
          >
            ×
          </button>
        )}
      </div>
      {event.notes && <div className="text-xs mt-1 text-white/80">{event.notes}</div>}
    </div>
  );
}