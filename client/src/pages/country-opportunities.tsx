import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Building2, Users, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const COUNTRY_MAP: { [key: string]: string } = {
  usa: "United States",
  mexico: "Mexico",
  haiti: "Haiti",
  philippines: "Philippines",
  zimbabwe: "Zimbabwe",
  zambia: "Zambia",
};

export default function CountryOpportunities() {
  const { country: countryParam } = useParams<{ country: string }>();
  const countryName = countryParam ? COUNTRY_MAP[countryParam.toLowerCase()] : null;

  const { data: opportunities, isLoading } = useQuery({
    queryKey: ["/api/opportunities/country", countryParam],
    queryFn: async () => {
      const response = await fetch(`/api/opportunities/country/${countryParam}`);
      if (!response.ok) throw new Error("Failed to fetch opportunities");
      return response.json();
    },
    enabled: !!countryParam,
  });

  if (!countryName) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <Link href="/">
            <Button variant="ghost" className="mb-6 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Landing
            </Button>
          </Link>
          <div className="text-center py-12">
            <p className="text-slate-600">Country not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-amber-600 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <Link href="/">
            <Button variant="ghost" className="mb-6 gap-2 text-white hover:bg-white/20">
              <ArrowLeft className="h-4 w-4" />
              Back to Landing
            </Button>
          </Link>
          <h1 className="text-4xl sm:text-5xl font-bold mb-2">
            <MapPin className="inline h-10 w-10 mr-3 align-middle" />
            {countryName}
          </h1>
          <p className="text-lg text-white/90">
            Active volunteer opportunities and programs
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !opportunities || opportunities.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 mx-auto mb-4 text-slate-400" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              No opportunities yet
            </h2>
            <p className="text-slate-600 mb-6">
              No organizations have posted opportunities in {countryName} yet.
            </p>
            <Link href="/discover-opportunities">
              <Button className="bg-amber-500 hover:bg-amber-600">
                Explore Other Opportunities
              </Button>
            </Link>
          </div>
        ) : (
          <div>
            <div className="mb-8">
              <p className="text-slate-600 text-lg">
                Found <span className="font-bold text-blue-900">{opportunities.length}</span> opportunities in {countryName}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {opportunities.map((opp: any) => (
                <Link key={opp.id} href={`/opportunities/${opp.id}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
                    <CardHeader className="pb-4">
                      <CardTitle className="line-clamp-2 text-blue-900">
                        {opp.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-2">
                        <Building2 className="h-4 w-4" />
                        <span className="truncate">{opp.organizationName}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {opp.description}
                      </p>

                      <div className="space-y-2 text-sm">
                        {opp.engagementType && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                              {opp.engagementType}
                            </span>
                          </div>
                        )}

                        {opp.commitmentType && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <span>{opp.commitmentType}</span>
                          </div>
                        )}

                        {opp.volunteersNeeded && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Users className="h-4 w-4 flex-shrink-0" />
                            <span>{opp.volunteersNeeded} volunteers needed</span>
                          </div>
                        )}
                      </div>

                      {opp.requiredSkills && opp.requiredSkills.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {opp.requiredSkills.slice(0, 3).map((skill: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium"
                            >
                              {skill}
                            </span>
                          ))}
                          {opp.requiredSkills.length > 3 && (
                            <span className="px-2 py-1 bg-slate-200 text-slate-600 rounded text-xs font-medium">
                              +{opp.requiredSkills.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      <Button className="w-full mt-4 bg-blue-900 hover:bg-blue-950">
                        View Opportunity
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
