
export interface HorseData {
  id: string;
  name: string;
  breed: string;
  age: number;
  color: string;
  gender: 'Macho' | 'Fêmea';
  status: 'Potro' | 'Domado' | 'Em treinamento' | 'Vendido' | 'Morto' | 'Prenha' | 'Saudável';
  dateOfBirth?: Date;
  entryDate?: Date;
  weight?: number;
  observations?: string;
  animalPhotos?: (File | string)[];
  fatherPhoto?: File | string;
  motherPhoto?: File | string;
  registrationCertificate?: File | string;
}
