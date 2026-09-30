import re

with open("src/utils/dateParser.ts", "r") as f:
    content = f.read()

content = content.replace("export const MIN_SCHEDULE_HOUR = 6; // 06:00 AM", "export const MIN_SCHEDULE_HOUR = 8; // 08:00 AM")
content = content.replace("h >= 6 && h <= 20;", "h >= 8 && h <= 20;")

content = content.replace("const h = d.getHours();\n  if (h >= 21 || h < 6) {\n    if (h >= 21) {\n      d.setDate(d.getDate() + 1);\n    }\n    d.setHours(6, 0, 0, 0);\n  }", "const h = d.getHours();\n  if (h >= 21 || h < 8) {\n    if (h >= 21) {\n      d.setDate(d.getDate() + 1);\n    }\n    d.setHours(8, 0, 0, 0);\n  }")

with open("src/utils/dateParser.ts", "w") as f:
    f.write(content)
