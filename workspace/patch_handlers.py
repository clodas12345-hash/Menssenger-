import re

with open("src/components/ContactsView.tsx", "r") as f:
    content = f.read()

content = content.replace("const handleToggleSelect = (id: string) => {", "const handleToggleSelect = React.useCallback((id: string) => {")
content = content.replace("    );\n  };", "    );\n  }, []);")

content = content.replace("const handleOpenEdit = (c: Contact) => {", "const handleOpenEdit = React.useCallback((c: Contact) => {")
# Find the end of handleOpenEdit. It ends with:
#     setIsAddModalOpen(true);
#   };
content = content.replace("    setIsAddModalOpen(true);\n  };", "    setIsAddModalOpen(true);\n  }, []);")

with open("src/components/ContactsView.tsx", "w") as f:
    f.write(content)

print("Patched handlers successfully")
