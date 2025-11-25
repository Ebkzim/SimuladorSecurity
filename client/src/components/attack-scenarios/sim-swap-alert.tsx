import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, Phone, Lock } from "lucide-react";

interface SimSwapAlertProps {
  notificationId: string;
  onClose: () => void;
}

export function SimSwapAlert({ notificationId, onClose }: SimSwapAlertProps) {
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await apiRequest('POST', '/api/notification/respond', { 
      notificationId, 
      accepted: true 
    });
    setTimeout(() => onClose(), 300);
  };

  const handleDeny = async () => {
    setLoading(true);
    await apiRequest('POST', '/api/notification/respond', { 
      notificationId, 
      accepted: false 
    });
    setTimeout(() => onClose(), 300);
  };

  if (revealed) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-md w-full border-2 border-red-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-red-600">SIM Card Swap Detectado!</h2>
          </div>

          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded border border-red-200">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                <strong>O que aconteceu:</strong> Um criminoso se passou por você na sua operadora telefônica e solicitou a transferência do seu número para um novo SIM card.
              </p>

              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                <strong>Por que é perigoso:</strong> Agora o criminoso recebe seus SMS e códigos de verificação 2FA, permitindo acessar qualquer conta protegida apenas por SMS.
              </p>

              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Defesa recomendada:</strong> Use Autenticador em vez de SMS, e Autenticação 2FA baseada em app, não em SMS.
              </p>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                ✓ Você bloqueou este ataque! O criminoso não conseguiu acessar suas contas.
              </p>
            </div>
          </div>

          <Button 
            onClick={onClose}
            className="w-full mt-4"
          >
            Entendi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-sm w-full border-l-4 border-orange-500">
        
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white p-4">
          <div className="flex items-center gap-2">
            <Phone className="h-6 w-6" />
            <div>
              <p className="font-bold">Anatel</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 rounded p-4">
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
               Aviso Importante
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Uma solicitação de troca de SIM foi recebida há alguns minutos. Se não foi você, ative o protetor de conta agora.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm">
              <strong>Número:</strong> {"+55 (31) 98***-43**"}
            </p>
            <p className="text-sm">
              <strong>Solicitante:</strong> {"Desconhecido"}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Horário:</strong> {new Date().toLocaleTimeString('pt-BR')}
            </p>
          </div>

          <div className="pt-4 border-t space-y-3">
            <Button 
              onClick={() => setRevealed(true)}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              Confirmar troca de SIM
            </Button>
            <Button 
              onClick={handleDeny}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              Não foi eu
            </Button>
          </div>

        
        </div>
      </div>
    </div>
  );
}
