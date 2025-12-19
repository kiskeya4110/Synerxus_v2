import { Flame, Trophy, Target, Calendar, ChevronRight, X, Clock, TrendingUp, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";

interface Activity {
  date: string;
  hours?: number;
  description?: string;
  projectName?: string;
}

interface ImpactStreakProps {
  activities: Activity[];
}

type DetailView = "current" | "best" | "goal" | "activity" | null;

export default function ImpactStreak({ activities }: ImpactStreakProps) {
  const [activeDetail, setActiveDetail] = useState<DetailView>(null);

  const { currentStreak, bestStreak, lastActivityDate, streakDays, recentActivities, goalProgress } = useMemo(() => {
    if (!activities || activities.length === 0) {
      return {
        currentStreak: 0,
        bestStreak: 0,
        lastActivityDate: null,
        streakDays: [],
        recentActivities: [],
        goalProgress: 0
      };
    }

    // Parse dates and sort in descending order, filtering out invalid dates
    const validActivities = activities
      .filter((a) => a.date && !isNaN(new Date(a.date).getTime()))
      .map((a) => ({
        ...a,
        parsedDate: new Date(a.date)
      }))
      .sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime());

    const uniqueDates = Array.from(
      new Set(
        validActivities.map((a) => a.parsedDate.toISOString().split("T")[0])
      )
    )
      .map((dateStr) => new Date(dateStr))
      .sort((a, b) => b.getTime() - a.getTime());

    if (uniqueDates.length === 0) {
      return {
        currentStreak: 0,
        bestStreak: 0,
        lastActivityDate: null,
        streakDays: [],
        recentActivities: [],
        goalProgress: 0
      };
    }

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 1;
    let lastActivityDate = uniqueDates[0];
    let streakDays: Date[] = [];

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
      streakDays = [uniqueDates[0]];

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
          streakDays.push(uniqueDates[i]);
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
    bestStreak = Math.max(bestStreak, tempStreak, currentStreak);

    // Get recent activities (last 10)
    const recentActivities = validActivities.slice(0, 10);

    // Calculate 30-day goal progress
    const goalProgress = Math.min((currentStreak / 30) * 100, 100);

    return { currentStreak, bestStreak, lastActivityDate, streakDays, recentActivities, goalProgress };
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(date);
  };

  const handleCardClick = (view: DetailView) => {
    setActiveDetail(activeDetail === view ? null : view);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800/50 shadow-lg overflow-hidden">
        <CardContent className="p-4 md:p-6">
          {/* Header with Flame Icon */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <motion.div
                animate={
                  currentStreak > 0
                    ? {
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0],
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
                  className={`h-6 w-6 ${
                    currentStreak > 0
                      ? "text-orange-500 dark:text-orange-400"
                      : "text-gray-300 dark:text-gray-600"
                  }`}
                  fill={currentStreak > 0 ? "currentColor" : "transparent"}
                />
              </motion.div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Impact Streak
              </h3>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {streakMessage}
            </span>
          </div>

          {/* Interactive Stat Cards Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Current Streak Card */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCardClick("current")}
              className={`p-3 rounded-xl text-left transition-all ${
                activeDetail === "current"
                  ? "bg-orange-500 text-white shadow-lg"
                  : "bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-800 shadow-sm hover:shadow-md"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className={`h-4 w-4 ${activeDetail === "current" ? "text-white" : "text-orange-500"}`} />
                  <span className={`text-xs font-medium ${activeDetail === "current" ? "text-orange-100" : "text-gray-500 dark:text-gray-400"}`}>
                    Current
                  </span>
                </div>
                <ChevronRight className={`h-4 w-4 ${activeDetail === "current" ? "text-white" : "text-gray-400"}`} />
              </div>
              <motion.p
                className={`text-2xl font-bold mt-1 ${activeDetail === "current" ? "text-white" : "text-orange-600 dark:text-orange-400"}`}
                animate={activeDetail === "current" ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 0.5 }}
              >
                {currentStreak} <span className="text-sm font-normal">days</span>
              </motion.p>
            </motion.button>

            {/* Best Streak Card */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCardClick("best")}
              className={`p-3 rounded-xl text-left transition-all ${
                activeDetail === "best"
                  ? "bg-amber-500 text-white shadow-lg"
                  : "bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-800 shadow-sm hover:shadow-md"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className={`h-4 w-4 ${activeDetail === "best" ? "text-white" : "text-amber-500"}`} />
                  <span className={`text-xs font-medium ${activeDetail === "best" ? "text-amber-100" : "text-gray-500 dark:text-gray-400"}`}>
                    Best Streak
                  </span>
                </div>
                <ChevronRight className={`h-4 w-4 ${activeDetail === "best" ? "text-white" : "text-gray-400"}`} />
              </div>
              <p className={`text-2xl font-bold mt-1 ${activeDetail === "best" ? "text-white" : "text-amber-600 dark:text-amber-400"}`}>
                {bestStreak} <span className="text-sm font-normal">days</span>
              </p>
            </motion.button>

            {/* 30-Day Goal Progress Card */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCardClick("goal")}
              className={`p-3 rounded-xl text-left transition-all ${
                activeDetail === "goal"
                  ? "bg-green-500 text-white shadow-lg"
                  : "bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-800 shadow-sm hover:shadow-md"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className={`h-4 w-4 ${activeDetail === "goal" ? "text-white" : "text-green-500"}`} />
                  <span className={`text-xs font-medium ${activeDetail === "goal" ? "text-green-100" : "text-gray-500 dark:text-gray-400"}`}>
                    30-Day Goal
                  </span>
                </div>
                <ChevronRight className={`h-4 w-4 ${activeDetail === "goal" ? "text-white" : "text-gray-400"}`} />
              </div>
              <div className="mt-1">
                <p className={`text-2xl font-bold ${activeDetail === "goal" ? "text-white" : "text-green-600 dark:text-green-400"}`}>
                  {Math.round(goalProgress)}%
                </p>
                <div className={`h-1.5 rounded-full mt-1 overflow-hidden ${activeDetail === "goal" ? "bg-green-400/30" : "bg-gray-200 dark:bg-gray-700"}`}>
                  <motion.div
                    className={`h-full rounded-full ${activeDetail === "goal" ? "bg-white" : "bg-green-500"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${goalProgress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
            </motion.button>

            {/* Recent Activity Card */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCardClick("activity")}
              className={`p-3 rounded-xl text-left transition-all ${
                activeDetail === "activity"
                  ? "bg-blue-500 text-white shadow-lg"
                  : "bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-800 shadow-sm hover:shadow-md"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className={`h-4 w-4 ${activeDetail === "activity" ? "text-white" : "text-blue-500"}`} />
                  <span className={`text-xs font-medium ${activeDetail === "activity" ? "text-blue-100" : "text-gray-500 dark:text-gray-400"}`}>
                    Activity
                  </span>
                </div>
                <ChevronRight className={`h-4 w-4 ${activeDetail === "activity" ? "text-white" : "text-gray-400"}`} />
              </div>
              <p className={`text-2xl font-bold mt-1 ${activeDetail === "activity" ? "text-white" : "text-blue-600 dark:text-blue-400"}`}>
                {recentActivities.length} <span className="text-sm font-normal">logs</span>
              </p>
            </motion.button>
          </div>

          {/* Detail Panels */}
          <AnimatePresence mode="wait">
            {activeDetail && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-inner border border-gray-100 dark:border-gray-700">
                  {/* Close Button */}
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                      {activeDetail === "current" && "Current Streak Details"}
                      {activeDetail === "best" && "Best Streak Achievement"}
                      {activeDetail === "goal" && "30-Day Goal Progress"}
                      {activeDetail === "activity" && "Recent Activity Log"}
                    </h4>
                    <button
                      onClick={() => setActiveDetail(null)}
                      className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>

                  {/* Current Streak Details */}
                  {activeDetail === "current" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                          <Flame className="h-5 w-5 text-white" fill="currentColor" />
                        </div>
                        <div>
                          <p className="font-bold text-2xl text-orange-600 dark:text-orange-400">{currentStreak} days</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">consecutive activity</p>
                        </div>
                      </div>
                      {streakDays.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Streak Days:</p>
                          <div className="flex flex-wrap gap-1">
                            {streakDays.slice(0, 7).map((date, i) => (
                              <span key={i} className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded-full">
                                {formatDate(date)}
                              </span>
                            ))}
                            {streakDays.length > 7 && (
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                                +{streakDays.length - 7} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {currentStreak === 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                          Log an activity today to start your streak!
                        </p>
                      )}
                    </div>
                  )}

                  {/* Best Streak Details */}
                  {activeDetail === "best" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                          <Trophy className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-2xl text-amber-600 dark:text-amber-400">{bestStreak} days</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">personal best record</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                          <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{currentStreak}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Current</p>
                        </div>
                        <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                          <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                            {bestStreak > 0 ? Math.round((currentStreak / bestStreak) * 100) : 0}%
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">of Best</p>
                        </div>
                      </div>
                      {currentStreak >= bestStreak && currentStreak > 0 && (
                        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                          <p className="text-sm font-medium text-green-600 dark:text-green-400">
                            🎉 You're at your best streak!
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 30-Day Goal Details */}
                  {activeDetail === "goal" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                          <Target className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-lg text-green-600 dark:text-green-400">{currentStreak}/30 days</p>
                            <p className="text-sm font-medium text-green-600 dark:text-green-400">{Math.round(goalProgress)}%</p>
                          </div>
                          <div className="h-2 bg-green-200 dark:bg-green-800 rounded-full mt-1 overflow-hidden">
                            <motion.div
                              className="h-full bg-green-500 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${goalProgress}%` }}
                              transition={{ duration: 0.8 }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{30 - currentStreak}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Days Left</p>
                        </div>
                        <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{currentStreak}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
                        </div>
                        <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <TrendingUp className="h-5 w-5 mx-auto text-green-500" />
                          <p className="text-xs text-gray-500 dark:text-gray-400">On Track</p>
                        </div>
                      </div>
                      {goalProgress >= 100 && (
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-center">
                          <p className="text-sm font-medium text-green-700 dark:text-green-300">
                            🎉 Congratulations! 30-day goal achieved!
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recent Activity Details */}
                  {activeDetail === "activity" && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {recentActivities.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4">
                          No activities logged yet. Start tracking your impact!
                        </p>
                      ) : (
                        recentActivities.map((activity, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                          >
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                              <Clock className="h-4 w-4 text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                {activity.projectName || activity.description || "Activity logged"}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {getTimeAgo(new Date(activity.date))}
                                {activity.hours && ` • ${activity.hours}h`}
                              </p>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
