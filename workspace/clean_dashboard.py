with open("src/components/DashboardView.tsx", "r") as f:
    content = f.read()

content = content.replace("""  // Find next upcoming scheduled campaign
  const now = new Date();
  const upcomingCampaigns = [...activeCampaigns].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );
  const nextCampaign = upcomingCampaigns[0];""", "")

with open("src/components/DashboardView.tsx", "w") as f:
    f.write(content)
print("Cleaned DashboardView")
