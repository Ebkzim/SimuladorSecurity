import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, Zap } from "lucide-react";

interface SessionHijackingAlertProps {
  notificationId: string;
  onClose: () => void;
}

export function SessionHijackingAlert({ notificationId, onClose }: SessionHijackingAlertProps) {
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const handleAllow = async () => {
    setLoading(true);
    setRevealed(true);
    await apiRequest('POST', '/api/notification/respond', { 
      notificationId, 
      accepted: true 
    });
    setTimeout(() => onClose(), 300);
  };

  const handleBlock = async () => {
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
            <h2 className="text-xl font-bold text-red-600">Sessão Sequestrada!</h2>
          </div>

          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded border border-red-200">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                <strong>O que aconteceu:</strong> Um criminoso roubou seu cookie/token de sessão e se fez passar por você.
              </p>

              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                <strong>Como conseguiu:</strong> Interceptando sua conexão Wi-Fi ou através de malware.
              </p>

              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Resultado:</strong> O criminoso acessou sua conta como se fosse você, sem precisar da senha.
              </p>
            </div>

            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded border border-red-200">
              <p className="text-sm text-red-800 dark:text-red-200">
                ✗ Você permitiu o acesso. Sua sessão foi comprometida!
              </p>
            </div>
          </div>

          <Button 
            onClick={onClose}
            className="w-full mt-4 bg-red-600 hover:bg-red-700"
          >
            Entendi
          </Button>
        </div>
      </div>
    );
  }

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
            >
              Permitir Este Login
            </Button>
            <Button 
              onClick={handleBlock}
              disabled={loading}
              variant="outline"
              className="w-full text-red-600"
            >
              Bloquear Sessão
            </Button>
          </div>

          
        </div>
      </div>
    </div>
  );
}
