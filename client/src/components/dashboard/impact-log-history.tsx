import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  Wallet,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";

interface ImpactLog {
  id: number;
  hours: number;
  date: string;
  description: string | null;
  outcomeQuantity: number | null;
  outcomes: string | null;
  verificationStatus: string;
  createdAt: string;
  project?: {
    id: number;
    name: string;
    sdgGoals: number[] | null;
  } | null;
}

interface ImpactLogHistoryProps {
  userId: number;
  limit?: number;
  showHeader?: boolean;
  compact?: boolean;
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: "Pending Review",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    iconColor: "text-amber-500"
  },
  approved: {
    icon: CheckCircle,
    label: "Verified",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    iconColor: "text-emerald-500"
  },
  verified: {
    icon: CheckCircle,
    label: "Verified",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    iconColor: "text-emerald-500"
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    color: "bg-red-100 text-red-700 border-red-200",
    iconColor: "text-red-500"
  },
  incomplete: {
    icon: AlertCircle,
    label: "Needs Update",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    iconColor: "text-orange-500"
  }
};

export default function ImpactLogHistory({
  userId,
  limit = 5,
  showHeader = true,
  compact = false
}: ImpactLogHistoryProps) {
  const { data: logs = [], isLoading } = useQuery<ImpactLog[]>({
    queryKey: ["/api/logs", { user_id: userId }],
    queryFn: async () => {
      // Try new API first, fall back to old endpoint
      let response = await fetch(`/api/logs?user_id=${userId}`);
      if (!response.ok) {
        response = await fetch(`/api/volunteer-activities?userId=${userId}`);
        if (!response.ok) return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data.slice(0, limit) : [];
    },
    enabled: !!userId,
  });

  // Calculate summary stats
  const stats = {
    total: logs.length,
    verified: logs.filter(l => l.verificationStatus === 'approved').length,
    pending: logs.filter(l => l.verificationStatus === 'pending').length,
    rejected: logs.filter(l => l.verificationStatus === 'rejected').length,
    totalHours: logs.reduce((sum, l) => sum + (l.hours || 0), 0),
    verifiedHours: logs
      .filter(l => l.verificationStatus === 'approved')
      .reduce((sum, l) => sum + (l.hours || 0), 0),
  };

  if (isLoading) {
    return (
      <Card>
        {showHeader && (
          <CardHeader className="pb-2">
            <Skeleton className="h-6 w-40" />
          </CardHeader>
        )}
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-emerald-200/60">
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="w-5 h-5 text-emerald-600" />
              Impact Wallet
            </CardTitle>
            <Link href="/log-activity">
              <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                Log Activity
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
      )}
      <CardContent>
        {/* Summary Stats */}
        {!compact && (
          <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-700">{stats.verifiedHours}</p>
              <p className="text-xs text-emerald-600">Verified Hours</p>
            </div>
            <div className="text-center border-x border-emerald-200">
              <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              <p className="text-xs text-amber-600">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-600">{stats.total}</p>
              <p className="text-xs text-slate-500">Total Logs</p>
            </div>
          </div>
        )}

        {/* Log List */}
        {logs.length === 0 ? (
          <div className="text-center py-6 text-slate-500">
            <TrendingUp className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No activity logs yet</p>
            <Link href="/log-activity">
              <Button variant="link" className="text-emerald-600 mt-2">
                Log your first activity
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const status = statusConfig[log.verificationStatus as keyof typeof statusConfig] || statusConfig.pending;
              const StatusIcon = status.icon;

              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-full ${status.color}`}>
                      <StatusIcon className={`w-4 h-4 ${status.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate text-sm">
                        {log.project?.name || 'Unknown Project'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(log.date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-semibold text-emerald-700">{log.hours}h</span>
                    <Badge variant="outline" className={`text-xs ${status.color}`}>
                      {status.label}
                    </Badge>
                  </div>
                </div>
              );
            })}

            {stats.total > limit && (
              <Link href="/my-work">
                <Button variant="ghost" className="w-full text-slate-500 hover:text-emerald-600">
                  View all {stats.total} logs
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
