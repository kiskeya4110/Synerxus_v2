import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();
  
  // Format status for display (capitalize first letter of each word)
  const formatStatus = (str: string) => {
    return str
      .split(/[-\s]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get color based on status
  const getStatusColor = (status: string) => {
    switch (status) {
      // Active/In Progress states - Blue
      case 'active':
      case 'in progress':
      case 'in-progress':
      case 'ongoing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300';
      
      // Completed states - Green
      case 'completed':
      case 'done':
      case 'finished':
      case 'accepted':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300';
      
      // Pending/Planning states - Yellow/Orange
      case 'pending':
      case 'planning':
      case 'to do':
      case 'todo':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300';
      
      // On Hold states - Orange
      case 'on-hold':
      case 'on hold':
      case 'paused':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-300';
      
      // Rejected/Declined/Closed states - Red
      case 'rejected':
      case 'declined':
      case 'closed':
      case 'cancelled':
      case 'canceled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300';
      
      // Withdrawn states - Gray
      case 'withdrawn':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-300';
      
      // Open/Available states - Cyan
      case 'open':
      case 'available':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200 border-cyan-300';
      
      // Filled states - Purple
      case 'filled':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-300';
      
      // Default - Gray
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-300';
    }
  };

  return (
    <Badge 
      className={cn(
        "font-medium border",
        getStatusColor(normalizedStatus),
        className
      )}
      data-testid={`status-badge-${normalizedStatus}`}
    >
      {formatStatus(status)}
    </Badge>
  );
}
