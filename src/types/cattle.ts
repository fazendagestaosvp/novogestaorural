
export interface CattleData {
  id: string;
  name: string;
  breed: string;
  age: number;
  weight: number;
  gender: 'Macho' | 'Fêmea';
  status: 'Ativo' | 'Vendido' | 'Tratamento';
  category: 'Bezerro' | 'Novilho' | 'Touro' | 'Vaca' | 'Bezerra' | 'Novilha';
  dateOfBirth?: Date;
  entryDate?: Date;
  observations?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}
