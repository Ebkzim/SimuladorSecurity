import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertTriangle, Wifi, Lock } from "lucide-react";

interface MitmAlertProps {
  notificationId: string;
  onClose: () => void;
}

export function MitmAlert({ notificationId, onClose }: MitmAlertProps) {
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
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
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white p-6">
          <div className="flex items-center gap-3">
            <Wifi className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold">Rede Wi-Fi FREE</h1>
              
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 rounded p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-yellow-800 dark:text-yellow-200">
                  Conexão Insegura Detectada
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Esta é uma rede Wi-Fi pública sem criptografia.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                Informações da Rede
              </p>
              <div className="bg-gray-100 dark:bg-slate-800 rounded p-3 space-y-1">
                <p className="text-xs"><strong>SSID:</strong> Wifi_Free_1gb</p>
                <p className="text-xs"><strong>Criptografia:</strong> Nenhuma</p>
                <p className="text-xs"><strong>Força do Sinal:</strong> Excelente</p>
              </div>
            </div>

            
          </div>

          <div className="space-y-3 pt-4 border-t">
            <Button 
              onClick={handleContinue}
              className="w-full bg-orange-600 hover:bg-orange-700"
              disabled={loading}
            >
              Continuar Mesmo Assim
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
