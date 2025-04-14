import { useState } from 'react';
import { EventItem } from './event-item';
import { ScheduleEvent } from '@shared/schema';

interface EventSourceProps {
  events: ScheduleEvent[];
  onCreateEvent: (type: string) => void;
}

export function EventSource({ events, onCreateEvent }: EventSourceProps) {
  // Check if we've already placed a filming day event
  const hasFilmingDay = events.some(e => e.type === 'filming_day');
  
  // These are template events, not real events from the database
  const templateEvents: ScheduleEvent[] = [
    {
      id: -1, // Placeholder ID for template
      projectId: 0,
      title: hasFilmingDay ? "Secondary Filming Day" : "Filming Day",
      type: hasFilmingDay ? "secondary_filming_day" : "filming_day",
      date: new Date(),
      notes: null,
      color: hasFilmingDay ? "#3B82F6" : "#EF4444", // blue if secondary, red if primary
      createdAt: new Date(),
      createdBy: 0,
    },
    {
      id: -2, // Placeholder ID for template
      projectId: 0,
      title: "Upload Day",
      type: "upload_day",
      date: new Date(),
      notes: null,
      color: "#10B981", // green
      createdAt: new Date(),
      createdBy: 0,
    }
  ];

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Drag to calendar</h3>
        <div className="flex flex-col md:flex-row gap-2">
          {templateEvents.map(event => (
            <div key={event.id} className="cursor-grab">
              <EventItem event={event} />
            </div>
          ))}
        </div>
      </div>
      
      <div className="ml-auto self-center">
        <div className="text-xs text-gray-500 mb-1">
          Drag items to schedule or click to add:
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onCreateEvent(hasFilmingDay ? 'secondary_filming_day' : 'filming_day')}
            className="px-3 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
          >
            {hasFilmingDay ? "Add Secondary Filming" : "Add Filming Day"}
          </button>
          <button
            onClick={() => onCreateEvent('upload_day')}
            className="px-3 py-1 text-xs font-medium rounded-md bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800"
          >
            Add Upload Day
          </button>
        </div>
      </div>
    </div>
  );
}