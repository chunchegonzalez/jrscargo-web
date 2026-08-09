'use client';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import ChatBotWidget from './ChatBotWidget';

export function HeaderWrapper() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return null;
  return <Header />;
}

export function FooterWrapper() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return null;
  return <Footer />;
}

export function ChatBotWrapper() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return null;
  return <ChatBotWidget />;
}

export function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  
  return (
    <main className={`flex-1 relative z-10 ${isAdmin ? '' : 'pt-[72px] sm:pt-[88px]'}`}>
      {children}
    </main>
  );
}
