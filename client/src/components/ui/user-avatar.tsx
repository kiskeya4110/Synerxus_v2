import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  className?: string;
  fallbackClassName?: string;
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  
  if (email) {
    const emailName = email.split('@')[0];
    return emailName.slice(0, 2).toUpperCase();
  }
  
  return 'U';
}

export default function UserAvatar({ src, name, email, className = "h-8 w-8", fallbackClassName = "" }: UserAvatarProps) {
  const initials = getInitials(name, email);
  
  return (
    <Avatar className={className}>
      {src && <AvatarImage src={src} alt={name || email || "User avatar"} />}
      <AvatarFallback className={fallbackClassName}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
