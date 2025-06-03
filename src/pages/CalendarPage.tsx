import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Plus, Clock, MapPin, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { AddEventForm } from '@/components/calendar/AddEventForm';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'Vacinação' | 'Consulta' | 'Reprodução' | 'Tratamento' | 'Manejo' | 'Outro';
  animal?: string;
  time: string;
  location?: string;
  description?: string;
  reminder?: boolean;
}

export const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    setIsLoading(true);
    try {
      // Buscar eventos do calendário
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*');
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Coletar todos os IDs de animais únicos para buscar seus nomes
        const animalIds = data
          .filter(event => event.animal_id)
          .map(event => event.animal_id);
        
        // Criar um mapa de ID para nome de animal
        const animalIdToNameMap: Record<string, string> = {};
        
        if (animalIds.length > 0) {
          // Buscar os nomes dos animais
          const { data: animalsData, error: animalsError } = await supabase
            .from('animals')
            .select('id, name')
            .in('id', animalIds);
            
          if (animalsError) {
            console.error('Erro ao buscar nomes dos animais:', animalsError);
          }
          
          if (animalsData) {
            // Preencher o mapa de ID para nome
            animalsData.forEach(animal => {
              animalIdToNameMap[animal.id] = animal.name;
            });
          }
        }
        
        // Converter as strings de data do banco em objetos Date e adicionar nomes de animais
        const formattedEvents = data.map(event => ({
          ...event,
          date: new Date(event.date),
          animal: event.animal_id ? animalIdToNameMap[event.animal_id] || 'Animal não encontrado' : undefined
        }));
        
        setEvents(formattedEvents);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os eventos do calendário.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'Vacinação': return 'bg-blue-100 text-blue-800';
      case 'Consulta': return 'bg-green-100 text-green-800';
      case 'Reprodução': return 'bg-purple-100 text-purple-800';
      case 'Tratamento': return 'bg-orange-100 text-orange-800';
      case 'Manejo': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const selectedDateEvents = events.filter(event => {
    if (!selectedDate) return false;
    return event.date.toDateString() === selectedDate.toDateString();
  });

  const upcomingEvents = events
    .filter(event => {
      // Garantir que a data seja do tipo Date para comparação
      const eventDate = event.date instanceof Date ? event.date : new Date(event.date);
      return eventDate >= new Date();
    })
    .sort((a, b) => {
      // Garantir que as datas sejam do tipo Date para ordenação
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 5);

  const handleAddEvent = async (newEvent: any) => {
    try {
      // Converter a string de data para objeto Date e formato ISO para o Supabase
      const [year, month, day] = newEvent.date.split('-').map(num => parseInt(num, 10));
      const eventDate = new Date(year, month - 1, day); // mês é 0-indexado em JavaScript
      
      // Preparar o objeto para salvar no Supabase
      const eventToSave: any = {
        title: newEvent.title,
        description: newEvent.description || null,
        date: eventDate.toISOString().split('T')[0], // Formato ISO para o Supabase (YYYY-MM-DD)
        time: newEvent.time,
        type: newEvent.type,
        location: newEvent.location || null,
        reminder: newEvent.reminder || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Se tiver um animal, procurar ou criar o ID do animal
      if (newEvent.animal && newEvent.animal.trim()) {
        // Verificar se o animal já existe
        const { data: existingAnimal, error: findError } = await supabase
          .from('animals')
          .select('id')
          .ilike('name', newEvent.animal.trim())
          .single();
        
        if (findError && findError.code !== 'PGRST116') {
          // Erro diferente de "não encontrado"
          throw findError;
        }
        
        if (existingAnimal) {
          // Se o animal existe, usar o ID dele
          eventToSave.animal_id = existingAnimal.id;
        } else {
          // Se o animal não existe, criar um novo
          const { data: newAnimal, error: createError } = await supabase
            .from('animals')
            .insert([{ 
              name: newEvent.animal.trim(),
              type: 'cattle', // Valor padrão
              status: 'active'
            }])
            .select()
            .single();
            
          if (createError) {
            console.error('Erro ao criar animal:', createError);
            throw new Error('Não foi possível criar o registro do animal');
          }
          
          if (newAnimal) {
            eventToSave.animal_id = newAnimal.id;
          }
        }
      }
      
      console.log('Dados a serem inseridos:', eventToSave);
      
      const { data, error } = await supabase
        .from('calendar_events')
        .insert([eventToSave])
        .select();
        
      if (error) {
        console.error('Erro do Supabase:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error('Nenhum dado retornado após inserção');
      }
      
      // Formatar o evento retornado para adicionar ao estado
      const formattedEvent: CalendarEvent = {
        ...data[0],
        date: eventDate, // Usar o objeto Date criado
        animal: newEvent.animal // Manter o nome do animal para exibição
      };
      
      setEvents(prevEvents => [...prevEvents, formattedEvent]);
      setIsAddEventOpen(false);
      
      // Se o evento adicionado for para a data selecionada atualmente, atualizar a seleção para atualizar a visualização
      if (selectedDate && eventDate.toDateString() === selectedDate.toDateString()) {
        setSelectedDate(new Date(selectedDate));
      }
      
      toast({
        title: "Evento adicionado",
        description: `O evento "${newEvent.title}" foi adicionado ao calendário.`,
      });
    } catch (error: any) {
      console.error("Erro ao adicionar evento:", error);
      toast({
        title: "Erro ao adicionar evento",
        description: error.message || "Ocorreu um erro ao adicionar o evento. Verifique os dados e tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleCancelAddEvent = () => {
    setIsAddEventOpen(false);
  };

  const handleDeleteEvent = (event: CalendarEvent) => {
    setEventToDelete(event);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteEvent = async () => {
    if (eventToDelete) {
      try {
        const { error } = await supabase
          .from('calendar_events')
          .delete()
          .eq('id', eventToDelete.id);
          
        if (error) throw error;
        
        setEvents(prevEvents => prevEvents.filter(event => event.id !== eventToDelete.id));
        setIsDeleteDialogOpen(false);
        setEventToDelete(null);
        
        toast({
          title: "Evento excluído",
          description: `O evento "${eventToDelete.title}" foi removido do calendário.`,
        });
      } catch (error) {
        console.error('Erro ao excluir evento:', error);
        toast({
          title: "Erro ao excluir evento",
          description: "Não foi possível excluir o evento. Tente novamente.",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Calendário</h1>
        <Button 
          className="bg-green-600 hover:bg-green-700"
          onClick={() => setIsAddEventOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Evento
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CalendarDays className="h-5 w-5" />
              <span>Calendário de Eventos</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Events for Selected Date */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                Eventos Selecionados
                {selectedDate && (
                  <span className="text-sm font-normal text-muted-foreground block">
                    {selectedDate.toLocaleDateString('pt-BR')}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDateEvents.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateEvents.map((event) => (
                    <div key={event.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{event.title}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge className={getEventTypeColor(event.type)}>
                            {event.type}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteEvent(event)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {event.animal && (
                        <p className="text-sm text-muted-foreground">
                          Animal: {event.animal}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{event.time}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-2 border-t pt-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum evento nesta data
                </p>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle>Próximos Eventos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event) => (
                    <div key={event.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm">{event.title}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge className={getEventTypeColor(event.type)} variant="secondary">
                            {event.type}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteEvent(event)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.date).toLocaleDateString('pt-BR')} às {event.time}
                      </p>
                      {event.animal && (
                        <p className="text-xs text-muted-foreground">
                          {event.animal}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum evento próximo
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Add Event Sheet */}
      <Sheet open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
        <SheetContent className="sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>Adicionar Evento</SheetTitle>
            <SheetDescription>
              Preencha as informações para adicionar um novo evento ao calendário.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <AddEventForm 
              onSubmit={handleAddEvent} 
              onCancel={handleCancelAddEvent} 
            />
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Delete Event Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o evento "{eventToDelete?.title}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteEvent} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
