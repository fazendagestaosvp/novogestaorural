
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  type: 'Vacinação' | 'Consulta' | 'Reprodução' | 'Manejo' | 'Outro';
  animal?: string;
  reminder: boolean;
  location?: string;
}
