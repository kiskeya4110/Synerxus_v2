import { useState } from "react";
import {
  Search,
  Book,
  MessageCircle,
  FileText,
  Users,
  Building2,
  Briefcase,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Mail,
  Phone,
  Home,
  FolderOpen,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link, useLocation } from "wouter";
import { CSRLayout } from "@/components/layout/csr-layout";
import Logo from "@/components/ui/logo";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  {
    category: "Getting Started",
    question: "How do I create an account?",
    answer:
      "Click the 'Sign Up' button on the landing page and choose your account type: Volunteer, Organization, or Corporate Partner. Fill in your details and verify your email to get started.",
  },
  {
    category: "Getting Started",
    question: "What are the different user types?",
    answer:
      "Synerxus supports three user types: Volunteers (individuals looking to contribute), Organizations (non-profits managing projects), and Corporate Partners (companies managing CSR programs and employee volunteering).",
  },
  {
    category: "Volunteers",
    question: "How do I find volunteer opportunities?",
    answer:
      "Navigate to the 'Discover Opportunities' section from your dashboard. You can filter by location, skills, SDG goals, and availability to find the perfect match.",
  },
  {
    category: "Volunteers",
    question: "How do I log my volunteer hours?",
    answer:
      "Go to 'Log Activity' from your dashboard. Select the project, enter the hours worked, describe what you accomplished, and submit for verification.",
  },
  {
    category: "Organizations",
    question: "How do I post a volunteer opportunity?",
    answer:
      "From your Verify Hub, go to 'Projects' and click 'Post Opportunity'. Choose between Core Opportunity (for skilled roles) or Urgent Need (for time-sensitive events).",
  },
  {
    category: "Organizations",
    question: "How do I manage volunteers for my projects?",
    answer:
      "Access your project details to view assigned volunteers, review applications, and track progress. You can communicate with volunteers through the messaging system.",
  },
  {
    category: "Corporate Partners",
    question: "How do I track employee volunteering?",
    answer:
      "Your ESG Console provides real-time metrics on employee engagement, hours logged, SDG alignment, and economic value generated through volunteering activities.",
  },
  {
    category: "Corporate Partners",
    question: "What is the Impact Score?",
    answer:
      "Impact Score is our proprietary metric that quantifies social impact by combining volunteer hours, people impacted, and SDG alignment into a single, comparable score.",
  },
  {
    category: "SDG Goals",
    question: "What are SDG Goals?",
    answer:
      "The Sustainable Development Goals (SDGs) are 17 global goals adopted by the United Nations. Synerxus maps all volunteer activities to these goals to measure and report impact.",
  },
  {
    category: "SDG Goals",
    question: "How is my impact aligned to SDGs?",
    answer:
      "When projects are created, they're mapped to relevant SDGs. Your volunteer hours and contributions are automatically tracked against these goals for comprehensive impact reporting.",
  },
];

