import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

export interface Event {
  id: string;
  title: string;
  dateTime: string;
  type: "primary" | "success" | "warning" | "info";
}

interface UpcomingEventsProps {
  events: Event[];
}

export default function UpcomingEvents({ events }: UpcomingEventsProps) {
  const getEventBorderColor = (type: Event["type"]) => {
    switch (type) {
      case "primary":
        return "border-primary-500";
      case "success":
        return "border-success-500";
      case "warning":
        return "border-yellow-500";
      case "info":
        return "border-purple-500";
      default:
        return "border-gray-500";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2 border-b border-gray-200 dark:border-gray-700">
        <CardTitle className="text-lg font-semibold">Upcoming Events</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          {events.map((event) => (
            <div 
              key={event.id}
              className={`border-l-4 ${getEventBorderColor(event.type)} pl-3 py-1`}
            >
              <p className="font-medium">{event.title}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{event.dateTime}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <Link href="/calendar" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">View calendar</Link>
        </div>
      </CardContent>
    </Card>
  );
}
