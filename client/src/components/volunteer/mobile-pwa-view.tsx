import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Home, Search, Activity, User, MessageCircle, Menu, ChevronDown, MapPin, Clock, Users } from "lucide-react";
import { getSDGIcon } from "@/assets/un-sdg-icons";
import { getSDGColor } from "@shared/sdg-goals";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MobilePWAViewProps {
  userId: string;
  user: any;
  dashboardData: any;
}

type TabType = 'home' | 'search' | 'activity' | 'profile' | 'messages';
type FilterTab = 'recommended' | 'nearby' | 'saved';

export default function MobilePWAView({ userId, user, dashboardData }: MobilePWAViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>('recommended');
  const [selectedSDGs, setSelectedSDGs] = useState<number[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const projects = dashboardData?.projects || [];
  const volunteerProfile = dashboardData?.volunteerProfile;

  // Calculate match score based on skills and interests
  const calculateMatchScore = (project: any) => {
    if (!volunteerProfile) return 75; // Default match

    let score = 60; // Base score

    // Check skill alignment
    const volunteerSkills = volunteerProfile.skills || [];
    const projectSkills = project.skillsRequired || [];
    const skillMatches = volunteerSkills.filter((skill: string) =>
      projectSkills.some((ps: string) => ps.toLowerCase().includes(skill.toLowerCase()))
    ).length;
    score += skillMatches * 10;

    // Check SDG alignment
    const volunteerSDGs = volunteerProfile.sdgGoals || [];
    const projectSDGs = project.sdgGoals || [];
    const sdgMatches = volunteerSDGs.filter((sdg: number) => projectSDGs.includes(sdg)).length;
    score += sdgMatches * 5;

    return Math.min(score, 99);
  };

  const sdgList = [5, 10, 11, 13, 14, 15, 16, 17];

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[428px] mx-auto">
      {/* Top App Bar */}
      <header className="bg-[#4A9FDE] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold tracking-wide">Synerxus</h1>
        <Avatar className="w-9 h-9 border-2 border-white">
          <AvatarImage src={user?.profilePicture} />
          <AvatarFallback className="bg-white/20 text-white text-sm">
            {user?.displayName?.charAt(0) || 'V'}
          </AvatarFallback>
        </Avatar>
      </header>

      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-[#FFC107] text-gray-900 px-4 py-2 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>Offline Mode - Data may be outdated. Syncs when online.</span>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'home' && (
          <>
            {/* Dashboard Stats */}
            <div className="bg-gradient-to-br from-[#4A9FDE] to-[#3B82DE] px-4 py-6">
              <h2 className="text-white text-lg font-bold mb-4">Your Impact Dashboard</h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-white">
                  <div className="text-2xl font-bold mb-1">
                    {dashboardData?.totalHours || 0}
                  </div>
                  <div className="text-xs opacity-90">Hours</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-white">
                  <div className="text-2xl font-bold mb-1">
                    {dashboardData?.totalPeopleImpacted || 0}
                  </div>
                  <div className="text-xs opacity-90">Lives</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-white">
                  <div className="text-2xl font-bold mb-1">
                    {projects?.length || 0}
                  </div>
                  <div className="text-xs opacity-90">Projects</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-4 bg-white border-b border-gray-100">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveTab('activity')}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-[#4CAF50] hover:bg-[#45a049] text-white rounded-lg font-medium text-sm transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  Log Hours
                </button>
                <button
                  onClick={() => setActiveTab('search')}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-gray-50 text-[#4A9FDE] border border-[#4A9FDE] rounded-lg font-medium text-sm transition-colors"
                >
                  <Search className="w-4 h-4" />
                  Find Projects
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10">
              {(['recommended', 'nearby', 'saved'] as FilterTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveFilterTab(tab)}
                  className={`flex-1 px-4 py-3 text-sm font-medium capitalize transition-colors ${
                    activeFilterTab === tab
                      ? 'text-[#4A9FDE] border-b-2 border-[#4A9FDE]'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Filter Chips */}
            <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide bg-gray-50">
              <button className="px-4 py-2 bg-white rounded-full border border-gray-300 text-sm font-medium text-[#4A9FDE] whitespace-nowrap flex items-center gap-2 hover:bg-gray-50 transition-colors">
                <span>🎯</span>
                SDG
                <ChevronDown className="w-4 h-4" />
              </button>
              <button className="px-4 py-2 bg-white rounded-full border border-gray-300 text-sm font-medium text-[#4A9FDE] whitespace-nowrap flex items-center gap-2 hover:bg-gray-50 transition-colors">
                <Clock className="w-4 h-4" />
                Time Commitment
              </button>
              <button className="px-4 py-2 bg-white rounded-full border border-gray-300 text-sm font-medium text-[#4A9FDE] whitespace-nowrap flex items-center gap-2 hover:bg-gray-50 transition-colors">
                <MapPin className="w-4 h-4" />
                Remote/On-site
              </button>
            </div>

            {/* SDG Icons Row */}
            <div className="px-4 py-3 flex gap-3 overflow-x-auto scrollbar-hide bg-white">
              {sdgList.map((sdg) => {
                const iconUrl = getSDGIcon(sdg);
                return (
                  <button
                    key={sdg}
                    onClick={() => {
                      setSelectedSDGs(prev =>
                        prev.includes(sdg) ? prev.filter(s => s !== sdg) : [...prev, sdg]
                      );
                    }}
                    className={`flex-shrink-0 transition-transform hover:scale-110 ${
                      selectedSDGs.includes(sdg) ? 'ring-2 ring-[#4A9FDE] ring-offset-2 rounded-full' : ''
                    }`}
                  >
                    <img src={iconUrl} alt={`SDG ${sdg}`} className="w-12 h-12 rounded-lg" />
                  </button>
                );
              })}
            </div>

            {/* Project Cards */}
            <div className="px-4 py-2 space-y-4">
              {projects.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No projects available</p>
                  <p className="text-sm mt-2">Check back soon for new opportunities!</p>
                </div>
              ) : (
                projects
                  .filter((project: any) => {
                    if (selectedSDGs.length === 0) return true;
                    return project.sdgGoals?.some((sdg: number) => selectedSDGs.includes(sdg));
                  })
                  .map((project: any) => {
                    const matchScore = calculateMatchScore(project);
                    const projectSDGs = project.sdgGoals || [];

                    return (
                      <div
                        key={project.id}
                        className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100 overflow-hidden"
                      >
                        <div className="p-4">
                          {/* Match Badge */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="bg-gradient-to-br from-[#4A9FDE] to-[#3B82DE] text-white rounded-full w-16 h-16 flex flex-col items-center justify-center shadow-lg">
                              <span className="text-xl font-bold">{matchScore}%</span>
                              <span className="text-[10px]">Match</span>
                            </div>
                            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                              <span className="text-[#4A9FDE] text-xl">+</span>
                            </button>
                          </div>

                          {/* Project Info */}
                          <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                            {project.name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {project.description}
                          </p>

                          {/* SDG Icons */}
                          <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
                            {projectSDGs.slice(0, 4).map((sdg: number) => {
                              const iconUrl = getSDGIcon(sdg);
                              return (
                                <div key={sdg} className="flex-shrink-0">
                                  <img src={iconUrl} alt={`SDG ${sdg}`} className="w-8 h-8 rounded" />
                                </div>
                              );
                            })}
                            {projectSDGs.length > 4 && (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                                +{projectSDGs.length - 4}
                              </div>
                            )}
                          </div>

                          {/* Meta Info */}
                          <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span>{project.location || 'Remote'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{project.timeCommitment || '10 hrs/week'}</span>
                            </div>
                          </div>

                          {/* Apply Button */}
                          <Button
                            className="w-full bg-[#4CAF50] hover:bg-[#45a049] text-white font-medium rounded-lg h-11 transition-colors"
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </>
        )}

        {activeTab === 'search' && (
          <div className="flex flex-col h-full">
            {/* Search Bar */}
            <div className="px-4 pt-4 pb-3 bg-white sticky top-0 z-10 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects, skills, or SDGs..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A9FDE] focus:border-transparent outline-none text-sm"
                  onChange={(e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    // This could be enhanced with actual search state management
                  }}
                />
              </div>
            </div>

            {/* Filter Tags */}
            <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide bg-gray-50">
              <button className="px-4 py-2 bg-[#4A9FDE] text-white rounded-full text-sm font-medium whitespace-nowrap">
                All Projects
              </button>
              <button className="px-4 py-2 bg-white rounded-full border border-gray-300 text-sm font-medium text-gray-700 whitespace-nowrap">
                Remote
              </button>
              <button className="px-4 py-2 bg-white rounded-full border border-gray-300 text-sm font-medium text-gray-700 whitespace-nowrap">
                On-site
              </button>
              <button className="px-4 py-2 bg-white rounded-full border border-gray-300 text-sm font-medium text-gray-700 whitespace-nowrap">
                Part-time
              </button>
              <button className="px-4 py-2 bg-white rounded-full border border-gray-300 text-sm font-medium text-gray-700 whitespace-nowrap">
                Full-time
              </button>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              <div className="mb-3 text-sm text-gray-600">
                {projects.length} project{projects.length !== 1 ? 's' : ''} found
              </div>

              {projects.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No projects found</p>
                  <p className="text-sm mt-2">Try adjusting your search criteria</p>
                </div>
              ) : (
                <div className="space-y-3 pb-4">
                  {projects.map((project: any) => {
                    const matchScore = calculateMatchScore(project);
                    const projectSDGs = project.sdgGoals || [];

                    return (
                      <div
                        key={project.id}
                        className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden"
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="bg-gradient-to-br from-[#4A9FDE] to-[#3B82DE] text-white rounded-full w-12 h-12 flex flex-col items-center justify-center flex-shrink-0">
                              <span className="text-lg font-bold">{matchScore}%</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-bold text-gray-900 mb-1 line-clamp-1">
                                {project.name}
                              </h3>
                              <p className="text-xs text-gray-600 line-clamp-2">
                                {project.description}
                              </p>
                            </div>
                          </div>

                          {/* SDG Icons */}
                          <div className="flex gap-1.5 mb-3">
                            {projectSDGs.slice(0, 5).map((sdg: number) => {
                              const iconUrl = getSDGIcon(sdg);
                              return (
                                <img key={sdg} src={iconUrl} alt={`SDG ${sdg}`} className="w-6 h-6 rounded" />
                              );
                            })}
                            {projectSDGs.length > 5 && (
                              <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600">
                                +{projectSDGs.length - 5}
                              </div>
                            )}
                          </div>

                          {/* Meta Info */}
                          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span>{project.location || 'Remote'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{project.timeCommitment || '10 hrs/week'}</span>
                            </div>
                          </div>

                          {/* Apply Button */}
                          <Button className="w-full bg-[#4CAF50] hover:bg-[#45a049] text-white font-medium rounded-lg h-9 text-sm">
                            Apply Now
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="px-4 py-6 space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-[#4A9FDE] to-[#3B82DE] rounded-xl p-4 text-white shadow-md">
                <div className="text-3xl font-bold mb-1">
                  {dashboardData?.totalHours || 0}
                </div>
                <div className="text-xs opacity-90">Total Hours</div>
              </div>
              <div className="bg-gradient-to-br from-[#4CAF50] to-[#45a049] rounded-xl p-4 text-white shadow-md">
                <div className="text-3xl font-bold mb-1">
                  {dashboardData?.totalPeopleImpacted || 0}
                </div>
                <div className="text-xs opacity-90">Lives Touched</div>
              </div>
            </div>

            {/* Quick Log Hours */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#4A9FDE]" />
                Log Hours
              </h3>
              <Button className="w-full bg-[#4A9FDE] hover:bg-[#3B82DE] text-white font-medium rounded-lg h-11">
                + Log Volunteer Hours
              </Button>
            </div>

            {/* Recent Activities */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#4A9FDE]" />
                Recent Activity
              </h3>
              {dashboardData?.activities && dashboardData.activities.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.activities.slice(0, 5).map((activity: any, index: number) => (
                    <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                      <div className="w-2 h-2 rounded-full bg-[#4CAF50] mt-2 flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">
                          {activity.projectName || activity.description || 'Volunteer Activity'}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {activity.hours || 0} hrs
                          </span>
                          <span>
                            {activity.date ? new Date(activity.date).toLocaleDateString() : 'Recent'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No activities yet</p>
                  <p className="text-xs mt-1">Start volunteering to see your impact!</p>
                </div>
              )}
            </div>

            {/* Impact Breakdown */}
            {dashboardData?.impactBySDG && dashboardData.impactBySDG.length > 0 && (
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span>🎯</span>
                  Impact by SDG
                </h3>
                <div className="space-y-3">
                  {dashboardData.impactBySDG.slice(0, 5).map((impact: any) => {
                    const iconUrl = getSDGIcon(impact.sdg);
                    return (
                      <div key={impact.sdg} className="flex items-center gap-3">
                        <img src={iconUrl} alt={`SDG ${impact.sdg}`} className="w-10 h-10 rounded flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">SDG {impact.sdg}</span>
                            <span className="text-sm font-bold text-[#4A9FDE]">{impact.hours || 0} hrs</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-[#4A9FDE] to-[#4CAF50] h-2 rounded-full transition-all"
                              style={{ width: `${Math.min((impact.hours / (dashboardData.totalHours || 1)) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="px-4 py-6 space-y-6">
            {/* Profile Header */}
            <div className="bg-gradient-to-br from-[#4A9FDE] to-[#3B82DE] rounded-xl p-6 text-white shadow-md">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
                  <AvatarImage src={user?.profilePicture} />
                  <AvatarFallback className="bg-white/20 text-white text-2xl">
                    {user?.displayName?.charAt(0) || 'V'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-1">{user?.displayName || 'Volunteer'}</h2>
                  <p className="text-sm opacity-90">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 text-center">
                <div className="text-2xl font-bold text-[#4A9FDE] mb-1">
                  {dashboardData?.totalHours || 0}
                </div>
                <div className="text-xs text-gray-600">Hours</div>
              </div>
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 text-center">
                <div className="text-2xl font-bold text-[#4CAF50] mb-1">
                  {dashboardData?.projects?.length || 0}
                </div>
                <div className="text-xs text-gray-600">Projects</div>
              </div>
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 text-center">
                <div className="text-2xl font-bold text-[#FF9800] mb-1">
                  {dashboardData?.totalPeopleImpacted || 0}
                </div>
                <div className="text-xs text-gray-600">Impact</div>
              </div>
            </div>

            {/* Skills */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span>💼</span>
                Skills
              </h3>
              {volunteerProfile?.skills && volunteerProfile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {volunteerProfile.skills.map((skill: string, index: number) => (
                    <span key={index} className="px-3 py-1 bg-[#4A9FDE]/10 text-[#4A9FDE] rounded-full text-sm font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No skills added yet</p>
              )}
              <Button className="w-full mt-3 bg-white hover:bg-gray-50 text-[#4A9FDE] border border-[#4A9FDE] font-medium rounded-lg h-10">
                + Add Skills
              </Button>
            </div>

            {/* Interests (SDGs) */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span>🎯</span>
                SDG Interests
              </h3>
              {volunteerProfile?.sdgGoals && volunteerProfile.sdgGoals.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {volunteerProfile.sdgGoals.map((sdg: number) => {
                    const iconUrl = getSDGIcon(sdg);
                    return (
                      <div key={sdg} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                        <img src={iconUrl} alt={`SDG ${sdg}`} className="w-6 h-6 rounded" />
                        <span className="text-sm font-medium text-gray-700">SDG {sdg}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No SDG interests selected</p>
              )}
              <Button className="w-full mt-3 bg-white hover:bg-gray-50 text-[#4A9FDE] border border-[#4A9FDE] font-medium rounded-lg h-10">
                + Update Interests
              </Button>
            </div>

            {/* Availability */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#4A9FDE]" />
                Availability
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Hours per week</span>
                  <span className="text-sm font-medium text-gray-900">
                    {volunteerProfile?.availableHours || '5-10 hrs'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Preferred time</span>
                  <span className="text-sm font-medium text-gray-900">
                    {volunteerProfile?.preferredTime || 'Flexible'}
                  </span>
                </div>
              </div>
              <Button className="w-full mt-3 bg-white hover:bg-gray-50 text-[#4A9FDE] border border-[#4A9FDE] font-medium rounded-lg h-10">
                Edit Availability
              </Button>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium rounded-lg h-11 flex items-center justify-center gap-2">
                <User className="w-4 h-4" />
                Edit Profile
              </Button>
              <Button className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium rounded-lg h-11">
                Settings
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="flex flex-col h-full">
            {/* Messages Header */}
            <div className="px-4 py-4 bg-white border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Messages</h2>
              <p className="text-sm text-gray-600 mt-1">Connect with organizations</p>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              {/* Sample Conversations */}
              <div className="divide-y divide-gray-100">
                {/* Active Project Conversation */}
                {projects.slice(0, 3).map((project: any) => (
                  <div
                    key={project.id}
                    className="px-4 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4A9FDE] to-[#3B82DE] flex items-center justify-center text-white font-bold flex-shrink-0">
                        {project.organizationName?.charAt(0) || project.name?.charAt(0) || 'O'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
                            {project.organizationName || project.name}
                          </h3>
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">2h ago</span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-1">
                          Thank you for your interest in {project.name}! We'd love to discuss...
                        </p>
                        <div className="flex items-center gap-2">
                          {project.sdgGoals?.slice(0, 3).map((sdg: number) => {
                            const iconUrl = getSDGIcon(sdg);
                            return (
                              <img key={sdg} src={iconUrl} alt={`SDG ${sdg}`} className="w-4 h-4 rounded" />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Welcome Message */}
                <div className="px-4 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4CAF50] to-[#45a049] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xl">💬</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 text-sm">Synerxus Team</h3>
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">1d ago</span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        Welcome to Synerxus! 🎉 Start making an impact today by browsing projects...
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Empty State (if no projects) */}
              {projects.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full px-4 py-12 text-center">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <MessageCircle className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages yet</h3>
                  <p className="text-sm text-gray-600 mb-6 max-w-sm">
                    Apply to projects to start conversations with organizations and coordinate your volunteer work
                  </p>
                  <Button
                    onClick={() => setActiveTab('home')}
                    className="bg-[#4A9FDE] hover:bg-[#3B82DE] text-white font-medium rounded-lg px-6 h-11"
                  >
                    Browse Projects
                  </Button>
                </div>
              )}
            </div>

            {/* Compose Button */}
            {projects.length > 0 && (
              <div className="p-4 bg-white border-t border-gray-200">
                <Button className="w-full bg-[#4A9FDE] hover:bg-[#3B82DE] text-white font-medium rounded-lg h-11 flex items-center justify-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  New Message
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg max-w-[428px] mx-auto">
        <div className="flex justify-around items-center h-16">
          {[
            { id: 'home' as TabType, icon: Home, label: 'Home' },
            { id: 'search' as TabType, icon: Search, label: 'Search' },
            { id: 'activity' as TabType, icon: Activity, label: 'Activity' },
            { id: 'profile' as TabType, icon: User, label: 'Profile' },
            { id: 'messages' as TabType, icon: MessageCircle, label: 'Messages' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive ? 'text-[#4A9FDE]' : 'text-gray-500'
                }`}
              >
                <Icon className={`w-6 h-6 mb-1 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className={`text-xs ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
