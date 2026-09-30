import re

with open("src/components/DispatcherModal.tsx", "r") as f:
    content = f.read()

# Replace allChips.map((chip: any) => {
old_map = "{allChips.map((chip: any) => {"
new_map = "{allChips.filter((chip: any) => chip.cleanName.toLowerCase().includes('business') || chip.cleanName.toLowerCase().includes('suporte')).map((chip: any) => {"
content = content.replace(old_map, new_map)

with open("src/components/DispatcherModal.tsx", "w") as f:
    f.write(content)
print("Filtered successfully")
