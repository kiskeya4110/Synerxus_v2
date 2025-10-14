import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  BarChart3, 
  Camera, 
  Sparkles, 
  Target, 
  Users, 
  TrendingUp, 
  Heart,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

export default function Landing() {
  const features = [
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Impact Dashboard",
      description: "Real-time tracking of volunteer hours, projects, and measurable outcomes across all your initiatives.",
      path: "/dashboard",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950"
    },
    {
      icon: <Globe className="h-8 w-8" />,
      title: "SDG Mapping",
      description: "Align your projects with UN Sustainable Development Goals and track progress toward global impact targets.",
      path: "/sdg-mapping",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950"
    },
    {
      icon: <TrendingUp className="h-8 w-8" />,
      title: "Impact Visualization",
      description: "Transform raw data into compelling visual stories with before/after comparisons and interactive charts.",
      path: "/impact-visualization",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950"
    },
    {
      icon: <Camera className="h-8 w-8" />,
      title: "Mobile Data Collection",
      description: "Capture impact in the field with offline-capable forms, location tracking, and photo documentation.",
      path: "/mobile-data-collection",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950"
    },
    {
      icon: <Sparkles className="h-8 w-8" />,
      title: "Impact Storytelling",
      description: "AI-powered narrative generation that transforms your metrics into engaging stories for any audience.",
      path: "/impact-storytelling",
      color: "text-pink-600 dark:text-pink-400",
      bgColor: "bg-pink-50 dark:bg-pink-950"
    },
    {
      icon: <Target className="h-8 w-8" />,
      title: "Field-Specific Metrics",
      description: "Customize tracking for healthcare, education, environment, and community development sectors.",
      path: "/field-specific-metrics",
      color: "text-teal-600 dark:text-teal-400",
      bgColor: "bg-teal-50 dark:bg-teal-950"
    }
  ];

  const benefits = [
    "Track volunteer hours and contributions in real-time",
    "Measure tangible outcomes with customizable metrics",
    "Generate compelling reports for stakeholders",
    "Align projects with global sustainability goals",
    "Collect data offline from remote locations",
    "Tell your impact story with AI assistance"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            <span className="text-lg sm:text-xl font-bold">ImpactTrack</span>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="min-h-[44px] sm:min-h-auto" data-testid="button-login">Log In</Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="min-h-[44px] sm:min-h-auto" data-testid="button-get-started">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-4 text-xs sm:text-sm" variant="secondary" data-testid="badge-platform-type">
            Volunteer Impact Platform
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent leading-tight" data-testid="text-hero-title">
            Measure What Matters. Tell Stories That Inspire.
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-2" data-testid="text-hero-description">
            ImpactTrack helps organizations track, visualize, and communicate the real-world outcomes of their volunteer initiatives.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" className="gap-2 w-full sm:w-auto min-h-[48px]" data-testid="button-start-tracking">
                Start Tracking Impact
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto min-h-[48px]" data-testid="button-explore-demo">
                Explore Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 sm:px-6 py-10 sm:py-12 border-y bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-6 sm:mb-8" data-testid="text-benefits-title">Why Organizations Choose ImpactTrack</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3 p-2" data-testid={`benefit-item-${index}`}>
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm sm:text-base text-muted-foreground">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4" data-testid="text-features-title">
              Complete Impact Tracking Platform
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4" data-testid="text-features-description">
              Everything you need to measure, visualize, and share your volunteer program's impact
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <Link key={index} href={feature.path} className="block">
                <Card 
                  className="h-full hover:shadow-lg active:scale-98 transition-all duration-300 cursor-pointer group border-2 hover:border-primary/50"
                  data-testid={`card-feature-${index}`}
                >
                  <CardHeader className="pb-3 sm:pb-6">
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg ${feature.bgColor} ${feature.color} flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform`}>
                      {feature.icon}
                    </div>
                    <CardTitle className="text-lg sm:text-xl" data-testid={`text-feature-title-${index}`}>{feature.title}</CardTitle>
                    <CardDescription className="text-sm sm:text-base" data-testid={`text-feature-description-${index}`}>
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all text-sm sm:text-base">
                      Explore <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 mb-12 sm:mb-16">
        <Card className="max-w-4xl mx-auto bg-gradient-to-r from-primary/10 to-purple-600/10 border-primary/20">
          <CardHeader className="text-center p-6 sm:p-8">
            <CardTitle className="text-2xl sm:text-3xl mb-3 sm:mb-4" data-testid="text-cta-title">
              Ready to Amplify Your Impact?
            </CardTitle>
            <CardDescription className="text-base sm:text-lg mb-6" data-testid="text-cta-description">
              Join organizations worldwide using ImpactTrack to demonstrate the power of volunteer action.
            </CardDescription>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link href="/login" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto min-h-[48px]" data-testid="button-create-account">
                  Create Free Account
                </Button>
              </Link>
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto min-h-[48px]" data-testid="button-view-dashboard">
                  View Dashboard Demo
                </Button>
              </Link>
            </div>
          </CardHeader>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-muted/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 ImpactTrack. Empowering volunteers to change the world.</p>
        </div>
      </footer>
    </div>
  );
}
