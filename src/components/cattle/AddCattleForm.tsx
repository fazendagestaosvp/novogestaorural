import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { CattleData } from '@/types/cattle';

const cattleFormSchema = z.object({
  id: z.string().min(1, 'Identificação é obrigatória'),
  name: z.string().min(1, 'Nome é obrigatório'),
  breed: z.string().min(1, 'Raça é obrigatória'),
  category: z.enum(['Bezerro', 'Novilho', 'Touro', 'Vaca', 'Bezerra', 'Novilha']),
  dateOfBirth: z.date().optional(),
  entryDate: z.date().optional(),
  gender: z.enum(['Macho', 'Fêmea']),
  status: z.enum(['Ativo', 'Vendido', 'Tratamento']),
  weight: z.number().min(1, 'Peso deve ser maior que 0'),
  observations: z.string().optional(),
});

type CattleFormData = z.infer<typeof cattleFormSchema>;

interface AddCattleFormProps {
  onSubmit: (data: CattleData) => void;
  onCancel: () => void;
  defaultValues?: CattleData;
  isEditing?: boolean;
}

export function AddCattleForm({ onSubmit, onCancel, defaultValues, isEditing = false }: AddCattleFormProps) {
  // Processar defaultValues para o formato esperado pelo react-hook-form
  const processedDefaultValues: Partial<CattleFormData> = {
    id: defaultValues?.id || '',
    name: defaultValues?.name || '',
    breed: defaultValues?.breed || '',
    category: defaultValues?.category || 'Bezerro',
    gender: defaultValues?.gender || 'Macho',
    status: defaultValues?.status || 'Ativo',
    weight: defaultValues?.weight || 0,
    observations: defaultValues?.observations || '',
    dateOfBirth: defaultValues?.dateOfBirth ? new Date(defaultValues.dateOfBirth) : undefined,
    entryDate: defaultValues?.entryDate ? new Date(defaultValues.entryDate) : undefined,
  };

  const form = useForm<CattleFormData>({
    resolver: zodResolver(cattleFormSchema),
    defaultValues: isEditing ? processedDefaultValues : {
      id: '',
      name: '',
      breed: '',
      category: 'Bezerro',
      gender: 'Macho',
      status: 'Ativo',
      weight: 0,
      observations: '',
    },
  });

  const handleSubmit = (data: CattleFormData) => {
    // Calculate age if date of birth is provided
    const age = data.dateOfBirth 
      ? Math.floor((new Date().getTime() - data.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365))
      : defaultValues?.age || 0;

    const cattleData: CattleData = {
      id: data.id,
      name: data.name,
      breed: data.breed,
      category: data.category,
      gender: data.gender,
      status: data.status,
      weight: data.weight,
      age,
      dateOfBirth: data.dateOfBirth,
      entryDate: data.entryDate,
      observations: data.observations,
    };

    onSubmit(cattleData);
  };

  return (
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle>{isEditing ? 'Editar Animal' : 'Novo Animal'}</SheetTitle>
        <SheetDescription>
          {isEditing 
            ? 'Atualize as informações do animal no formulário abaixo.' 
            : 'Preencha as informações do novo animal abaixo.'}
        </SheetDescription>
      </SheetHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Identificação</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: BOV001" 
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do animal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="breed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Raça</FormLabel>
                  <FormControl>
                    <Input placeholder="Raça do animal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Bezerro">Bezerro</SelectItem>
                      <SelectItem value="Bezerra">Bezerra</SelectItem>
                      <SelectItem value="Novilho">Novilho</SelectItem>
                      <SelectItem value="Novilha">Novilha</SelectItem>
                      <SelectItem value="Touro">Touro</SelectItem>
                      <SelectItem value="Vaca">Vaca</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gênero</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o gênero" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Macho">Macho</SelectItem>
                      <SelectItem value="Fêmea">Fêmea</SelectItem>
                    </SelectContent>
                  </Select>
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
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Tratamento">Tratamento</SelectItem>
                      <SelectItem value="Vendido">Vendido</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Peso (kg)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Peso em kg" 
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Nascimento</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy")
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="entryDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Entrada</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy")
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
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
                    <Textarea
                      placeholder="Observações adicionais"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit">
              {isEditing ? 'Salvar Alterações' : 'Adicionar Animal'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
