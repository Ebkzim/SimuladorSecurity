import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertCircle, Shield, Lock } from "lucide-react";

interface CredentialStuffingAlertProps {
  notificationId: string;
  onClose: () => void;
}

export function CredentialStuffingAlert({ notificationId, onClose }: CredentialStuffingAlertProps) {
  const [loading, setLoading] = useState(false);

  const handleAllow = async () => {
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
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-sm w-full">
        <div className="bg-gradient-to-r from-red-600 to-red-500 text-white p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="h-8 w-8" />
            <h1 className="text-xl font-bold">Login Suspeito Detectado</h1>
          </div>
          
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 rounded-lg p-4">
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-3">
              Atividade Anormal Detectada
            </p>
            <div className="space-y-2 text-xs text-yellow-700 dark:text-yellow-300">
              <p><strong>Local:</strong> {['Contagem', 'Nova Lima', 'Belo Horizonte'][Math.floor(Math.random() * 4)]}, Brasil</p>
              <p><strong>Hora:</strong> {new Date().toLocaleTimeString('pt-BR')}</p>
              <p><strong>Dispositivo:</strong> {['Windows PC', 'Linux', 'Android'][Math.floor(Math.random() * 3)]}</p>
              <p><strong>Tentativas:</strong> {Math.floor(Math.random() * 50) + 10}+ em 5 minutos</p>
            </div>
          </div>

          <div className="border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
               Possível Credential Stuffing
            </p>
            <p className="text-sm text-red-700 dark:text-red-300">
              Alguém está testando senhas automaticamente contra sua conta.
            </p>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <Button 
              onClick={handleAllow}
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              Desbloquear Agora
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
