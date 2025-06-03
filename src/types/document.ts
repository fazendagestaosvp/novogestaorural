
export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  category: 'Vacinação' | 'Reprodução' | 'Financeiro' | 'Legal' | 'Outro';
  uploadDate: string;
  description?: string;
  file: File;
}
