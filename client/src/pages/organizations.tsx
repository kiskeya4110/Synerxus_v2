import { useState } from "react";
import { Plus, Search, Globe, Mail, Phone, Building2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

export default function Organizations() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: organizations = [], isLoading } = useQuery({ 
    queryKey: ["/api/organizations"] 
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"]
  });

  const filteredOrganizations = organizations.filter((org: any) => 
    org.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Page Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-2">Organizations</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Partner organizations and their volunteer initiatives
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{isLoading ? "..." : organizations.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Organizations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{isLoading ? "..." : projects.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Active Projects</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">-</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Volunteers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search organizations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 min-h-[44px]"
            data-testid="input-search-organizations"
          />
        </div>

        <Button className="min-h-[44px]" data-testid="button-add-organization">
          <Plus className="h-5 w-5 mr-2" />
          Add Organization
        </Button>
      </div>

      {/* Organizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {filteredOrganizations.map((org) => (
          <Card key={org.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl mb-1">{org.name}</CardTitle>
                  <CardDescription className="text-sm line-clamp-2">
                    {org.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2 text-sm">
                  {org.website && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Globe className="h-4 w-4 flex-shrink-0" />
                      <a href={org.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary truncate">
                        {org.website.replace('https://', '')}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <a href={`mailto:${org.contactEmail}`} className="hover:text-primary truncate">
                      {org.contactEmail}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span>{org.contactPhone}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <Link href="/projects">
                      <p className="text-lg font-bold text-primary cursor-pointer hover:underline">
                        {projects.filter((p: any) => p.organizationId === org.id).length}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Projects</p>
                    </Link>
                  </div>
                  <div className="text-center">
                    <Link href="/volunteers">
                      <p className="text-lg font-bold text-primary cursor-pointer hover:underline">-</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Volunteers</p>
                    </Link>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 min-h-[44px]">
                    View Details
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 min-h-[44px]">
                    <Mail className="h-4 w-4 mr-1" />
                    Contact
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredOrganizations.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">No organizations found</p>
        </Card>
      )}
    </>
  );
}
