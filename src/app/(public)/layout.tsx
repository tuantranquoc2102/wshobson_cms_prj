import type { ReactNode } from 'react';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-10">
        <div className="container">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
