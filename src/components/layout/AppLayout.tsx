
import React from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-green-50 via-white to-green-50 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="container flex h-14 items-center px-4">
              <SidebarTrigger className="mr-4" />
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-semibold text-foreground">Sistema de Gestão Rural</h1>
              </div>
            </div>
          </header>
          <div className="flex-1 p-6 overflow-auto" style={{ height: 'calc(100vh - 3.5rem)' }}>
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};
