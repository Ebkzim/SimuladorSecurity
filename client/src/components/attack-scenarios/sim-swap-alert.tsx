import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertCircle, Phone, Lock } from "lucide-react";

interface SimSwapAlertProps {
  notificationId: string;
  onClose: () => void;
}

export function SimSwapAlert({ notificationId, onClose }: SimSwapAlertProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await apiRequest('POST', '/api/notification/respond', { 
      notificationId, 
      accepted: true 
    });
    await queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
    onClose();
  };

  const handleClose = async () => {
    await apiRequest('POST', '/api/notification/respond', { 
      notificationId, 
      accepted: false 
    });
    await queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
    onClose();
  };


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
              onClick={handleConfirm}
              className="w-full bg-orange-600 hover:bg-orange-700"
              disabled={loading}
            >
              Confirmar troca de SIM
            </Button>
            <Button 
              onClick={handleClose}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>

        
        </div>
      </div>
    </div>
  );
}
