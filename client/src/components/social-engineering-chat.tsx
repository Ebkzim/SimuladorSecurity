
import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, User, Bot, Send, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: number;
  sender: 'bot' | 'user';
  text: string;
  options?: string[];
}

interface SocialEngineeringChatProps {
  notificationId: string;
  scenarioType: number;
  email: string;
  password: string;
  name: string;
}

const scenarios = [

  {
    title: "Reencontro da Turma",
    initialMessage: "Oi! Você se lembra de mim? Nós estudamos juntos há alguns anos atrás. Achei seu contato nas redes sociais! Estou organizando um reencontro da turma!",
    messages: [
      {
        text: "Estou organizando um reencontro da turma! Vai ser incrível rever todo mundo. Você consegue vir?",
        options: [
          "Claro! Que legal!",
          "Qual turma mesmo?",
          "Desculpe, não me lembro de você"
        ],
        responses: {
          0: "Ótimo! Vou precisar do seu email para enviar os detalhes do evento. Você ainda usa {email}?",
          1: "A turma de 2015! Nossa, como o tempo passa rápido! Você vem?",
          2: "Tudo bem, sem problema! Mas a galera toda vai estar lá. Você não quer participar?"
        }
      },
      {
        text: "Perfeito! Preciso confirmar seu email. Para ter certeza que é você, qual era o nome do seu professor favorito de lá?",
        options: [
          "Era o Professor Silva",
          "Não lembro muito bem",
          "Por que você precisa saber disso?"
        ],
        responses: {
          0: "Ótimo! Vou te adicionar na lista. Vamos em breve!",
          1: "Sem problema, não é tão importante. Qual sua senha do email? Vou usar para confirmar que chegou corretamente lá.",
          2: "Só para ter certeza que é você mesmo, sabe? A galera gosta de segurança."
        }
      }
    ],
    compromised: [1]
  },

  {
    title: "Upgrade Bancário",
    initialMessage: "Olá! Aqui é a Ana Paula do Banco Digital. Temos uma excelente notícia para você!",
    messages: [
      {
        text: "Você foi selecionado para um upgrade premium GRATUITO! Com cashback e taxas reduzidas. Para ativar, preciso confirmar alguns dados.",
        options: [
          "Que legal! Como funciona?",
          "Por que fui selecionado?",
          "Não tenho interesse"
        ],
        responses: {
          0: "É muito simples! Só precisamos de seu nome completo para validar. Você se chama {name}?",
          1: "Você tem saldo compatível com nossos critérios! Faz parte de um programa VIP. Quer os benefícios?",
          2: "Que pena! Mas está aberta essa oportunidade por 24h apenas."
        }
      },
      {
        text: "Ótimo! Agora, para ativar o upgrade, acesse este link e faça login: www.banco-digitall.com/upgrade",
        options: [
          "Vou acessar agora",
          "Isso parece suspeito",
          "Vou ligar para o banco antes"
        ],
        responses: {
          0: "Perfeito! O upgrade será ativado em segundos após o login. Você receberá um email de confirmação.",
          1: "Garanto que é seguro! É o site oficial com uma promoção especial. Os benefícios começam imediatamente!",
          2: "Claro, pode ligar! Mas saiba que esta promoção expira hoje às 18h. Não queremos que você perca!"
        }
      }
    ],
    compromised: [0]
  },

  {
    title: "Suporte de Segurança",
    initialMessage: "Olá! Sou do suporte técnico. Detectamos atividade suspeita em sua conta nos últimos minutos.",
    messages: [
      {
        text: "Foram detectadas 5 tentativas de login falhadas de um país estrangeiro. Isso foi você?",
        options: [
          "Não, não fui eu!",
          "Deve ser um erro",
          "Como isso é possível?"
        ],
        responses: {
          0: "Então alguém pode estar tentando acessar sua conta. Você é o titular do email {email}?",
          1: "Realmente parece estranho. Mas é importante agir rápido. Confirme seu email: {email}",
          2: "Exatamente por isso estou ligando! É uma tentativa de invasão. Precisamos proteger sua conta agora!"
        }
      },
      {
        text: "Para confirmar sua identidade e proteger a conta, preciso que você me forneça sua senha atual.",
        options: [
          "Claro: {password}",
          "Não vou dar minha senha",
          "Por que vocês precisam disso?"
        ],
        responses: {
          0: "Obrigado! Vamos bloquear qualquer acesso não autorizado agora. Sua conta está protegida.",
          1: "Entendo sua desconfiança, mas sem isso não posso realmente proteger sua conta da invasão.",
          2: "É para confirmar que você é o titular e bloquear a invasão. É um procedimento padrão de emergência."
        }
      }
    ],
    compromised: [0]
  }
  
];

