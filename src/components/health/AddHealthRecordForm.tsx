import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { HealthRecord } from '@/types/health';

const healthRecordSchema = z.object({
  animal: z.string().min(1, 'Nome do animal é obrigatório'),
  type: z.enum(['Vacinação', 'Exame', 'Tratamento', 'Consulta']),
  procedure: z.string().min(1, 'Procedimento é obrigatório'),
  date: z.string().min(1, 'Data é obrigatória'),
  veterinarian: z.string().min(1, 'Veterinário é obrigatório'),
  status: z.enum(['Concluído', 'Agendado', 'Em andamento']),
  observations: z.string().optional(),
  cost: z.number().optional(),
});

type HealthRecordFormData = z.infer<typeof healthRecordSchema>;

interface AddHealthRecordFormProps {
  onSubmit: (data: HealthRecord) => void;
  onCancel: () => void;
  defaultValues?: HealthRecord;
  isEditing?: boolean;
}

export function AddHealthRecordForm({ onSubmit, onCancel, defaultValues, isEditing = false }: AddHealthRecordFormProps) {
  // Processar defaultValues para o formato esperado pelo react-hook-form
  const processedDefaultValues: Partial<HealthRecordFormData> = {
    animal: defaultValues?.animal || '',
    type: defaultValues?.type as ('Vacinação' | 'Exame' | 'Tratamento' | 'Consulta') || 'Vacinação',
    procedure: defaultValues?.procedure || '',
    date: defaultValues?.date || '',
    veterinarian: defaultValues?.veterinarian || '',
    status: defaultValues?.status as ('Concluído' | 'Agendado' | 'Em andamento') || 'Agendado',
    observations: defaultValues?.observations || '',
    cost: defaultValues?.cost || undefined,
  };

  const form = useForm<HealthRecordFormData>({
    resolver: zodResolver(healthRecordSchema),
    defaultValues: isEditing ? processedDefaultValues : {
      animal: '',
      type: 'Vacinação',
      procedure: '',
      date: '',
      veterinarian: '',
      status: 'Agendado',
      observations: '',
    },
  });

  const handleSubmit = (data: HealthRecordFormData) => {
    const healthRecord: HealthRecord = {
      // Ao adicionar um novo registro, deixe o ID vazio para o Supabase gerar
      // Apenas use o ID existente se estiver editando
      id: isEditing && defaultValues ? defaultValues.id : '', // ID vazio, será gerado pelo Supabase
      animal: data.animal,
      type: data.type,
      procedure: data.procedure,
      date: data.date,
      veterinarian: data.veterinarian,
      status: data.status,
      observations: data.observations,
      cost: data.cost || 0,
    };
    onSubmit(healthRecord);
    if (!isEditing) {
      form.reset();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="animal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Animal</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Nome do animal" 
                  {...field} 
                  disabled={isEditing}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                disabled={isEditing}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Vacinação">Vacinação</SelectItem>
                  <SelectItem value="Exame">Exame</SelectItem>
                  <SelectItem value="Tratamento">Tratamento</SelectItem>
                  <SelectItem value="Consulta">Consulta</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="procedure"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Procedimento</FormLabel>
              <FormControl>
                <Input placeholder="Nome do procedimento" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="veterinarian"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Veterinário</FormLabel>
              <FormControl>
                <Input placeholder="Nome do veterinário" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                  <SelectItem value="Agendado">Agendado</SelectItem>
                  <SelectItem value="Em andamento">Em andamento</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cost"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Custo (R$)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  {...field}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="observations"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea placeholder="Observações adicionais" {...field} />
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
            {isEditing ? 'Salvar Alterações' : 'Salvar Registro'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
