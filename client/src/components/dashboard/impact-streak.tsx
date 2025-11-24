import { Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useMemo } from "react";

interface Activity {
  date: string;
  hours?: number;
}

interface ImpactStreakProps {
  activities: Activity[];
}

export default function ImpactStreak({ activities }: ImpactStreakProps) {
  const { currentStreak, bestStreak, lastActivityDate } = useMemo(() => {
    if (!activities || activities.length === 0) {
      return { currentStreak: 0, bestStreak: 0, lastActivityDate: null };
    }

    // Parse dates and sort in descending order, filtering out invalid dates
    const uniqueDates = Array.from(
      new Set(
        activities
          .filter((a) => a.date && !isNaN(new Date(a.date).getTime()))
          .map((a) => {
            const date = new Date(a.date);
            return date.toISOString().split("T")[0];
          })
      )
    )
      .map((dateStr) => new Date(dateStr))
      .sort((a, b) => b.getTime() - a.getTime());

    if (uniqueDates.length === 0) {
      return { currentStreak: 0, bestStreak: 0, lastActivityDate: null };
    }

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 1;
    let lastActivityDate = uniqueDates[0];

    // Check if the most recent date is today or yesterday
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const mostRecentDate = new Date(uniqueDates[0]);
    mostRecentDate.setHours(0, 0, 0, 0);

    // Only count if activity was recent (today or yesterday)
    if (
      mostRecentDate.getTime() === today.getTime() ||
      mostRecentDate.getTime() === yesterday.getTime()
    ) {
      currentStreak = 1;

      // Calculate consecutive days
      for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(uniqueDates[i - 1]);
        const currDate = new Date(uniqueDates[i]);
        prevDate.setHours(0, 0, 0, 0);
        currDate.setHours(0, 0, 0, 0);

        const diffTime = prevDate.getTime() - currDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
          tempStreak++;
          currentStreak = tempStreak;
        } else {
          break;
        }
      }
    }

    // Calculate best streak
    tempStreak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currDate = new Date(uniqueDates[i]);
      prevDate.setHours(0, 0, 0, 0);
      currDate.setHours(0, 0, 0, 0);

      const diffTime = prevDate.getTime() - currDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (diffDays === 1) {
        tempStreak++;
      } else {
        bestStreak = Math.max(bestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    bestStreak = Math.max(bestStreak, tempStreak);

    return { currentStreak, bestStreak, lastActivityDate };
  }, [activities]);

  const streakMessage =
    currentStreak === 0
      ? "Start your streak today!"
      : currentStreak === 1
        ? "You're on fire! 🔥"
        : currentStreak < 7
          ? "Keep it up! 💪"
          : currentStreak < 30
            ? "Amazing streak! 🚀"
            : "Unstoppable! ⚡";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800/50 shadow-lg">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Impact Streak
              </p>
              <div className="flex items-baseline gap-2">
                <motion.p
                  className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400 bg-clip-text text-transparent"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "loop",
                  }}
                >
                  {currentStreak}
                </motion.p>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  days
                </span>
              </div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-2">
                {streakMessage}
              </p>
              {bestStreak > 0 && bestStreak !== currentStreak && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Best streak: {bestStreak} days
                </p>
              )}
            </div>

            <motion.div
              className="flex-shrink-0"
              animate={{
                rotate: [0, 5, -5, 0],
                scale: currentStreak > 0 ? [1, 1.1, 1] : 1,
              }}
              transition={{
                duration: 2,
                repeat: currentStreak > 0 ? Infinity : 0,
                repeatType: "loop",
              }}
            >
              <motion.div
                animate={
                  currentStreak > 0
                    ? {
                        opacity: [0.6, 1, 0.6],
                        filter: [
                          "drop-shadow(0 0 0px rgba(249, 115, 22, 0))",
                          "drop-shadow(0 0 12px rgba(249, 115, 22, 0.8))",
                          "drop-shadow(0 0 0px rgba(249, 115, 22, 0))",
                        ],
                      }
                    : {}
                }
                transition={{
                  duration: 2,
                  repeat: currentStreak > 0 ? Infinity : 0,
                  repeatType: "loop",
                }}
              >
                <Flame
                  className={`h-12 w-12 md:h-16 md:w-16 ${
                    currentStreak > 0
                      ? "text-orange-500 dark:text-orange-400"
                      : "text-gray-300 dark:text-gray-700"
                  }`}
                  fill={
                    currentStreak > 0
                      ? "currentColor"
                      : "transparent"
                  }
                />
              </motion.div>
            </motion.div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-orange-500 to-red-500 dark:from-orange-400 dark:to-red-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((currentStreak / 30) * 100, 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 text-right">
              {currentStreak >= 30
                ? "30 day goal reached! 🎉"
                : `${30 - currentStreak} days to 30-day milestone`}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
