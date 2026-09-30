import re

with open("src/components/DashboardView.tsx", "r") as f:
    content = f.read()

content = content.replace("import React, { useState, useEffect, useMemo } from 'react';", "import React, { useMemo } from 'react';")

with open("src/components/DashboardView.tsx", "w") as f:
    f.write(content)
print("Cleaned DashboardView imports")