export default function Help() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [, navigate] = useLocation();

  const userId = localStorage.getItem("currentUserId");
  const userType = localStorage.getItem("userType");
  const isCSR =
    userType === "corporate-partner" ||
    userType === "corporate_partner" ||
    userType === "csr";

  const categories = Array.from(new Set(faqData.map((item) => item.category)));

  const filteredFAQs = faqData.filter((item) => {
    const matchesSearch =
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const helpContent = (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Help Center</h1>
        <p className="text-muted-foreground">
          Find answers to common questions and get support
        </p>
      </div>

      {/* Search */}
      <div className="max-w-xl mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-400" />
          <Input
            placeholder="Search for help..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setSelectedCategory("Getting Started")}
        >
          <CardContent className="pt-6 text-center">
            <Book className="h-8 w-8 mx-auto mb-3 text-primary" />
            <h3 className="font-semibold">Getting Started</h3>
            <p className="text-sm text-muted-foreground mt-1">
              New to Synerxus?
            </p>
          </CardContent>
        </Card>
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setSelectedCategory("Volunteers")}
        >
          <CardContent className="pt-6 text-center">
            <Users className="h-8 w-8 mx-auto mb-3 text-blue-600" />
            <h3 className="font-semibold">For Volunteers</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Find opportunities
            </p>
          </CardContent>
        </Card>
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setSelectedCategory("Organizations")}
        >
          <CardContent className="pt-6 text-center">
            <Building2 className="h-8 w-8 mx-auto mb-3 text-green-600" />
            <h3 className="font-semibold">For Organizations</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Manage projects
            </p>
          </CardContent>
        </Card>
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setSelectedCategory("Corporate Partners")}
        >
          <CardContent className="pt-6 text-center">
            <Briefcase className="h-8 w-8 mx-auto mb-3 text-purple-600" />
            <h3 className="font-semibold">For Corporate</h3>
            <p className="text-sm text-muted-foreground mt-1">
              CSR & ESG tools
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Filter */}
      {selectedCategory && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">Filtering by:</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="gap-1"
          >
            {selectedCategory}
            <span className="ml-1">×</span>
          </Button>
        </div>
      )}

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Frequently Asked Questions
          </CardTitle>
          <CardDescription>
            {filteredFAQs.length} questions found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {filteredFAQs.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  <div>
                    <span className="text-xs text-primary font-medium">
                      {item.category}
                    </span>
                    <p className="font-medium">{item.question}</p>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground">{item.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {filteredFAQs.length === 0 && (
            <div className="text-center py-8">
              <HelpCircle className="h-12 w-12 mx-auto mb-4 text-stone-300" />
              <p className="text-muted-foreground">
                No matching questions found
              </p>
              <Button
                variant="link"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory(null);
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="pt-6">
          <div className="text-center">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Still need help?</h3>
            <p className="text-muted-foreground mb-4">
              Our support team is here to assist you
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" className="gap-2">
                <Mail className="h-4 w-4" />
                hello@synerxus.com
              </Button>
              <Button className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Start Live Chat
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <FileText className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Documentation</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Detailed guides and tutorials
                </p>
                <Button
                  variant="link"
                  className="p-0 h-auto gap-1"
                  onClick={() => navigate("/sdg-mapping")}
                >
                  View SDG Mapping Guide <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <Users className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Community</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Connect with other users
                </p>
                <Button
                  variant="link"
                  className="p-0 h-auto gap-1"
                  onClick={() => navigate("/organizations")}
                >
                  Browse Organizations <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // CSR Layout wrapper for corporate partners
  if (isCSR) {
    return <CSRLayout activeNav="dashboard">{helpContent}</CSRLayout>;
  }

  // Default layout for non-CSR users
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      {/* Consistent Site Navigation Header */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-stone-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
          {/* Logo */}
          <Logo size="sm" />

          {/* Center: Navigation Menu */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/landing">
              <Button
                variant="ghost"
                size="sm"
                className="text-stone-700 font-medium hover:bg-indigo-50 hover:text-indigo-700 rounded-lg gap-1"
              >
                <Home className="w-4 h-4" />
                Home
              </Button>
            </Link>
            <Link href="/projects">
              <Button
                variant="ghost"
                size="sm"
                className="text-stone-700 font-medium hover:bg-indigo-50 hover:text-indigo-700 rounded-lg gap-1"
              >
                <FolderOpen className="w-4 h-4" />
                Projects
              </Button>
            </Link>
            <Link href="/organizations">
              <Button
                variant="ghost"
                size="sm"
                className="text-stone-700 font-medium hover:bg-indigo-50 hover:text-indigo-700 rounded-lg gap-1"
              >
                <Building2 className="w-4 h-4" />
                Organizations
              </Button>
            </Link>
            <Link href="/help">
              <Button
                variant="ghost"
                size="sm"
                className="text-indigo-700 font-semibold bg-indigo-50/60 hover:bg-indigo-50 rounded-lg gap-1"
              >
                <HelpCircle className="w-4 h-4" />
                Help
              </Button>
            </Link>
          </div>

          {/* Right: Auth Actions */}
          <div className="flex gap-2">
            {userId ? (
              <Button
                size="sm"
                onClick={() =>
                  navigate(
                    userType === "volunteer"
                      ? "/volunteer-dashboard"
                      : userType === "organization"
                        ? "/organization-dashboard"
                        : "/csr-dashboard",
                  )
                }
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg"
              >
                My Dashboard
              </Button>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-stone-300 text-stone-700 hover:bg-indigo-50 rounded-lg"
                  >
                    Log In
                  </Button>
                </Link>
                <Link href="/login?tab=register">
                  <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                  >
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-6">{helpContent}</div>
    </div>
  );
}
