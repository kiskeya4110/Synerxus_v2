import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Mock events
  const events = [
    {
      id: 1,
      title: "Water System Installation",
      project: "Clean Water Initiative",
      projectId: 1,
      type: "volunteer_shift",
      date: "2024-11-15",
      startTime: "09:00",
      endTime: "15:00",
      location: "Community Center A",
      attendees: 8,
      color: "bg-blue-500"
    },
    {
      id: 2,
      title: "Team Meeting",
      project: "Education Access Program",
      projectId: 2,
      type: "meeting",
      date: "2024-11-16",
      startTime: "14:00",
      endTime: "15:30",
      location: "Virtual",
      attendees: 12,
      color: "bg-purple-500"
    },
    {
      id: 3,
      title: "Health Screening Event",
      project: "Medical Outreach",
      projectId: 3,
      type: "volunteer_shift",
      date: "2024-11-18",
      startTime: "08:00",
      endTime: "17:00",
      location: "Mobile Clinic Site 3",
      attendees: 15,
      color: "bg-green-500"
    },
    {
      id: 4,
      title: "Project Proposal Deadline",
      project: "Urban Reforestation",
      projectId: 4,
      type: "deadline",
      date: "2024-11-20",
      startTime: "17:00",
      endTime: "17:00",
      location: "N/A",
      attendees: 0,
      color: "bg-red-500"
    },
    {
      id: 5,
      title: "Volunteer Orientation",
      project: "All Projects",
      projectId: null,
      type: "meeting",
      date: "2024-11-22",
      startTime: "18:00",
      endTime: "20:00",
      location: "Main Office",
      attendees: 25,
      color: "bg-yellow-600"
    }
  ];

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getEventsForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(event => event.date === dateStr);
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <>
      {/* Page Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-2">Calendar</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          View and manage volunteer events, shifts, and deadlines
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={previousMonth} className="min-h-[44px] min-w-[44px]">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={nextMonth} className="min-h-[44px] min-w-[44px]">
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  <Button className="min-h-[44px]" data-testid="button-add-event">
                    <Plus className="h-5 w-5 mr-2" />
                    <span className="hidden sm:inline">Add Event</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {/* Day Headers */}
                {dayNames.map(day => (
                  <div key={day} className="text-center text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 p-2">
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.charAt(0)}</span>
                  </div>
                ))}
                
                {/* Empty cells before month starts */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                
                {/* Calendar Days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayEvents = getEventsForDate(day);
                  const isToday = day === new Date().getDate() && 
                                  currentDate.getMonth() === new Date().getMonth() &&
                                  currentDate.getFullYear() === new Date().getFullYear();
                  
                  return (
                    <div
                      key={day}
                      className={`aspect-square p-1 sm:p-2 border rounded-lg ${
                        isToday ? 'bg-primary/10 border-primary' : 'border-gray-200 dark:border-gray-700'
                      } hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors`}
                    >
                      <div className="h-full flex flex-col">
                        <span className={`text-xs sm:text-sm font-medium ${isToday ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}>
                          {day}
                        </span>
                        <div className="flex-1 mt-1 space-y-0.5 overflow-hidden">
                          {dayEvents.slice(0, 2).map(event => (
                            <div
                              key={event.id}
                              className={`${event.color} text-white text-[0.65rem] sm:text-xs px-1 py-0.5 rounded truncate`}
                              title={event.title}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-[0.65rem] text-gray-600 dark:text-gray-400">
                              +{dayEvents.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Events */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Upcoming Events</CardTitle>
              <CardDescription className="text-sm">Next events and deadlines</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {events.slice(0, 5).map(event => (
                  <div
                    key={event.id}
                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div className={`w-1 h-12 ${event.color} rounded`} />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{event.title}</h4>
                        {event.project && (
                          <Link href="/projects">
                            <Badge variant="outline" className="text-xs mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                              {event.project}
                            </Badge>
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="ml-3 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        <span>{new Date(event.date).toLocaleDateString()}</span>
                      </div>
                      <div>{event.startTime} - {event.endTime}</div>
                      {event.location !== "N/A" && <div>📍 {event.location}</div>}
                      {event.attendees > 0 && (
                        <Link href="/volunteers" className="hover:text-primary">
                          👥 {event.attendees} attendees
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Event Legend */}
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Event Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded" />
                  <span>Volunteer Shift</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded" />
                  <span>Meeting</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded" />
                  <span>Deadline</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded" />
                  <span>Event</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
