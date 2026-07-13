import { ChatProvider } from '@/contexts/chatContext';
import { LayoutContent } from './LayoutContent';
import { IOSInstallPrompt } from '@/components/pwa/ios-install-prompt';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <LayoutContent>{children}</LayoutContent>
      {/* iOS「加到主畫面」引導：僅 iOS Safari、未安裝、未於 24h 內關閉時出現（spec §5） */}
      <IOSInstallPrompt />
    </ChatProvider>
  );
}
