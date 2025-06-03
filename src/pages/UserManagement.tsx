
import React, { useState, useEffect } from 'react';
import { useAuth, User } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Search, Shield, Users, Eye, Edit3, Loader2 } from 'lucide-react';
import { UserRoleSelector } from '@/components/admin/UserRoleSelector';
import { AddUserDialog } from '@/components/admin/AddUserDialog';

export const UserManagement: React.FC = () => {
  const { users, updateUserRole, removeUser, getUserStats, refreshUsers } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);

  const stats = getUserStats();

  const filteredUsers = users.filter(user =>
    (user.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  // Carregar usuários quando o componente montar
  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      try {
        await refreshUsers();
        console.log('Lista de usuários atualizada');
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        toast({
          title: "Erro ao carregar usuários",
          description: "Não foi possível carregar a lista de usuários. Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUsers();
  }, [refreshUsers, toast]);
  
  // Função para atualizar manualmente a lista de usuários
  const handleRefreshUsers = async () => {
    if (isLoading) return; // Evitar múltiplas requisições
    
    setIsLoading(true);
    try {
      await refreshUsers();
      toast({
        title: "Lista atualizada",
        description: "A lista de usuários foi atualizada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao atualizar lista de usuários:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar a lista de usuários.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (newRole: string) => {
    if (selectedUser) {
      setLoadingUserId(selectedUser.id);
      try {
        await updateUserRole(selectedUser.id, newRole);
        toast({
          title: "Role atualizado",
          description: `${selectedUser.full_name} agora é ${getRoleDisplayName(newRole)}`,
        });
        setIsRoleDialogOpen(false);
        setSelectedUser(null);
      } catch (error) {
        console.error('Erro ao atualizar role:', error);
        toast({
          title: "Erro ao atualizar role",
          description: "Não foi possível atualizar o role do usuário. Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setLoadingUserId(null);
      }
    }
  };

  const handleRemoveUser = async (user: User) => {
    setLoadingUserId(user.id);
    try {
      await removeUser(user.id);
      toast({
        title: "Usuário removido",
        description: `${user.full_name} foi removido do sistema`,
      });
      // Atualizar a lista de usuários após remover
      await refreshUsers();
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
      toast({
        title: "Erro ao remover usuário",
        description: "Não foi possível remover o usuário. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoadingUserId(null);
    }
  };

  const getRoleDisplayName = (role: User['role']) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'administrador': return 'Administrador';
      case 'manager': return 'Editor';
      case 'editor': return 'Editor';
      case 'user': return 'Visualizador';
      case 'visualizador': return 'Visualizador';
      default: return 'Visualizador';
    }
  };

  const getRoleBadgeColor = (role: User['role']) => {
    switch (role) {
      case 'admin': 
      case 'administrador': 
        return 'bg-red-100 text-red-800';
      case 'manager':
      case 'editor': 
        return 'bg-blue-100 text-blue-800';
      case 'user':
      case 'visualizador':
      default: 
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: User['role']) => {
    switch (role) {
      case 'admin':
      case 'administrador': 
        return Shield;
      case 'manager':
      case 'editor': 
        return Edit3;
      case 'user':
      case 'visualizador':
      default: 
        return Eye;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Usuários</h1>
          <p className="text-muted-foreground">Gerencie usuários e suas permissões no sistema</p>
        </div>
        <AddUserDialog />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total de Usuários</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{stats.administrador}</p>
                <p className="text-sm text-muted-foreground">Administradores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Edit3 className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.editor}</p>
                <p className="text-sm text-muted-foreground">Editores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Eye className="h-8 w-8 text-gray-600" />
              <div>
                <p className="text-2xl font-bold">{stats.visualizador}</p>
                <p className="text-sm text-muted-foreground">Visualizadores</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Usuários</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefreshUsers} 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando...
                </>
              ) : (
                'Atualizar Lista'
              )}
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
              disabled={isLoading}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Último Login</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const RoleIcon = getRoleIcon(user.role);
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-primary-foreground text-sm font-medium">
                            {user.full_name?.split(' ')[0]?.[0] || '?'}{user.full_name?.split(' ')[1]?.[0] || ''}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Criado em {new Date(user.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        <RoleIcon className="h-3 w-3 mr-1" />
                        {getRoleDisplayName(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.updated_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        Ativo
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={loadingUserId === user.id}
                          onClick={() => {
                            setSelectedUser(user);
                            setIsRoleDialogOpen(true);
                          }}
                        >
                          Alterar Role
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={loadingUserId === user.id}
                          onClick={() => handleRemoveUser(user)}
                        >
                          {loadingUserId === user.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Carregando...
                            </>
                          ) : (
                            'Remover'
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Role Change Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Alterar Role de {selectedUser?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione o novo nível de acesso para este usuário:
            </p>
            <UserRoleSelector
              currentRole={selectedUser?.role || 'visualizador'}
              onRoleChange={handleRoleChange}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
