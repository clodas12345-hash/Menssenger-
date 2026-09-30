import re

with open("src/components/ContactRow.tsx", "r") as f:
    content = f.read()

content = content.replace("searchTerm: string;", "isHighlighted: boolean;")
content = content.replace("isSearchingByPhone: boolean;", "")
content = content.replace("searchTerm,\n  isSearchingByPhone,\n", "isHighlighted,\n")
content = content.replace("searchTerm,\n  isSearchingByPhone", "isHighlighted")
content = content.replace("isSearchingByPhone && matchPhoneNumber(contact.phone, searchTerm)", "isHighlighted")

with open("src/components/ContactRow.tsx", "w") as f:
    f.write(content)

with open("src/components/ContactsView.tsx", "r") as f:
    content2 = f.read()

content2 = content2.replace("searchTerm={searchTerm}", "isHighlighted={isSearchingByPhone && matchPhoneNumber(contact.phone, searchTerm)}")
content2 = content2.replace("isSearchingByPhone={isSearchingByPhone}\n", "")

with open("src/components/ContactsView.tsx", "w") as f:
    f.write(content2)

print("Patched searchTerm -> isHighlighted successfully")
