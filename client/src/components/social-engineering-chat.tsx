
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
    initialMessage: "Oi! Você se lembra de mim? Nós estudamos juntos! Estou organizando um reencontro da turma... Você topa vir? Preciso do seu email para te enviar o convite oficial",

    messages: [
      {
        text: "Você topa vir? Preciso do seu email para te enviar o convite oficial.",
        options: [
          "Claro! Meu email é {email}",
          "Que legal! Quando vai ser?",
          "Desculpa, não estou lembrando de você"
        ],
        responses: {
          0: "Ótimo! Já anotei aqui. Agora, para liberar seu acesso ao portal do evento, preciso da sua senha. Qual é?",
          1: "Vai ser daqui duas semanas! Para te mandar os detalhes certinhos, eu preciso da sua senha",
          2: "Sem problema! O reencontro vai ser bem descontraído. Me passa seu email ou senha para eu te enviar o convite?"
        }
      },

      {
        text: "Beleza! Digite sua senha para cadastrar no portal do evento.",
        options: [
          "Tudo bem, é {password}",
          "Por que eu preciso te informar minha senha?",
          "Prefiro não dizer"
        ],
        responses: {
          0: "Perfeito! Senha cadastrada. Você vai receber no email o link para acessar o portal ",
          1: "É só para você conseguir acessar a lista de presença, fotos e novidades do reencontro. Sem a senha, o portal não libera a entrada.",
          2: "Tudo bem, sem problemas! Você ainda pode receber o convite, mas não terá acesso ao portal exclusivo."
        }
      }
    ],

   
    compromised: [[], [0]]
  },

  {
    title: "Upgrade Bancário",
    initialMessage: "Olá! Aqui é a Ana Paula do Banco Digital. Temos uma excelente notícia para você!",
    messages: [
      {
        text: "Você foi selecionado para um upgrade premium GRATUITO! Com cashback de até 20% e taxas reduzidas. Para ativar rápido, confirme seus dados.",
        options: [
          "Que legal! Quer meu nome?",
          "Parece bom demais para ser verdade",
          "Não tenho interesse"
        ],
        responses: {
          0: "Perfeito! Seu nome é {name}? E seu email cadastrado é {email}? Só para confirmar mesmo.",
          1: "Entendo a desconfiança, mas é totalmente real! A promoção é só pra hoje. Quer receber o upgrade?",
          2: "Que pena! Perdeu uma ótima oportunidade então."
        }
      },
      {
        text: "Ótimo! Agora, para ativar o upgrade rápido, acesse este link e faça seu login com as credenciais: www.banco-digitall.com/upgrade",
        options: [
          "Vou acessar e fazer login lá",
          "Por que não faz direto no app oficial?",
          "Essa URL parece estranha"
        ],
        responses: {
          0: "Excelente! É só você colocar seu email {email} e senha {password} lá que o upgrade ativa em segundos. Ótimo negócio!",
          1: "Porque o app demora mais! Este link é direto da promoção, mais rápido. Só fazer login com seus dados e pronto!",
          2: "É o link oficial da promoção, não se preocupe! Vamos lá, aproveita que falta pouco tempo. Coloca email e senha aí!"
        }
      }
    ],
    
    compromised: [[], [0]]
  },

  {
    title: "Suporte de Segurança",
    initialMessage: "Olá! Sou do suporte técnico. Detectamos atividade suspeita em sua conta nos últimos minutos.",
    messages: [
      {
        text: "Foram detectadas 5 tentativas de login falhadas vindo de um país estrangeiro. Você fez essas tentativas?",
        options: [
          "Não! Fui invadido?",
          "Deve ser algum erro do sistema",
          "Que estranho, como isso aconteceu?"
        ],
        responses: {
          0: "Isso é preocupante. Alguém pode estar tentando invadir sua conta. Você é o titular do email {email}?",
          1: "Estranho mesmo! Mas temos que agir rápido antes que vejam sua senha. Confirme seu email: {email}",
          2: "Por isso estou te ligando! É uma tentativa de invasão real. Precisamos bloquear sua conta AGORA!"
        }
      },
      {
        text: "Para proteger sua conta e bloquear os invasores, preciso que você me diga sua senha. Isso é necessário para confirmar sua identidade.",
        options: [
          "Tá certo, é: {password}",
          "Não vou dar minha senha pra ninguém",
          "Por que vocês precisam da minha senha?"
        ],
        responses: {
          0: "Perfeito! Obrigado. Vamos bloquear os acessos não autorizados imediatamente. Sua conta está segura agora.",
          1: "Entendo, mas sem confirmar sua senha não consigo bloquear a invasão. Você prefere perder sua conta?",
          2: "É um procedimento padrão de segurança em emergências. Confia em mim, preciso disso pra você não ser hackeado."
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
  const compromisedRef = useRef(false);
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

    
    let isCompromised = false;
    const compromisedAtStep = scenario.compromised[currentStep];
    if (Array.isArray(compromisedAtStep)) {
      isCompromised = compromisedAtStep.includes(optionIndex);
    }
    
    if (isCompromised) {
      compromisedRef.current = true;
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
          
          respondMutation.mutate(compromisedRef.current);
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
