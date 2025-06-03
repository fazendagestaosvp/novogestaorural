
export interface ReproductionData {
  id: string;
  animal: string;
  type: 'Bovino' | 'Equino';
  method: 'IATF' | 'Monta Natural' | 'Repasse';
  startDate: string;
  status: 'Pendente' | 'Prenha' | 'Falhada';
  ultrasounds: number;
  observations?: string;
}
