
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Upload, FileImage, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFilesChange: (files: (File | string)[]) => void;
  multiple?: boolean;
  accept?: Record<string, string[]>;
  maxSize?: number;
  files?: (File | string)[];
  className?: string;
  label?: string;
}

export function FileUpload({ 
  onFilesChange, 
  multiple = false, 
  accept = { 'image/*': ['.jpeg', '.jpg', '.png'] },
  maxSize = 5 * 1024 * 1024, // 5MB
  files = [],
  className,
  label = 'Upload de arquivo'
}: FileUploadProps) {
  const [error, setError] = useState<string>('');

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError('');
    console.log('Arquivos selecionados:', acceptedFiles);
    
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError(`Arquivo muito grande. Máximo ${maxSize / 1024 / 1024}MB`);
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Tipo de arquivo não permitido');
      }
      return;
    }

    // Filtrar arquivos existentes que são strings (URLs)
    const existingUrls = files.filter(file => typeof file === 'string') as string[];
    
    if (multiple) {
      // Para múltiplos arquivos, adiciona à lista existente
      onFilesChange([...existingUrls, ...acceptedFiles]);
    } else {
      // Para único arquivo, substitui o que existia
      onFilesChange(acceptedFiles);
    }
    
    console.log('Arquivos após processamento:', [...existingUrls, ...acceptedFiles]);
  }, [onFilesChange, multiple, files, maxSize]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple
  });

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    console.log('Removendo arquivo de índice', index, 'arquivos restantes:', newFiles);
    onFilesChange(newFiles);
  };

  const getFileIcon = (file: File | string) => {
    // If file is a string URL, assume it's an image
    if (typeof file === 'string') {
      return <FileImage className="h-4 w-4" />;
    }
    
    // Otherwise handle as File object
    if (file.type.startsWith('image/')) {
      return <FileImage className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Get file name from either File object or URL string
  const getFileName = (file: File | string): string => {
    if (typeof file === 'string') {
      // Extract filename from URL
      const urlParts = file.split('/');
      return urlParts[urlParts.length - 1];
    }
    return file.name;
  };

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary",
          error && "border-destructive"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">
          {isDragActive
            ? "Solte os arquivos aqui..."
            : `Arraste arquivos aqui ou clique para selecionar`}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {Object.keys(accept).join(', ')} • Máx. {formatFileSize(maxSize)}
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <Card key={index} className="p-3">
              <CardContent className="p-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getFileIcon(file)}
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">
                        {getFileName(file)}
                      </p>
                      {typeof file !== 'string' && (
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      )}
                      {typeof file === 'string' && (
                        <p className="text-xs text-gray-500">
                          Arquivo existente
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {typeof file === 'string' ? (
                  <div className="mt-2">
                    <img
                      src={file}
                      alt="Preview"
                      className="h-20 w-20 object-cover rounded"
                    />
                  </div>
                ) : file.type.startsWith('image/') && (
                  <div className="mt-2">
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Preview"
                      className="h-20 w-20 object-cover rounded"
                      onLoad={() => URL.revokeObjectURL(URL.createObjectURL(file))}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
