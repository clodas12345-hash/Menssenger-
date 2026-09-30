const fs = require('fs');
const path = 'src/components/DispatcherModal.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add copyImageToClipboard function inside or outside DispatcherModal
const copyImageFunc = `
  const copyImageToClipboard = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      // Ensure we are copying as PNG if possible, or just use the blob's type
      const item = new ClipboardItem({ [blob.type]: blob });
      await navigator.clipboard.write([item]);
      return true;
    } catch (err) {
      console.error('Failed to copy image to clipboard:', err);
      return false;
    }
  };
`;

// Find where to insert it. Inside handleSend is fine, or right before handleSend.
const insertTarget = "const handleSend = ";
if (code.includes(insertTarget) && !code.includes("copyImageToClipboard")) {
    code = code.replace(insertTarget, copyImageFunc + "\n  " + insertTarget);
    console.log("Added copyImageToClipboard");
}

// 2. Modify handleSend to use it
const handleSendOriginal = `const handleSend = () => {
    if (!currentContact) return;
    
    const link = buildWhatsAppLink(currentContact.phone, currentMessageText, settings?.sendMode || 'api');
    const newWindow = window.open(link, '_blank');
    
    setPendingConfirmState({`;

// Since it might be slightly different now because I removed isRunningAuto earlier, let's just use regex to replace the body of handleSend.

const handleSendRegex = /const handleSend = \(\) => \{[\s\S]*?setPendingConfirmState\(\{/m;

const handleSendNew = `const handleSend = async () => {
    if (!currentContact) return;
    
    if (campaign.cardImageUrl) {
      const copied = await copyImageToClipboard(campaign.cardImageUrl);
      if (copied) {
        // We can show a simple native alert or toast, or just rely on the user pasting
        // alert('Imagem copiada para a área de transferência! Cole no WhatsApp (Ctrl+V).');
      }
    }

    const link = buildWhatsAppLink(currentContact.phone, currentMessageText, settings?.sendMode || 'api');
    const newWindow = window.open(link, '_blank');
    
    setPendingConfirmState({`;

if (handleSendRegex.test(code)) {
    code = code.replace(handleSendRegex, handleSendNew);
    console.log("Patched handleSend to copy image");
}

fs.writeFileSync(path, code);
