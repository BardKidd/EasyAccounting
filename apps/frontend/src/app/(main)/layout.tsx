import { ChatProvider } from '@/contexts/chatContext';
import { LayoutContent } from './LayoutContent';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <LayoutContent>{children}</LayoutContent>
    </ChatProvider>
  );
}
