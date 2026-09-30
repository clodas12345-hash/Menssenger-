import re

with open("src/components/ContactsView.tsx", "r") as f:
    content = f.read()

# Add import at the top
import_statement = "import { ContactRow } from './ContactRow';\n"
if "ContactRow" not in content:
    content = content.replace("import React, {", import_statement + "import React, {", 1)

# Find the map block
start_marker = "{paginatedContacts.map((contact) => {"
end_marker = "          </div>\n        ) : (\n          <div className=\"p-12 text-center text-gray-400 space-y-3\">"

if start_marker in content and end_marker in content:
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)
    
    replacement = """{paginatedContacts.map((contact) => {
              const meta = contactMetaMap.get(contact.id);
              const isSelected = selectedIds.includes(contact.id);
              const isToday = isContactedToday(contact);
              const isScheduled = scheduledContactIdsSet.has(contact.id);
              const isSkipped = meta?.isSkipped;
              const chipTheme = getChipTheme(contact.chipId, contact.chipName);

              return (
                <ContactRow
                  key={contact.id}
                  contact={contact}
                  meta={meta}
                  isSelected={isSelected}
                  isToday={isToday}
                  isScheduled={isScheduled}
                  isSkipped={isSkipped}
                  chipTheme={chipTheme}
                  searchTerm={searchTerm}
                  isSearchingByPhone={isSearchingByPhone}
                  onToggleSelect={handleToggleSelect}
                  onOpenEdit={handleOpenEdit}
                  onDeleteContact={onDeleteContact}
                  onSendWhatsAppToContact={onSendWhatsAppToContact}
                  showNotification={showNotification}
                  setSelectedIds={setSelectedIds}
                />
              );
            })}
"""
    new_content = content[:start_idx] + replacement + content[end_idx:]
    with open("src/components/ContactsView.tsx", "w") as f:
        f.write(new_content)
    print("Patched successfully")
else:
    print("Could not find markers")
