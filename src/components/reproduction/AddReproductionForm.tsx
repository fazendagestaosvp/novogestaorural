import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ReproductionData } from '@/types/reproduction';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const reproductionSchema = z.object({
  animal: z.string().min(1, 'Nome do animal é obrigatório'),
  type: z.enum(['Bovino', 'Equino'], {
    required_error: 'Tipo de animal é obrigatório',
  }),
  method: z.enum(['IATF', 'Monta Natural', 'Repasse'], {
    required_error: 'Método reprodutivo é obrigatório',
  }),
  startDate: z.string().min(1, 'Data de início é obrigatória'),
  status: z.enum(['Prenha', 'Pendente', 'Falhada']),
  ultrasounds: z.number().int().min(0),
  observations: z.string().optional(),
});

type ReproductionFormData = z.infer<typeof reproductionSchema>;

interface AddReproductionFormProps {
  onSubmit: (data: ReproductionData) => void;
  onCancel: () => void;
  defaultValues?: ReproductionData;
  isEditing?: boolean;
}

interface Animal {
  id: string;
  name: string;
  type: 'Bovino' | 'Equino';
}

export const AddReproductionForm = ({ onSubmit, onCancel, defaultValues, isEditing = false }: AddReproductionFormProps) => {
  const { toast } = useToast();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const processedDefaultValues: Partial<ReproductionFormData> = {
    animal: defaultValues?.animal || '',
    type: defaultValues?.type as ('Bovino' | 'Equino') || 'Bovino',
    method: defaultValues?.method as ('IATF' | 'Monta Natural' | 'Repasse') || 'IATF',
    startDate: defaultValues?.startDate || '',
    status: defaultValues?.status as ('Prenha' | 'Pendente' | 'Falhada') || 'Pendente',
    ultrasounds: defaultValues?.ultrasounds || 0,
    observations: defaultValues?.observations || '',
  };

  const form = useForm<ReproductionFormData>({
    resolver: zodResolver(reproductionSchema),
    defaultValues: isEditing ? processedDefaultValues : {
      animal: '',
      type: 'Bovino',
      method: 'IATF',
      startDate: '',
      status: 'Pendente',
      ultrasounds: 0,
      observations: '',
    },
  });

  useEffect(() => {
    async function fetchAnimals() {
      setIsLoading(true);
      try {
        const { data: cattleData, error: cattleError } = await supabase
          .from('cattle')
          .select('id, name');

        const { data: horseData, error: horseError } = await supabase
          .from('horse')
          .select('id, name');

        if (cattleError) {
          console.error('Erro ao carregar dados de gado:', cattleError);
        }

        if (horseError) {
          console.error('Erro ao carregar dados de cavalos:', horseError);
        }

        const formattedCattle: Animal[] = (cattleData || []).map(cattle => ({
          id: cattle.id,
          name: cattle.name,
          type: 'Bovino' as const
        }));

        const formattedHorses: Animal[] = (horseData || []).map(horse => ({
          id: horse.id,
          name: horse.name,
          type: 'Equino' as const
        }));

        const allAnimals = [...formattedCattle, ...formattedHorses];
        setAnimals(allAnimals);
      } catch (error) {
        console.error('Erro ao carregar dados de animais:', error);
        toast({
          title: "Erro ao carregar animais",
          description: "Não foi possível carregar a lista de animais.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnimals();
  }, [toast]);

  const handleSubmit = (data: ReproductionFormData) => {
    const reproductionData: ReproductionData = {
      id: isEditing && defaultValues ? defaultValues.id : `REP${String(Date.now()).slice(-3).padStart(3, '0')}`,
      animal: data.animal,
      type: data.type,
      method: data.method,
      startDate: data.startDate,
      status: data.status,
      ultrasounds: data.ultrasounds,
      observations: data.observations,
    };

    onSubmit(reproductionData);

    toast({
      title: isEditing ? "Registro atualizado com sucesso!" : "Registro criado com sucesso!",
      description: isEditing
        ? `Registro de reprodução para ${data.animal} foi atualizado.`
        : `Registro de reprodução para ${data.animal} foi adicionado.`,
    });
  };

  const selectedAnimalType = form.watch('animal');
  const animalData = animals.find(animal => animal.name === selectedAnimalType);

  return (
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle>{isEditing ? 'Editar Registro de Reprodução' : 'Novo Registro de Reprodução'}</SheetTitle>
        <SheetDescription>
          {isEditing
            ? 'Atualize as informações do registro de reprodução animal.'
            : 'Adicione um novo registro de reprodução animal ao sistema.'}
        </SheetDescription>
      </SheetHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="animal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Animal</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    const selectedAnimal = animals.find(animal => animal.name === value);
                    if (selectedAnimal) {
                      form.setValue('type', selectedAnimal.type as 'Bovino' | 'Equino');
                    }
                  }}
                  defaultValue={field.value}
                  disabled={isEditing || isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoading ? "Carregando animais..." : "Selecione o animal"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {animals.length > 0 ? (
                      animals.map((animal) => (
                        <SelectItem key={animal.id} value={animal.name}>
                          {animal.name} ({animal.type})
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-2 text-sm text-muted-foreground">
                        {isLoading ? "Carregando..." : "Nenhum animal encontrado"}
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Animal</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={!!animalData || isEditing}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Bovino">Bovino</SelectItem>
                    <SelectItem value="Equino">Equino</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Método Reprodutivo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o método" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="IATF">IATF</SelectItem>
                    <SelectItem value="Monta Natural">Monta Natural</SelectItem>
                    <SelectItem value="Repasse">Repasse</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Início</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isEditing && (
            <>
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Prenha">Prenha</SelectItem>
                        <SelectItem value="Falhada">Falhada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ultrasounds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade de Ultrassons</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <FormField
            control={form.control}
            name="observations"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observações (Opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Digite observações sobre o processo reprodutivo..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit">
              {isEditing ? 'Salvar Alterações' : 'Adicionar Registro'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
