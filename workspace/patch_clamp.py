import re

with open("src/utils/dateParser.ts", "r") as f:
    content = f.read()

content = content.replace("if (isNaN(hh) || hh < 0 || hh > 23) hh = 8;", "if (isNaN(hh) || hh < MIN_SCHEDULE_HOUR || hh > MAX_SCHEDULE_HOUR) hh = isNaN(hh) ? MIN_SCHEDULE_HOUR : Math.max(MIN_SCHEDULE_HOUR, Math.min(MAX_SCHEDULE_HOUR, hh));")

with open("src/utils/dateParser.ts", "w") as f:
    f.write(content)
