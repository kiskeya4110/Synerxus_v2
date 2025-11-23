
  // Personalized recommendations endpoint
      
      const user = await storage.getUser(userId);
      if (!user || user.userType !== "volunteer") {
        return res.status(400).json({ message: "Volunteer not found" });
      }

      const volunteerProfile = await storage.getVolunteerProfile(userId);
      const activities = await storage.listVolunteerActivities();
      const userActivities = activities.filter((a: any) => a.userId === userId);
      const opportunities = await storage.listOpportunities();
      const open = opportunities.filter((opp: any) => opp.status === "open");
      
      const rejected = await storage.listRejectedOpportunitiesByVolunteer(userId);
      const rejectedIds = new Set(rejected.map((r: any) => r.opportunityId));
      const apps = await storage.listApplications();
      const appliedIds = new Set(apps.filter((a: any) => a.volunteerId === userId).map((a: any) => a.opportunityId));
      
      const candidates = open.filter((opp: any) => !appliedIds.has(opp.id) && !rejectedIds.has(opp.id));
      const recs = getPersonalizedRecommendations({ ...user, profile: volunteerProfile }, candidates, userActivities);
      
      res.json(recs);
    } catch (err) {
      console.error("Recommendations error:", err);
      res.status(500).json({ message: "Error" });
    }
  });

  return httpServer;
}
  return httpServer;
}
