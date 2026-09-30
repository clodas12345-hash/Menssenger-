import re

with open("src/components/DashboardView.tsx", "r") as f:
    content = f.read()

if "useMemo" not in content[:200]:
    content = content.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect, useMemo } from 'react';")

with open("src/components/DashboardView.tsx", "w") as f:
    f.write(content)
print("Fixed DashboardView imports")
