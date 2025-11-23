import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="w-full min-h-[500px] lg:min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-8 lg:py-0">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500 flex-shrink-0" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            The page you're looking for doesn't exist or may have been moved.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