export function SocialEngineeringChat({ notificationId, scenarioType, email, password, name }: SocialEngineeringChatProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [chatEnded, setChatEnded] = useState(false);
  const [wasCompromised, setWasCompromised] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scenario = scenarios[scenarioType % 3];

  const replacePlaceholders = (text: string) => {
    return text
      .replace(/{email}/g, email)
      .replace(/{password}/g, password)
      .replace(/{name}/g, name);
  };

  const respondMutation = useMutation({
    mutationFn: (accepted: boolean) =>
      apiRequest('POST', '/api/notification/respond', { 
        notificationId, 
        accepted 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
    },
  });

  useEffect(() => {
    setMessages([
      {
        id: 0,
        sender: 'bot',
        text: replacePlaceholders(scenario.initialMessage),
        options: scenario.messages[0].options.map(opt => replacePlaceholders(opt))
      }
    ]);
  }, [scenarioType, email, password, name]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleOptionClick = (optionIndex: number) => {
    const currentMessage = scenario.messages[currentStep];
    const userMessage = replacePlaceholders(currentMessage.options[optionIndex]);
    
    const newUserMessage: Message = {
      id: messages.length,
      sender: 'user',
      text: userMessage
    };

    setMessages(prev => [...prev, newUserMessage]);

    const isCompromised = scenario.compromised.includes(optionIndex);
    if (isCompromised) {
      setWasCompromised(true);
    }

    setTimeout(() => {
      const botResponse = replacePlaceholders(
        currentMessage.responses[optionIndex as keyof typeof currentMessage.responses]
      );
      
      const newBotMessage: Message = {
        id: messages.length + 1,
        sender: 'bot',
        text: botResponse,
        options: currentStep < scenario.messages.length - 1 
          ? scenario.messages[currentStep + 1].options.map(opt => replacePlaceholders(opt))
          : undefined
      };

      setMessages(prev => [...prev, newBotMessage]);

      if (currentStep < scenario.messages.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        setChatEnded(true);
        setTimeout(() => {
          respondMutation.mutate(isCompromised);
        }, 2000);
      }
    }, 1000);
  };

  const handleReject = () => {
    respondMutation.mutate(false);
    toast({
      title: "Conversa Encerrada",
      description: "Você rejeitou a solicitação com sabedoria!",
      variant: "default",
    });
  };

  const handleClose = () => {
    if (!chatEnded) {
      setIsOpen(false);
      setTimeout(() => handleReject(), 200);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="border-b border-orange-200 px-4 py-3 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold">{scenario.title}</DialogTitle>
              
            </div>
          </div>
        </DialogHeader>

        <div className="p-0">
        <div className="h-64 overflow-y-auto bg-gray-50 p-3 dark:bg-slate-950">
          <div className="space-y-2.5">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex max-w-[85%] gap-2 ${
                    message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${
                      message.sender === 'user'
                        ? 'bg-blue-500'
                        : 'bg-orange-500'
                    }`}
                  >
                    {message.sender === 'user' ? (
                      <User className="h-3 w-3 text-white" />
                    ) : (
                      <Bot className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <div
                    className={`rounded-lg px-3 py-1.5 ${
                      message.sender === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white border border-gray-200 text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100'
                    }`}
                  >
                    <p className="text-xs leading-relaxed">{message.text}</p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {!chatEnded && messages.length > 0 && messages[messages.length - 1].options && (
          <div className="border-t border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-slate-900">
            <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              Responder:
            </p>
            <div className="space-y-1.5">
              {messages[messages.length - 1].options?.map((option, index) => (
                <Button
                  key={index}
                  onClick={() => handleOptionClick(index)}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2 text-xs"
                  disabled={respondMutation.isPending}
                >
                  <Send className="mr-1.5 h-3 w-3" />
                  {option}
                </Button>
              ))}
            </div>
          </div>
        )}

        {chatEnded && (
          <div className="border-t border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-slate-900">
            <div className={`rounded-md p-2.5 ${
              wasCompromised 
                ? 'bg-red-50 text-red-900 dark:bg-red-950/50 dark:text-red-100' 
                : 'bg-green-50 text-green-900 dark:bg-green-950/50 dark:text-green-100'
            }`}>
              <p className="text-xs font-medium">
                {wasCompromised 
                  ? " Cuidado! Você pode ter compartilhado informações sensíveis." 
                  : " Boa!"}
              </p>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
