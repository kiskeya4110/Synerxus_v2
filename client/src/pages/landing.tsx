import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/ui/logo";
import { SDGWheel } from "@/components/sdg/sdg-wheel";
import { 
  Globe, 
  BarChart3, 
  Camera, 
  Sparkles, 
  Target, 
  Users, 
  TrendingUp,
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
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center gap-4">
          <Link href="/">
            <div className="cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0">
              <Logo size="md" />
            </div>
          </Link>
          <div className="flex gap-2 sm:gap-3 flex-shrink-0">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="min-h-[44px] sm:min-h-auto whitespace-nowrap" data-testid="button-login">Log In</Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="min-h-[44px] sm:min-h-auto whitespace-nowrap" data-testid="button-get-started">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-4 text-xs sm:text-sm" variant="secondary" data-testid="badge-platform-type">
            Synerxus AI Matching
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent leading-tight" data-testid="text-hero-title">
            Bridging Global Volunteers with Meaningful Impact Worldwide
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-2" data-testid="text-hero-description">
            Synerxus intelligently connects passionate volunteers with impactful opportunities worldwide, leveraging AI to match skills with needs for sustainable development.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" className="gap-2 w-full sm:w-auto min-h-[48px] bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white" data-testid="button-start-tracking">
                Start Tracking Impact
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto min-h-[48px] border-[#b45309] text-[#b45309] hover:bg-[#b45309] hover:text-white font-semibold" data-testid="button-explore-demo">
                Explore Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 sm:px-6 py-10 sm:py-12 border-y bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-6 sm:mb-8" data-testid="text-benefits-title">Why Organizations Choose Synerxus</h2>
          <div className="grid grid-cols-3 gap-0 border-2 border-primary/30 rounded-lg sm:rounded-xl overflow-hidden">
            {benefits.map((benefit, index) => (
              <button
                key={index}
                className="group relative overflow-hidden p-2.5 sm:p-3 md:p-5 text-left transition-all duration-300 hover:scale-105 hover:shadow-lg hover:z-10 active:scale-100 bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 hover:from-primary/20 hover:via-purple-500/20 hover:to-pink-500/20 border border-primary/20 min-h-[120px] sm:min-h-[140px] md:min-h-[160px]"
                data-testid={`benefit-item-${index}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex flex-col sm:flex-row items-start gap-2 sm:gap-2 md:gap-3 h-full">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-md sm:rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-white" />
                  </div>
                  <p className="text-xs sm:text-sm md:text-base font-medium text-foreground flex-1 leading-snug sm:pt-0.5 md:pt-1.5">{benefit}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Reduced by 1/3 */}
      <section className="container mx-auto px-4 sm:px-6 py-8 sm:py-10 md:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3" data-testid="text-features-title">
              Complete Impact Tracking Platform
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4" data-testid="text-features-description">
              Everything you need to measure, visualize, and share your volunteer program's impact
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {features.map((feature, index) => (
              <Link key={index} href={feature.path} className="block">
                <Card 
                  className="h-full hover:shadow-lg active:scale-98 transition-all duration-300 cursor-pointer group border-2 hover:border-primary/50"
                  data-testid={`card-feature-${index}`}
                >
                  <CardHeader className="pb-2 sm:pb-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${feature.bgColor} ${feature.color} flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-110 transition-transform`}>
                      {feature.icon}
                    </div>
                    <CardTitle className="text-base sm:text-lg" data-testid={`text-feature-title-${index}`}>{feature.title}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm" data-testid={`text-feature-description-${index}`}>
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all text-xs sm:text-sm">
                      Explore <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SDG Wheel Section */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <Badge className="mb-4" variant="secondary" data-testid="badge-un-sdgs">
              UN Sustainable Development Goals
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4" data-testid="text-sdg-title">
              Align Your Impact with Global Goals
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-4" data-testid="text-sdg-description">
              Connect your volunteer projects to the United Nations' 17 Sustainable Development Goals. Click any goal to learn more about its targets and how your organization can contribute.
            </p>
          </div>

          <SDGWheel />

          <div className="text-center mt-8 sm:mt-12">
            <p className="text-sm sm:text-base text-muted-foreground mb-4">
              Synerxus helps you track and report your organization's contribution to these global goals
            </p>
            <Link href="/sdg-mapping">
              <Button variant="outline" size="lg" className="gap-2" data-testid="button-explore-sdg-mapping">
                Explore SDG Mapping Feature
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
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
              Join organizations worldwide using Synerxus to demonstrate the power of volunteer action.
            </CardDescription>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link href="/login" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto min-h-[48px] bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white" data-testid="button-create-account">
                  Create Free Account
                </Button>
              </Link>
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto min-h-[48px] border-[#b45309] text-[#b45309] hover:bg-[#b45309] hover:text-white font-semibold" data-testid="button-view-dashboard">
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
          <p>© 2025 Synerxus. Intelligent connections for sustainable development worldwide.</p>
        </div>
      </footer>
    </div>
  );
}
