import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Clock, Award, Target } from "lucide-react";
import { getSDGColor, getSDGName } from "@/lib/sdg-utils";

interface VolunteerSpotlightProps {
  volunteer: {
    id: number;
    name: string;
    avatar?: string;
    hours: number;
    activities?: number;
    projects?: number;
    sdgsContributed?: number[];
    impactScore?: number;
    quote?: string;
    skills?: string[];
  };
  period?: string;
  title?: string;
  variant?: "compact" | "full";
}


export function VolunteerSpotlight({
  volunteer,
  period = "This Quarter",
  title = "Impact Leader",
  variant = "full",
}: VolunteerSpotlightProps) {
  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800"
      >
        <Avatar className="h-10 w-10 ring-2 ring-amber-400">
          <AvatarImage src={volunteer.avatar} />
          <AvatarFallback className="bg-amber-100 text-amber-700">
            {getInitials(volunteer.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {volunteer.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {volunteer.hours} hours • {period}
          </p>
        </div>
        <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
      </motion.div>
    );
  }

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-amber-900/20 dark:via-gray-800 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
      <CardContent className="p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-4"
        >
          <div className="p-2 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
            <Star className="h-4 w-4 text-white fill-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{period}</p>
          </div>
        </motion.div>

        {/* Volunteer info */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-start gap-4"
        >
          <Avatar className="h-16 w-16 ring-4 ring-amber-400 ring-offset-2 dark:ring-offset-gray-800">
            <AvatarImage src={volunteer.avatar} />
            <AvatarFallback className="bg-amber-100 text-amber-700 text-xl font-bold">
              {getInitials(volunteer.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white">
              {volunteer.name}
            </h4>

            {/* Stats row */}
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="font-medium">{volunteer.hours}</span>
                <span className="text-gray-400">hours</span>
              </div>
              {volunteer.activities && (
                <div className="flex items-center gap-1">
                  <Award className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">{volunteer.activities}</span>
                  <span className="text-gray-400">activities</span>
                </div>
              )}
              {volunteer.impactScore && (
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">{volunteer.impactScore}</span>
                  <span className="text-gray-400">score</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Quote if available */}
        {volunteer.quote && (
          <motion.blockquote
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 pl-4 border-l-2 border-amber-400 italic text-gray-600 dark:text-gray-300 text-sm"
          >
            "{volunteer.quote}"
          </motion.blockquote>
        )}

        {/* SDG contributions */}
        {volunteer.sdgsContributed && volunteer.sdgsContributed.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              SDGs Contributed
            </p>
            <div className="flex flex-wrap gap-1">
              {volunteer.sdgsContributed.slice(0, 5).map((sdgId) => (
                <Badge
                  key={sdgId}
                  variant="secondary"
                  className="text-white text-xs px-2 py-0.5"
                  style={{ backgroundColor: getSDGColor(sdgId) }}
                >
                  SDG {sdgId}
                </Badge>
              ))}
              {volunteer.sdgsContributed.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{volunteer.sdgsContributed.length - 5} more
                </Badge>
              )}
            </div>
          </motion.div>
        )}

        {/* Skills */}
        {volunteer.skills && volunteer.skills.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-4"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Key Skills Applied
            </p>
            <div className="flex flex-wrap gap-1">
              {volunteer.skills.slice(0, 4).map((skill, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

export default VolunteerSpotlight;
