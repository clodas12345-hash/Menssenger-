import re

with open("src/components/TimeSelect.tsx", "r") as f:
    content = f.read()

old = "  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));"
new = "  const hours = Array.from({ length: MAX_SCHEDULE_HOUR - MIN_SCHEDULE_HOUR + 1 }, (_, i) => String(i + MIN_SCHEDULE_HOUR).padStart(2, '0'));"

content = content.replace(old, new)

with open("src/components/TimeSelect.tsx", "w") as f:
    f.write(content)
