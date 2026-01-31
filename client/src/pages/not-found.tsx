import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import Logo from "@/components/ui/logo";

export default function NotFound() {
  return (
    <div className="min-h-screen pwa-gradient-bg flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md mx-auto space-y-6">
        {/* Logo */}
        <Link href="/landing">
          <div className="inline-block cursor-pointer hover:opacity-80 transition-opacity mb-2">
            <Logo size="sm" />
          </div>
        </Link>

        {/* 404 Illustration */}
        <div className="relative">
          <span className="text-[120px] sm:text-[160px] font-bold leading-none tracking-tighter gradient-text-brand select-none">
            404
          </span>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-stone-900">Page Not Found</h1>
          <p className="text-stone-600 text-sm leading-relaxed">
            The page you're looking for doesn't exist or may have been moved.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link href="/landing">
            <Button size="lg" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </Link>
          <Button
            size="lg"
            variant="outline"
            className="w-full sm:w-auto rounded-xl"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
