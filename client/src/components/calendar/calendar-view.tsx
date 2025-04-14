import { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarDay } from './calendar-day';
import { EventSource } from './event-source';
import { useSchedule, ScheduleEventInput } from '@/hooks/use-schedule';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScheduleEvent } from '@shared/schema';
import { format } from 'date-fns';

interface CalendarViewProps {
  projectId: number;
}

export function CalendarView({ projectId }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(currentDate.getMonth());
  const [currentYear, setCurrentYear] = useState(currentDate.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newEventType, setNewEventType] = useState<string | null>(null);
  const [eventNotes, setEventNotes] = useState('');
  
  const {
    events,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useSchedule(projectId);

  // Handle month navigation
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };
  
  // Generate calendar days including padding for previous/next months
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };
  
  const getCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);
    const calendarDays: Date[] = [];
    
    // Add days from previous month for padding
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const daysInPrevMonth = getDaysInMonth(prevMonthYear, prevMonth);
    
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      calendarDays.push(new Date(prevMonthYear, prevMonth, daysInPrevMonth - i));
    }
    
    // Add days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push(new Date(currentYear, currentMonth, i));
    }
    
    // Add days from next month for padding to complete 6 rows
    const totalDaysNeeded = 42; // 6 rows of 7 days
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    
    let nextMonthDay = 1;
    while (calendarDays.length < totalDaysNeeded) {
      calendarDays.push(new Date(nextMonthYear, nextMonth, nextMonthDay++));
    }
    
    return calendarDays;
  };

  // Filter events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === date.getDate() &&
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getFullYear() === date.getFullYear();
    });
  };
  
  // Handle dropping an event on a calendar day
  const handleDropEvent = (date: Date, eventData: any) => {
    if (eventData.id < 0) {
      // This is a template event, create a new one
      const eventInput: ScheduleEventInput = {
        title: eventData.title,
        type: eventData.type as "filming_day" | "upload_day" | "secondary_filming_day",
        date: date,
        notes: null,
        color: eventData.color,
      };
      
      // Show dialog for optional notes
      setSelectedDate(date);
      setNewEventType(eventData.type);
      setEventNotes('');
    } else {
      // This is an existing event, update its date
      updateEvent({
        eventId: eventData.id,
        data: { date: date }
      });
    }
  };
  
  // Handle creating a new event
  const handleCreateEvent = (type: string) => {
    // Show dialog to select date and enter notes
    setNewEventType(type);
    setSelectedDate(new Date(currentYear, currentMonth, 15)); // Default to middle of month
    setEventNotes('');
  };
  
  // Handle saving a new event from dialog
  const handleSaveEvent = () => {
    if (!selectedDate || !newEventType) return;
    
    // Determine title and color based on type
    let title = "Event";
    let color = "#6B7280"; // gray
    
    if (newEventType === 'filming_day') {
      title = "Filming Day";
      color = "#EF4444"; // red
    } else if (newEventType === 'secondary_filming_day') {
      title = "Secondary Filming Day";
      color = "#3B82F6"; // blue
    } else if (newEventType === 'upload_day') {
      title = "Upload Day";
      color = "#10B981"; // green
    }
    
    // Create the event
    const eventInput: ScheduleEventInput = {
      title,
      type: newEventType as "filming_day" | "upload_day" | "secondary_filming_day",
      date: selectedDate,
      notes: eventNotes || null,
      color,
    };
    
    createEvent(eventInput);
    
    // Reset dialog state
    setSelectedDate(null);
    setNewEventType(null);
    setEventNotes('');
  };
  
  // Get the calendar days
  const calendarDays = getCalendarDays();
  
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
          <div>
            <h2 className="text-2xl font-bold">Schedule Calendar</h2>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Plan filming days and upload schedules
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPreviousMonth}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <h3 className="text-lg font-medium min-w-[180px] text-center">
                {new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextMonth}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date();
                setCurrentMonth(now.getMonth());
                setCurrentYear(now.getFullYear());
              }}
            >
              Today
            </Button>
          </div>
          
          <div className="flex gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
              <span>Filming</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
              <span>Secondary</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
              <span>Upload</span>
            </div>
          </div>
        </div>
        
        <EventSource 
          events={events} 
          onCreateEvent={handleCreateEvent} 
        />
        
        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
          {/* Calendar header */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="bg-gray-100 dark:bg-gray-800 p-2 text-center font-medium">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {calendarDays.map((date, index) => (
            <CalendarDay
              key={index}
              date={date}
              events={getEventsForDate(date)}
              isCurrentMonth={date.getMonth() === currentMonth}
              onDropEvent={handleDropEvent}
              onRemoveEvent={deleteEvent}
            />
          ))}
        </div>
        
        {/* New Event Dialog */}
        <Dialog 
          open={!!selectedDate && !!newEventType} 
          onOpenChange={(open) => {
            if (!open) {
              setSelectedDate(null);
              setNewEventType(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                {newEventType === 'filming_day' && (
                  <>
                    <span className="mr-2 text-xl">📹</span>
                    <span className="bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
                      Add Filming Day
                    </span>
                  </>
                )}
                {newEventType === 'secondary_filming_day' && (
                  <>
                    <span className="mr-2 text-xl">🎬</span>
                    <span className="bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                      Add Secondary Filming Day
                    </span>
                  </>
                )}
                {newEventType === 'upload_day' && (
                  <>
                    <span className="mr-2 text-xl">🚀</span>
                    <span className="bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
                      Add Upload Day
                    </span>
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="font-medium">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(new Date(e.target.value));
                    }
                  }}
                  className="border-2"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes" className="font-medium">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any details about this event..."
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  className="min-h-[100px] border-2"
                />
              </div>
            </div>
            
            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedDate(null);
                  setNewEventType(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveEvent}
                className={
                  newEventType === 'filming_day' 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : newEventType === 'secondary_filming_day'
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-green-500 hover:bg-green-600'
                }
              >
                Save Event
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DndProvider>
  );
}