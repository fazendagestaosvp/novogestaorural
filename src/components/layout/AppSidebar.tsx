
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { 
  Home, 
  User, 
  Settings, 
  Shield, 
  Activity,
  Heart,
  Database,
  LogOut,
  Leaf,
  Calendar,
  FileText,
  BarChart3,
  Baby
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    roles: ['visualizador', 'editor', 'administrador']
  },
  {
    title: "Gestão de Gado",
    url: "/gado",
    icon: Activity,
    roles: ['visualizador', 'editor', 'administrador']
  },
  {
    title: "Gestão de Cavalos",
    url: "/cavalos",
    icon: Heart,
    roles: ['visualizador', 'editor', 'administrador']
  },
  {
    title: "Reprodução Animal",
    url: "/reproducao",
    icon: Baby,
    roles: ['visualizador', 'editor', 'administrador']
  },
  {
    title: "Histórico de Saúde",
    url: "/saude",
    icon: Database,
    roles: ['visualizador', 'editor', 'administrador']
  },
  {
    title: "Calendário",
    url: "/calendario",
    icon: Calendar,
    roles: ['visualizador', 'editor', 'administrador']
  },
  {
    title: "Documentos",
    url: "/documentos",
    icon: FileText,
    roles: ['visualizador', 'editor', 'administrador']
  },
  {
    title: "Relatórios",
    url: "/relatorios",
    icon: BarChart3,
    roles: ['visualizador', 'editor', 'administrador']
  },
  {
    title: "Usuários",
    url: "/usuarios",
    icon: User,
    roles: ['administrador']
  },
  {
    title: "Controle de Acesso",
    url: "/controle-acesso",
    icon: Shield,
    roles: ['administrador']
  },
];

export function AppSidebar() {
  const { user, logout } = useAuth();

  const visibleItems = menuItems.filter(item => {
    // Mapeie os novos valores de role para os valores esperados pelos menuItems
    const mappedRole = user?.role === 'admin' ? 'administrador' : 
                       user?.role === 'manager' ? 'editor' : 'visualizador';
    return user && item.roles.includes(mappedRole);
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
      case 'administrador':
        return 'bg-red-100 text-red-800';
      case 'manager':
      case 'editor':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
      case 'administrador':
        return 'Administrador';
      case 'manager':
      case 'editor':
        return 'Editor';
      default:
        return 'Visualizador';
    }
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-farm-gradient rounded-lg flex items-center justify-center">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-sidebar-foreground">FazendaPlus</h2>
            <p className="text-xs text-sidebar-foreground/70">Gestão Agropecuária</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url} className="flex items-center space-x-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {user && (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {user.full_name?.split(' ')[0]?.[0] || '?'}{user.full_name?.split(' ')[1]?.[0] || ''}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user.full_name}
                </p>
                <div className="flex items-center mt-1">
                  <span className={`text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(user.role)}`}>
                    {getRoleDisplayName(user.role)}
                  </span>
                </div>
              </div>
            </div>
            <Button 
              onClick={logout}
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
