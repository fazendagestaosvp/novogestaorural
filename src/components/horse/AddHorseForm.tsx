import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { FileUpload } from '@/components/ui/file-upload';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HorseData } from '@/types/horse';

const horseFormSchema = z.object({
  id: z.string().min(1, 'Identificação é obrigatória'),
  name: z.string().min(1, 'Nome é obrigatório'),
  breed: z.string().min(1, 'Raça é obrigatória'),
  color: z.string().min(1, 'Cor é obrigatória'),
  dateOfBirth: z.date().optional(),
  entryDate: z.date().optional(),
  gender: z.enum(['Macho', 'Fêmea']),
  status: z.enum(['Potro', 'Domado', 'Em treinamento', 'Vendido', 'Morto', 'Prenha', 'Saudável']),
  weight: z.number().min(1, 'Peso deve ser maior que 0').optional(),
  observations: z.string().optional(),
});

type HorseFormData = z.infer<typeof horseFormSchema>;

interface AddHorseFormProps {
  onSubmit: (data: HorseData) => void;
  onCancel: () => void;
  defaultValues?: HorseData;
  isEditing?: boolean;
}

export function AddHorseForm({ onSubmit, onCancel, defaultValues, isEditing = false }: AddHorseFormProps) {
  // Initialize file states for photos, ensuring proper handling of both URL strings and File objects
  const [animalPhotos, setAnimalPhotos] = useState<(File | string)[]>(
    defaultValues?.animalPhotos || []
  );
  const [fatherPhoto, setFatherPhoto] = useState<(File | string)[]>(
    defaultValues?.fatherPhoto ? [defaultValues.fatherPhoto] : []
  );
  const [motherPhoto, setMotherPhoto] = useState<(File | string)[]>(
    defaultValues?.motherPhoto ? [defaultValues.motherPhoto] : []
  );
  const [registrationCertificate, setRegistrationCertificate] = useState<(File | string)[]>(
    defaultValues?.registrationCertificate ? [defaultValues.registrationCertificate] : []
  );

  // Processar defaultValues para o formato esperado pelo react-hook-form
  const processedDefaultValues: Partial<HorseFormData> = {
    id: defaultValues?.id || '',
    name: defaultValues?.name || '',
    breed: defaultValues?.breed || '',
    color: defaultValues?.color || '',
    gender: defaultValues?.gender || 'Macho',
    status: defaultValues?.status || 'Saudável',
    weight: defaultValues?.weight || undefined,
    observations: defaultValues?.observations || '',
    dateOfBirth: defaultValues?.dateOfBirth ? new Date(defaultValues.dateOfBirth) : undefined,
    entryDate: defaultValues?.entryDate ? new Date(defaultValues.entryDate) : undefined,
  };

  const form = useForm<HorseFormData>({
    resolver: zodResolver(horseFormSchema),
    defaultValues: isEditing ? processedDefaultValues : {
      id: '',
      name: '',
      breed: '',
      color: '',
      gender: 'Macho',
      status: 'Saudável',
      observations: '',
    },
  });

  const handleSubmit = (data: HorseFormData) => {
    const age = data.dateOfBirth 
      ? Math.floor((new Date().getTime() - data.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365))
      : defaultValues?.age || 0;

    // Create a properly structured horse data object that ensures correct types for files/URLs
    const horseData: HorseData = {
      id: data.id,
      name: data.name,
      breed: data.breed,
      color: data.color,
      gender: data.gender,
      status: data.status,
      age,
      dateOfBirth: data.dateOfBirth,
      entryDate: data.entryDate,
      weight: data.weight,
      observations: data.observations,
      animalPhotos: animalPhotos.length > 0 ? animalPhotos : undefined,
      fatherPhoto: fatherPhoto.length > 0 ? fatherPhoto[0] : undefined,
      motherPhoto: motherPhoto.length > 0 ? motherPhoto[0] : undefined,
      registrationCertificate: registrationCertificate.length > 0 ? registrationCertificate[0] : undefined,
    };
    
    console.log('Form data being submitted:', horseData);

    onSubmit(horseData);
  };

  return (
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle>{isEditing ? 'Editar Cavalo' : 'Novo Cavalo'}</SheetTitle>
        <SheetDescription>
          {isEditing 
            ? 'Atualize as informações do cavalo no formulário abaixo.' 
            : 'Adicione um novo cavalo ao plantel preenchendo as informações abaixo.'}
        </SheetDescription>
      </SheetHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Dados Básicos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados Básicos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Identificação/Tag *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: EQU001" 
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
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do cavalo" {...field} />
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
                      <FormLabel>Raça *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Quarto de Milha, Mangalarga" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Castanho, Preto, Branco" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gênero *</FormLabel>
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
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Peso (kg)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Datas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Datas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd/MM/yyyy")
                              ) : (
                                <span>Selecione a data</span>
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
                            disabled={(date) => date > new Date()}
                            initialFocus
                            className="p-3 pointer-events-auto"
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
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd/MM/yyyy")
                              ) : (
                                <span>Selecione a data</span>
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
                            disabled={(date) => date > new Date()}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status do Animal</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Potro">Potro</SelectItem>
                        <SelectItem value="Domado">Domado</SelectItem>
                        <SelectItem value="Em treinamento">Em treinamento</SelectItem>
                        <SelectItem value="Vendido">Vendido</SelectItem>
                        <SelectItem value="Morto">Morto</SelectItem>
                        <SelectItem value="Prenha">Prenha</SelectItem>
                        <SelectItem value="Saudável">Saudável</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Fotos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fotos do Animal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Fotos do Animal
                </label>
                <FileUpload
                  onFilesChange={setAnimalPhotos}
                  files={animalPhotos}
                  multiple={true}
                  accept={{ 'image/*': ['.jpeg', '.jpg', '.png'] }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Foto do Pai
                  </label>
                  <FileUpload
                    onFilesChange={setFatherPhoto}
                    files={fatherPhoto}
                    multiple={false}
                    accept={{ 'image/*': ['.jpeg', '.jpg', '.png'] }}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Foto da Mãe
                  </label>
                  <FileUpload
                    onFilesChange={setMotherPhoto}
                    files={motherPhoto}
                    multiple={false}
                    accept={{ 'image/*': ['.jpeg', '.jpg', '.png'] }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documentos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Certificado de Registro
                </label>
                <FileUpload
                  onFilesChange={setRegistrationCertificate}
                  files={registrationCertificate}
                  multiple={false}
                  accept={{ 
                    'image/*': ['.jpeg', '.jpg', '.png'],
                    'application/pdf': ['.pdf']
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Observações adicionais sobre o cavalo..."
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit">
              {isEditing ? 'Salvar Alterações' : 'Adicionar Cavalo'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
