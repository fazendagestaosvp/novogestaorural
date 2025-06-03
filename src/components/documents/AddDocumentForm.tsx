
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FileUpload } from '@/components/ui/file-upload';
import { Document } from '@/types/document';

const documentSchema = z.object({
  name: z.string().min(1, 'Nome do documento é obrigatório'),
  category: z.enum(['Vacinação', 'Reprodução', 'Financeiro', 'Legal', 'Outro']),
  description: z.string().optional(),
});

type DocumentFormData = z.infer<typeof documentSchema>;

interface AddDocumentFormProps {
  onSubmit: (data: Document) => void;
  onCancel: () => void;
}

export function AddDocumentForm({ onSubmit, onCancel }: AddDocumentFormProps) {
  const [files, setFiles] = useState<File[]>([]);

  const form = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      name: '',
      category: 'Outro',
      description: '',
    },
  });

  const handleSubmit = (data: DocumentFormData) => {
    if (files.length === 0) {
      form.setError('root', { message: 'Selecione pelo menos um arquivo' });
      return;
    }

    const file = files[0];
    const newDocument: Document = {
      id: `DOC${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      name: data.name,
      type: file.type,
      size: file.size,
      category: data.category,
      uploadDate: new Date().toISOString().split('T')[0],
      description: data.description,
      file: file,
    };

    onSubmit(newDocument);
    form.reset();
    setFiles([]);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Documento</FormLabel>
              <FormControl>
                <Input placeholder="Nome do documento" {...field} />
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
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Vacinação">Vacinação</SelectItem>
                  <SelectItem value="Reprodução">Reprodução</SelectItem>
                  <SelectItem value="Financeiro">Financeiro</SelectItem>
                  <SelectItem value="Legal">Legal</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea placeholder="Descrição do documento" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <label className="text-sm font-medium">Arquivo</label>
          <FileUpload
            onFilesChange={setFiles}
            files={files}
            accept={{
              'application/pdf': ['.pdf'],
              'image/*': ['.jpeg', '.jpg', '.png'],
              'application/msword': ['.doc'],
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            }}
            maxSize={10 * 1024 * 1024} // 10MB
            className="mt-2"
          />
        </div>

        {form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}

        <div className="flex space-x-2 pt-4">
          <Button type="submit" className="flex-1">
            Adicionar Documento
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}
