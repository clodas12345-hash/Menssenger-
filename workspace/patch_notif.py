with open("src/components/ContactsView.tsx", "r") as f:
    content = f.read()

content = content.replace("const showNotification = (msg: string) => {", "const showNotification = React.useCallback((msg: string) => {")
content = content.replace("    setTimeout(() => setNotification(''), 4000);\n  };", "    setTimeout(() => setNotification(''), 4000);\n  }, []);")

with open("src/components/ContactsView.tsx", "w") as f:
    f.write(content)
print("Patched showNotification")
