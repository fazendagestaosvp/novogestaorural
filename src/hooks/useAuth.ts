// Re-exportando o hook useAuth do AuthProvider
import { useAuth } from '@/components/auth/AuthProvider';

// Exportando como default e named export para maior flexibilidade
export { useAuth };
export default useAuth;
