
// Interface para representar como os dados são exibidos na interface
export interface HealthRecord {
  id: string;
  animal: string;
  type: 'Vacinação' | 'Exame' | 'Tratamento' | 'Consulta';
  procedure: string;
  date: string;
  veterinarian: string;
  status: 'Concluído' | 'Agendado' | 'Em andamento';
  observations?: string;
  cost?: number;
}

// Interface para representar como os dados são armazenados no Supabase
export interface HealthRecordDB {
  id: string;
  animal_id: string;
  animal_type: string;
  type: 'Vacinação' | 'Exame' | 'Tratamento' | 'Consulta';
  procedure: string;
  date: string;
  veterinarian: string;
  status: 'Concluído' | 'Agendado' | 'Em andamento';
  observations?: string;
  cost?: number;
  created_at?: string;
  updated_at?: string;
}
