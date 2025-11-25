import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertCircle, Zap } from "lucide-react";

interface SessionHijackingAlertProps {
  notificationId: string;
  onClose: () => void;
}

export function SessionHijackingAlert({ notificationId, onClose }: SessionHijackingAlertProps) {
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

  const handleBlock = async () => {
    setLoading(true);
    await apiRequest('POST', '/api/notification/respond', { 
      notificationId, 
      accepted: false 
    });
    await queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
    onClose();
  };


  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-sm w-full overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-purple-500 text-white p-6">
          <div className="flex items-center gap-3">
            <Zap className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold">Alerta</h1>
             
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-2 mt-1">
                <Zap className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">
                  Login na sua conta detectado
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Há 2 segundos • IP: 192.168.1.{Math.floor(Math.random() * 255)}
                </p>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded p-3">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                <strong>Informações do Login:</strong>
              </p>
              <ul className="text-xs text-blue-700 dark:text-blue-300 mt-2 space-y-1">
                <li>• Localização: {['Contagem', 'Nova Lima', 'Belo Horizonte'][Math.floor(Math.random() * 3)]}</li>
                <li>• Navegador: Desconhecido</li>
                <li>• Sistema: Linux</li>
              </ul>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 rounded p-3">
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
               Desconheça este login?
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              Se não foi você, bloqueie imediatamente. Caso contrário, clique em "Permitir" para manter a sessão aberta.
            </p>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <Button 
              onClick={handleAllow}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              Permitir Este Login
            </Button>
            <Button 
              onClick={handleBlock}
              variant="outline"
              className="w-full text-red-600"
              disabled={loading}
            >
              Bloquear Sessão
            </Button>
          </div>

          
        </div>
      </div>
    </div>
  );
}
