
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Edit3, Eye } from 'lucide-react';
import { User } from '@/components/auth/AuthProvider';

interface UserRoleSelectorProps {
  currentRole: User['role'];
  onRoleChange: (role: User['role']) => void;
}

export const UserRoleSelector: React.FC<UserRoleSelectorProps> = ({
  currentRole,
  onRoleChange,
}) => {
  // Mapeamento de roles para garantir compatibilidade
  const getNormalizedRole = (role: string): string => {
    // Mapear roles da UI para o formato do banco de dados
    switch (role) {
      case 'administrador': return 'admin';
      case 'editor': return 'manager';
      case 'visualizador': return 'user';
      default: return role; // Assumir que já está no formato correto
    }
  };

  // Normalizar o role atual para garantir compatibilidade
  const normalizedCurrentRole = getNormalizedRole(currentRole);

  const roles = [
    {
      key: 'user' as const,
      name: 'Visualizador',
      description: 'Acesso apenas para visualização',
      icon: Eye,
      color: 'bg-gray-100 text-gray-800',
    },
    {
      key: 'manager' as const,
      name: 'Editor',
      description: 'Pode criar, editar e remover conteúdo',
      icon: Edit3,
      color: 'bg-blue-100 text-blue-800',
    },
    {
      key: 'admin' as const,
      name: 'Administrador',
      description: 'Acesso total ao sistema e gerenciamento de usuários',
      icon: Shield,
      color: 'bg-red-100 text-red-800',
    },
  ];

  return (
    <div className="space-y-3">
      {roles.map((role) => {
        const Icon = role.icon;
        const isSelected = normalizedCurrentRole === role.key;
        
        return (
          <Card 
            key={role.key} 
            className={`cursor-pointer transition-colors ${
              isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
            }`}
            onClick={() => onRoleChange(role.key)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Icon className="h-5 w-5" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">{role.name}</h3>
                      {isSelected && (
                        <Badge variant="secondary" className="text-xs">
                          Atual
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </div>
                </div>
                <Button
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRoleChange(role.key);
                  }}
                >
                  {isSelected ? 'Selecionado' : 'Selecionar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
