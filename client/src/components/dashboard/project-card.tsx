import { CalendarIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface ProjectCardProps {
  title: string;
  description: string;
  status: "Planning" | "In Progress" | "Completed" | "On Hold";
  progress: number;
  timeRemaining: string;
  volunteers: {
    id: string;
    name: string;
    avatar?: string;
  }[];
}

export default function ProjectCard({
  title,
  description,
  status,
  progress,
  timeRemaining,
  volunteers
}: ProjectCardProps) {
  const getStatusBadgeClasses = () => {
    switch (status) {
      case "Planning":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400";
      case "In Progress":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400";
      case "Completed":
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400";
      case "On Hold":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400";
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-lg">{title}</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{description}</p>
        </div>
        <Badge variant="outline" className={getStatusBadgeClasses()}>
          {status}
        </Badge>
      </div>
      
      <div className="mt-4">
        <div className="flex justify-between text-sm mb-1">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-2.5" />
      </div>
      
      <div className="flex justify-between items-center mt-4 text-sm">
        <div className="flex items-center text-gray-600 dark:text-gray-400">
          <CalendarIcon className="h-4 w-4 mr-1" />
          <span>{timeRemaining}</span>
        </div>
        
        <div className="flex -space-x-2">
          {volunteers.slice(0, 3).map((volunteer) => (
            <Avatar key={volunteer.id} className="w-7 h-7 border-2 border-white dark:border-gray-800">
              <AvatarImage src={volunteer.avatar} alt={`${volunteer.name} avatar`} />
              <AvatarFallback>{volunteer.name.charAt(0)}</AvatarFallback>
            </Avatar>
          ))}
          {volunteers.length > 3 && (
            <div className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium">
              +{volunteers.length - 3}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
