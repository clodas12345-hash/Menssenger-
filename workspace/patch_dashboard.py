import re

with open("src/components/DashboardView.tsx", "r") as f:
    content = f.read()

replacement = """  const activeCampaigns = useMemo(() => campaigns.filter((c) => c.status === 'agendado' || c.status === 'em_andamento'), [campaigns]);
  const sortedCampaigns = useMemo(() => [...campaigns].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  ), [campaigns]);
  const vcfContactsCount = useMemo(() => contacts.filter((c) => c.source === 'vcf').length, [contacts]);
  const totalSent = useMemo(() => logs.filter((l) => l.status === 'enviado').length, [logs]);
"""

old_code = """  const activeCampaigns = campaigns.filter((c) => c.status === 'agendado' || c.status === 'em_andamento');
  const sortedCampaigns = [...campaigns].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );
  const vcfContactsCount = contacts.filter((c) => c.source === 'vcf').length;
  const totalSent = logs.filter((l) => l.status === 'enviado').length;"""

if old_code in content:
    content = content.replace(old_code, replacement)
    with open("src/components/DashboardView.tsx", "w") as f:
        f.write(content)
    print("Patched DashboardView.tsx successfully")
else:
    print("Could not find the target code in DashboardView.tsx")
