import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { AlertTriangle, Lock, Eye, EyeOff } from "lucide-react";

interface DnsSpoofingPageProps {
  notificationId: string;
  onClose: () => void;
}

export function DnsSpoofingPage({ notificationId, onClose }: DnsSpoofingPageProps) {
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      setLoading(true);
      setRevealed(true);
      await apiRequest('POST', '/api/notification/respond', { 
        notificationId, 
        accepted: true 
      });
    }
  };

  const handleLeave = async () => {
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
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-red-600">DNS Spoofing Detectado!</h2>
          </div>

          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded border border-red-200">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                <strong>O que aconteceu:</strong> Um criminoso redirecionou o DNS para uma página falsa idêntica ao site real.
              </p>

              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                <strong>O perigo:</strong> Você digitou seu email e senha naquela página falsa, e agora o criminoso tem suas credenciais.
              </p>

              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Proteção:</strong> Verifique sempre se o certificado SSL é válido e use Dispositivos Confiáveis para detectar logins estranhos.
              </p>
            </div>

            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded border border-red-200">
              <p className="text-sm text-red-800 dark:text-red-200">
                ✗ Suas credenciais foram capturadas! O criminoso agora pode acessar sua conta.
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
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl max-w-sm w-full border-t-4 border-green-600">
        <div className="bg-gray-100 dark:bg-slate-800 px-4 py-3 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded px-3 py-2 text-sm">
            <Lock className="h-4 w-4 text-green-600" />
            <span className="text-green-600 font-semibold">https://</span>
            <span className="text-gray-900 dark:text-gray-100">GameSecurity.orender.com/login</span>
          </div>
          
        </div>

        
        <div className="p-6 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Sua Conta</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Acesso Seguro</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email ou CPF
              </label>
              <Input
                type="text"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Senha
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit"
              disabled={!email || !password || loading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Entrar
            </Button>
          </form>

          <div className="text-center">
            <button className="text-sm text-blue-600 hover:underline">
              Esqueceu sua senha?
            </button>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
            
            <Button 
              onClick={handleLeave}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              Sair desta Página
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
