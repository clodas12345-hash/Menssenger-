with open("src/components/ContactsView.tsx", "r") as f:
    content = f.read()

# Fix handleOpenAdd
content = content.replace("const handleOpenAdd = () => {", "const handleOpenAdd = React.useCallback(() => {")

with open("src/components/ContactsView.tsx", "w") as f:
    f.write(content)
print("Fixed")
