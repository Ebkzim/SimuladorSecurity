
import type { Express } from "express";
import { createServer, type Server } from "http";
import { getGameState, updateGameState, resetGameState } from "./storage";
import {
  executeAttackSchema,
  updateSecuritySchema,
  configureSecuritySchema,
  createAccountSchema,
  respondToNotificationSchema,
  securityFlowStepSchema,
  attackFlowStepSchema,
  accountCreationStepSchema,
  savePasswordSchema,
  deletePasswordSchema,
  attackTypes,
} from "@shared/schema";
import { randomUUID } from "crypto";

function addActivityLog(gameState: any, actor: 'user' | 'hacker' | 'system', action: string, detail?: string) {
  const newLog = {
    id: randomUUID(),
    timestamp: Date.now(),
    actor,
    action,
    detail,
  };
  
  return {
    ...gameState,
    activityLog: [...(gameState.activityLog || []), newLog],
  };
}

function calculateVulnerability(gameState: any): number {
  const measures = gameState.casualUser.securityMeasures;
  const config = gameState.casualUser.securityConfig || {};
  
  let totalReduction = 0;
  
  if (measures.strongPassword) totalReduction += 10;
  if (measures.twoFactorAuth) totalReduction += 15;
  if (measures.emailVerification) totalReduction += 10;
  if (measures.securityQuestions) totalReduction += 10;
  if (measures.backupEmail) totalReduction += 5;
  if (measures.authenticatorApp) totalReduction += 20;
  if (measures.smsBackup && config.smsBackup?.verified) totalReduction += 12;
  if (measures.trustedDevices && config.trustedDevices?.devices?.length > 0) totalReduction += 15;
  if (measures.loginAlerts && (config.loginAlerts?.emailAlerts || config.loginAlerts?.smsAlerts)) totalReduction += 10;
  if (measures.sessionManagement) totalReduction += 12;
  if (measures.ipWhitelist && config.ipWhitelist?.enabled && config.ipWhitelist?.allowedIPs?.length > 0) totalReduction += 18;
  if (measures.passwordVault && gameState.casualUser.passwordVault?.length >= 3) totalReduction += 8;
  
  const vulnerability = Math.max(0, Math.min(100, 100 - totalReduction));
  return vulnerability;
}

function calculatePasswordStrength(password: string): number {
  let strength = 0;
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  
  if (password.length >= 8) strength += 20;
  if (password.length >= 12) strength += 20;
  if (hasLowercase) strength += 20;
  if (hasUppercase) strength += 20;
  if (hasNumber) strength += 10;
  if (hasSpecial) strength += 10;
  
  const hasAllRequirements = hasLowercase && hasUppercase && hasNumber && hasSpecial;
  if (!hasAllRequirements && strength >= 80) {
    strength = 79; // Limita a 79 se não tiver todos os requisitos
  }
  
  return Math.min(strength, 100);
}

function getAttackSuccessChance(attackId: string, gameState: any): number {
  const measures = gameState.casualUser.securityMeasures;
  const config = gameState.casualUser.securityConfig || {};
  const passwordStrength = calculatePasswordStrength(gameState.casualUser.password || '');
  
  const allMeasuresActive = 
    measures.twoFactorAuth &&
    measures.strongPassword &&
    measures.emailVerification &&
    measures.securityQuestions &&
    measures.backupEmail &&
    measures.authenticatorApp &&
    measures.smsBackup &&
    measures.trustedDevices &&
    measures.loginAlerts &&
    measures.sessionManagement &&
    measures.ipWhitelist &&
    measures.passwordVault;
  
  const allConfigurationsValid = 
    passwordStrength >= 80 && // Senha forte configurada
    config.ipWhitelist?.enabled && // IP Whitelist ativo
    (config.ipWhitelist?.allowedIPs?.length ?? 0) > 0 && // Pelo menos 1 IP na whitelist
    (config.trustedDevices?.devices?.length ?? 0) > 0 && // Pelo menos 1 dispositivo confiável
    (config.loginAlerts?.emailAlerts || config.loginAlerts?.smsAlerts) && // Alertas configurados
    config.smsBackup?.verified && // SMS backup verificado
    (gameState.casualUser.passwordVault?.length ?? 0) >= 3; // Pelo menos 3 senhas no vault
  
  if (allMeasuresActive && allConfigurationsValid) {
    return 0; // 0% de chance = IMPOSSÍVEL!
  }
  
  let baseChance = 70;
  
  switch (attackId) {
    case 'brute_force':
      baseChance = 80;
      if (measures.authenticatorApp) baseChance -= 70;
      if (measures.twoFactorAuth) baseChance -= 60;
      if (measures.strongPassword || passwordStrength >= 80) baseChance -= 40;
      if (measures.ipWhitelist && config.ipWhitelist?.enabled) baseChance -= 20;
      if (measures.sessionManagement) baseChance -= 15;
      break;
      
    case 'phishing':
      baseChance = 70;
      if (measures.authenticatorApp) baseChance -= 40;
      if (measures.twoFactorAuth) baseChance -= 30;
      if (measures.emailVerification) baseChance -= 25;
      if (measures.loginAlerts && config.loginAlerts?.emailAlerts) baseChance -= 20;
      if (measures.trustedDevices && config.trustedDevices?.devices?.length > 0) baseChance -= 15;
      break;
      
    case 'social_engineering':
      baseChance = 65;
      if (measures.twoFactorAuth) baseChance -= 25;
      if (measures.securityQuestions) baseChance -= 20;
      if (measures.loginAlerts && (config.loginAlerts?.emailAlerts || config.loginAlerts?.smsAlerts)) baseChance -= 20;
      break;
      
    case 'keylogger':
      baseChance = 60;
      if (measures.authenticatorApp) baseChance -= 30;
      if (measures.twoFactorAuth) baseChance -= 25;
      if (measures.sessionManagement) baseChance -= 15;
      break;
      
    case 'password_leak':
      baseChance = 75;
      if (measures.authenticatorApp) baseChance -= 50;
      if (measures.twoFactorAuth) baseChance -= 40;
      if (measures.strongPassword) baseChance -= 20;
      if (measures.smsBackup && config.smsBackup?.verified) baseChance -= 15;
      break;
      
    case 'session_hijacking':
      baseChance = 50;
      if (measures.loginAlerts && (config.loginAlerts?.emailAlerts || config.loginAlerts?.smsAlerts)) baseChance -= 25;
      if (measures.sessionManagement) baseChance -= 20;
      if (measures.trustedDevices && config.trustedDevices?.devices?.length > 0) baseChance -= 15;
      if (measures.authenticatorApp) baseChance -= 10;
      break;
      
    case 'man_in_the_middle':
      baseChance = 50;
      if (measures.trustedDevices && config.trustedDevices?.devices?.length > 0) baseChance -= 30;
      if (measures.authenticatorApp) baseChance -= 20;
      if (measures.twoFactorAuth) baseChance -= 10;
      break;
      
    case 'credential_stuffing':
      baseChance = 50;
      if (measures.passwordVault && gameState.casualUser.passwordVault?.length >= 3) baseChance -= 25;
      if (measures.authenticatorApp) baseChance -= 15;
      if (measures.twoFactorAuth) baseChance -= 10;
      if (measures.strongPassword) baseChance -= 5;
      break;
      
    case 'sim_swap':
      baseChance = 50;
      if (measures.authenticatorApp) baseChance -= 40;
      if (measures.twoFactorAuth) baseChance -= 10;
      break;
      
    case 'malware_injection':
      baseChance = 50;
      if (measures.trustedDevices && config.trustedDevices?.devices?.length > 0) baseChance -= 30;
      if (measures.authenticatorApp) baseChance -= 20;
      if (measures.sessionManagement) baseChance -= 15;
      break;
      
    case 'dns_spoofing':
      baseChance = 50;
      if (measures.trustedDevices && config.trustedDevices?.devices?.length > 0) baseChance -= 25;
      if (measures.loginAlerts && (config.loginAlerts?.emailAlerts || config.loginAlerts?.smsAlerts)) baseChance -= 15;
      if (measures.authenticatorApp) baseChance -= 10;
      if (measures.emailVerification) baseChance -= 5;
      break;
      
    case 'zero_day_exploit':
      baseChance = 50;
      if (measures.authenticatorApp) baseChance -= 25;
      if (measures.twoFactorAuth) baseChance -= 20;
      if (measures.ipWhitelist && config.ipWhitelist?.enabled && config.ipWhitelist?.allowedIPs?.length > 0) baseChance -= 10;
      if (measures.sessionManagement) baseChance -= 5;
      break;
      
    default:
      baseChance = 50;
  }
  
  return Math.max(0, Math.min(100, baseChance));
}

function createNotification(attackId: string, gameState: any) {
  const notifications: Record<string, any> = {
    phishing: {
      type: 'phishing',
      title: 'Novo Email Recebido',
      message: 'Você ganhou um prêmio! Clique aqui para resgatar agora. Confirme seus dados para receber.',
      requiresAction: true,
      ctaLabel: 'Saber Mais',
      ctaType: 'phishing_learn_more',
      attackType: 'phishing',
    },
    social_engineering: {
      type: 'social_engineering',
      title: 'Nova Conversa',
      message: 'Você tem uma nova mensagem. Clique para visualizar.',
      requiresAction: true,
      scenarioIndex: gameState.hacker.socialEngineeringScenarioCursor,
      attackType: 'social_engineering',
    },
    brute_force: {
      type: 'security_alert',
      title: 'Alerta de Segurança',
      message: 'Múltiplas tentativas de login detectadas. Seu acesso pode estar em risco.',
      requiresAction: false,
      attackType: 'brute_force',
    },
    keylogger: {
      type: 'suspicious_login',
      title: 'Download Automático',
      message: 'Um programa está tentando se instalar no seu computador. Permitir?',
      requiresAction: true,
      attackType: 'keylogger',
    },
    password_leak: {
      type: 'security_alert',
      title: 'Vazamento de Dados',
      message: 'Sua senha pode ter sido exposta em um vazamento de dados recente. Considere alterá-la.',
      requiresAction: false,
      attackType: 'password_leak',
    },
    sim_swap: {
      type: 'sim_swap',
      title: 'Solicitação de Troca de SIM',
      message: 'Você recebeu uma solicitação de troca de SIM card.',
      requiresAction: true,
      ctaLabel: 'Saber Mais',
      ctaType: 'sim_swap_alert',
      attackType: 'sim_swap',
    },
    malware_injection: {
      type: 'malware',
      title: 'Aviso de Segurança',
      message: 'Um arquivo suspeito foi detectado em seu computador.',
      requiresAction: true,
      ctaLabel: 'Verificar',
      ctaType: 'malware_popup',
      attackType: 'malware_injection',
    },
    dns_spoofing: {
      type: 'dns_spoof',
      title: 'Verificação de Segurança',
      message: 'Sua conta requer verificação de segurança. Faça login novamente.',
      requiresAction: true,
      ctaLabel: 'Verificar Agora',
      ctaType: 'dns_spoofing_page',
      attackType: 'dns_spoofing',
    },
    credential_stuffing: {
      type: 'credential_stuffing',
      title: 'Atividade Suspeita Detectada',
      message: 'Múltiplas tentativas de login anormais foram identificadas.',
      requiresAction: true,
      ctaLabel: 'Revisar',
      ctaType: 'credential_stuffing_alert',
      attackType: 'credential_stuffing',
    },
    session_hijacking: {
      type: 'session_hijacking',
      title: 'Login Detectado',
      message: 'Um novo login foi detectado em sua conta.',
      requiresAction: true,
      ctaLabel: 'Revisar',
      ctaType: 'session_hijacking_alert',
      attackType: 'session_hijacking',
    },
    man_in_the_middle: {
      type: 'mitm',
      title: 'Rede Insegura Detectada',
      message: 'Você está conectado a uma rede Wi-Fi pública sem criptografia.',
      requiresAction: true,
      ctaLabel: 'Continuar',
      ctaType: 'mitm_alert',
      attackType: 'man_in_the_middle',
    },
  };
  
  const template = notifications[attackId] || notifications.phishing;
  return {
    id: randomUUID(),
    ...template,
    isActive: true,
    userFellFor: undefined,
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/game-state", async (req, res) => {
    try {
      const gameState = getGameState(req.session);
      res.json(gameState);
    } catch (error) {
      res.status(500).json({ error: "Failed to get game state" });
    }
  });

  app.post("/api/game/start", async (req, res) => {
    try {
      const currentState = getGameState(req.session);
      const currentRoundId = parseInt(currentState.roundId || '0');
      const newRoundId = (currentRoundId + 1).toString();
      
      resetGameState(req.session);
      const gameState = updateGameState(req.session, {
        gameStarted: true,
        tutorialCompleted: true,
        roundId: newRoundId,
      });
      res.json(gameState);
    } catch (error) {
      res.status(500).json({ error: "Failed to start game" });
    }
  });

  app.post("/api/tutorial/complete", async (req, res) => {
    try {
      const gameState = updateGameState(req.session, {
        tutorialCompleted: true,
      });
      res.json(gameState);
    } catch (error) {
      res.status(500).json({ error: "Failed to complete tutorial" });
    }
  });

  app.post("/api/account/create", async (req, res) => {
    try {
      const result = createAccountSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid request data" });
      }

      const { name, email, password } = result.data;
      const passwordStrength = calculatePasswordStrength(password);
      
      const currentState = getGameState(req.session);
      let gameState = updateGameState(req.session, {
        casualUser: {
          ...currentState.casualUser,
          name,
          email,
          password,
          accountCreated: true,
          securityMeasures: {
            ...currentState.casualUser.securityMeasures,
            strongPassword: passwordStrength >= 80,
          },
        },
      });
      
      gameState = addActivityLog(gameState, 'user', 'Conta criada', `Nome: ${name}, Email: ${email}, Força da senha: ${passwordStrength}%`);
      
      if (passwordStrength < 80) {
        const weakPasswordNotification = {
          id: randomUUID(),
          type: 'weak_password_warning' as const,
          title: 'Atenção: Senha Fraca Detectada',
          message: `Sua conta foi criada, mas sua senha está vulnerável a ataques. Força atual: ${passwordStrength}%. Recomendamos melhorar sua senha nas configurações.`,
          requiresAction: false,
          isActive: true,
          passwordStrength,
        };
        
        gameState = {
          ...gameState,
          notifications: [...gameState.notifications, weakPasswordNotification],
        };
      }
      
      const updatedState = updateGameState(req.session, {
        ...gameState,
        vulnerabilityScore: calculateVulnerability(gameState),
      });
      
      res.json(updatedState);
    } catch (error) {
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  app.post("/api/security/update", async (req, res) => {
    try {
      const result = updateSecuritySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid request data" });
      }

      const { measure, enabled } = result.data;
      const currentState = getGameState(req.session);
      
      let gameState = updateGameState(req.session, {
        casualUser: {
          ...currentState.casualUser,
          securityMeasures: {
            ...currentState.casualUser.securityMeasures,
            [measure]: enabled,
          },
        },
      });
      
      const measureNames: Record<string, string> = {
        twoFactorAuth: 'Autenticação de Dois Fatores',
        strongPassword: 'Senha Forte',
        emailVerification: 'Verificação de Email',
        securityQuestions: 'Perguntas de Segurança',
        backupEmail: 'Email de Recuperação',
        authenticatorApp: 'Aplicativo Autenticador',
        smsBackup: 'Backup por SMS',
        trustedDevices: 'Dispositivos Confiáveis',
        loginAlerts: 'Alertas de Login',
        sessionManagement: 'Gerenciamento de Sessão',
        ipWhitelist: 'Lista de IPs Permitidos',
        passwordVault: 'Cofre de Senhas',
      };
      
      gameState = addActivityLog(
        gameState, 
        'user', 
        enabled ? 'Proteção ativada' : 'Proteção desativada', 
        measureNames[measure] || measure
      );
      
      const updatedState = updateGameState(req.session, {
        ...gameState,
        vulnerabilityScore: calculateVulnerability(gameState),
      });
      
      res.json(updatedState);
    } catch (error) {
      res.status(500).json({ error: "Failed to update security" });
    }
  });

  app.post("/api/security/strong-password", async (req, res) => {
    try {
      const { password, strength: clientStrength } = req.body;
      
      if (!password || typeof password !== 'string') {
        return res.status(400).json({ error: "Password is required" });
      }

      const currentState = getGameState(req.session);
      
      const strength = calculatePasswordStrength(password);
      
      const updatedUser = {
        ...currentState.casualUser,
        password,
        securityMeasures: {
          ...currentState.casualUser.securityMeasures,
          strongPassword: strength >= 80, // Ativa se força >= 80% (todos os requisitos)
        },
        securityConfig: {
          ...currentState.casualUser.securityConfig,
          strongPassword: { password, strength },
        },
      };

      const gameState = updateGameState(req.session, {
        casualUser: updatedUser,
      });
      
      const updatedState = updateGameState(req.session, {
        vulnerabilityScore: calculateVulnerability(gameState),
      });
      
      res.json(updatedState);
    } catch (error) {
      res.status(500).json({ error: "Failed to configure strong password" });
    }
  });

  app.post("/api/security/security-question", async (req, res) => {
    try {
      const { question, answer } = req.body;
      
      if (!question || !answer) {
        return res.status(400).json({ error: "Question and answer are required" });
      }

      const currentState = getGameState(req.session);
      
      const updatedUser = {
        ...currentState.casualUser,
        securityMeasures: {
          ...currentState.casualUser.securityMeasures,
          securityQuestions: true,
        },
        securityConfig: {
          ...currentState.casualUser.securityConfig,
          securityQuestion: { question, answer },
        },
      };

      const gameState = updateGameState(req.session, {
        casualUser: updatedUser,
      });
      
      const updatedState = updateGameState(req.session, {
        vulnerabilityScore: calculateVulnerability(gameState),
      });
      
      res.json(updatedState);
    } catch (error) {
      res.status(500).json({ error: "Failed to configure security question" });
    }
  });

  app.post("/api/security/two-factor", async (req, res) => {
    try {
      const currentState = getGameState(req.session);
      
      const existingNotification = currentState.notifications.find(
        n => n.isActive && n.requiresAction && n.ctaType === 'confirm_2fa'
      );
      
      if (existingNotification) {
        return res.json(currentState);
      }
      
      const notification = {
        id: randomUUID(),
        type: '2fa_confirm' as const,
        title: 'Ativar Autenticação de Dois Fatores',
        message: 'Você está prestes a ativar a Autenticação de Dois Fatores (2FA). Esta medida adicionará uma camada extra de segurança à sua conta, exigindo um código de verificação além da sua senha. Clique em Confirmar para ativar.',
        isActive: true,
        requiresAction: true,
        userFellFor: undefined,
        ctaLabel: 'Confirmar',
        ctaType: 'confirm_2fa' as const,
      };

      const updatedState = updateGameState(req.session, {
        notifications: [...currentState.notifications, notification],
      });
      
      res.json(updatedState);
    } catch (error) {
      res.status(500).json({ error: "Failed to configure two factor auth" });
    }
  });

  app.post("/api/security/email-verification", async (req, res) => {
    try {
      const currentState = getGameState(req.session);
      
      const existingNotification = currentState.notifications.find(
        n => n.isActive && n.requiresAction && n.ctaType === 'confirm_email_verification'
      );
      
      if (existingNotification) {
        return res.json(currentState);
      }
      
      const notification = {
        id: randomUUID(),
        type: 'email_verify_confirm' as const,
        title: 'Ativar Verificação de Email',
        message: `Enviamos um código de verificação para ${currentState.casualUser.email || 'seu email'}. Confirme para verificar sua identidade e aumentar a segurança da conta.`,
        isActive: true,
        requiresAction: true,
        userFellFor: undefined,
        ctaLabel: 'Confirmar',
        ctaType: 'confirm_email_verification' as const,
      };

      const updatedState = updateGameState(req.session, {
        notifications: [...currentState.notifications, notification],
      });
      
      res.json(updatedState);
    } catch (error) {
      res.status(500).json({ error: "Failed to configure email verification" });
    }
  });

  app.post("/api/security/recovery-email", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: "Email is required" });
      }

      const currentState = getGameState(req.session);
      
      const notification = {
        id: randomUUID(),
        type: 'email_verify_confirm' as const,
        title: 'Confirmar Email de Recuperação',
        message: `Enviamos um código de verificação para ${email}. Clique em Confirmar para ativar o email de recuperação e aumentar sua segurança.`,
        isActive: true,
        requiresAction: true,
        userFellFor: undefined,
        ctaLabel: 'Confirmar',
        ctaType: 'confirm_email' as const,
      };
      
      const updatedUser = {
        ...currentState.casualUser,
        securityConfig: {
          ...currentState.casualUser.securityConfig,
          recoveryEmail: { email, verified: false }, // Aguardando confirmação
        },
      };

      const updatedState = updateGameState(req.session, {
        casualUser: updatedUser,
        notifications: [...currentState.notifications, notification],
      });
      
      res.json(updatedState);
    } catch (error) {
      res.status(500).json({ error: "Failed to configure recovery email" });
    }
  });

  app.post("/api/security/configure", async (req, res) => {
    try {
      const result = configureSecuritySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid request data", details: result.error });
      }

      const { measure, config } = result.data;
      const currentState = getGameState(req.session);
      
      const currentConfig = currentState.casualUser.securityConfig?.[measure];
      let mergedConfig: any = { ...config };
      
      if (measure === 'trustedDevices' && currentConfig && 'devices' in currentConfig && 'devices' in config) {
        const existingDevices = currentConfig.devices || [];
        const newDevices = config.devices || [];
        const existingIds = new Set(existingDevices.map((d: any) => d.id));
        const uniqueNewDevices = newDevices.filter((d: any) => !existingIds.has(d.id));
        
        mergedConfig = {
          devices: [...existingDevices, ...uniqueNewDevices],
        };
      } else if (measure === 'ipWhitelist' && currentConfig && 'allowedIPs' in currentConfig && 'allowedIPs' in config) {
        const existingIPs = currentConfig.allowedIPs || [];
        const newIPs = config.allowedIPs || [];
        const ipSet = new Set([...existingIPs, ...newIPs]);
        const uniqueIPs = Array.from(ipSet);
        
        mergedConfig = {
          enabled: config.enabled,
          allowedIPs: uniqueIPs,
        };
      }
      
      let isEnabled = true;
      
      if (measure === 'ipWhitelist' && 'enabled' in config) {
        isEnabled = config.enabled;
      } else if (measure === 'loginAlerts' && 'emailAlerts' in config) {
        isEnabled = config.emailAlerts || config.smsAlerts || config.newLocationAlerts;
      }
      
      const gameState = updateGameState(req.session, {
        casualUser: {
          ...currentState.casualUser,
          securityMeasures: {
            ...currentState.casualUser.securityMeasures,
            [measure]: isEnabled,
          },
          securityConfig: {
            ...currentState.casualUser.securityConfig,
            [measure]: mergedConfig,
          },
        },
      });
      
      const updatedState = updateGameState(req.session, {
        vulnerabilityScore: calculateVulnerability(gameState),
      });
      
      res.json(updatedState);
    } catch (error) {
      res.status(500).json({ error: "Failed to configure security" });
    }
  });

  app.post("/api/attack/execute", async (req, res) => {
    try {
      const result = executeAttackSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid request data" });
      }

      const { attackId } = result.data;
      const attack = attackTypes.find((a) => a.id === attackId);
      if (!attack) {
        return res.status(404).json({ error: "Attack not found" });
      }

      const currentState = getGameState(req.session);
      
      if (currentState.hacker.cooldowns[attackId] && 
          currentState.hacker.cooldowns[attackId] > Date.now()) {
        return res.status(400).json({ error: "Attack on cooldown" });
      }

      const successChance = getAttackSuccessChance(attackId, currentState);
      const isSuccessful = Math.random() * 100 < successChance;
      
      const notification = createNotification(attackId, currentState);
      
      const newCooldowns = { ...currentState.hacker.cooldowns };
      newCooldowns[attackId] = Date.now() + attack.cooldown;
      
      const newScenarioCursor = attackId === 'social_engineering'
        ? (currentState.hacker.socialEngineeringScenarioCursor + 1) % 3
        : currentState.hacker.socialEngineeringScenarioCursor;
      
      let gameState = updateGameState(req.session, {
        hacker: {
          ...currentState.hacker,
          attacksAttempted: currentState.hacker.attacksAttempted + 1,
          attacksSuccessful: isSuccessful 
            ? currentState.hacker.attacksSuccessful + 1 
            : currentState.hacker.attacksSuccessful,
          cooldowns: newCooldowns,
          socialEngineeringScenarioCursor: newScenarioCursor,
        },
        notifications: [...currentState.notifications, notification],
        casualUser: {
          ...currentState.casualUser,
          accountCompromised: isSuccessful || currentState.casualUser.accountCompromised,
        },
      });
      
      gameState = addActivityLog(
        gameState,
        'hacker',
        `Ataque executado: ${attack.name}`,
        `${isSuccessful ? 'Sucesso!' : 'Falhou.'} Chance de sucesso: ${Math.round(successChance)}%`
      );
      
      const finalState = updateGameState(req.session, gameState);
      
      res.json(finalState);
    } catch (error) {
      res.status(500).json({ error: "Failed to execute attack" });
    }
  });

  app.post("/api/notification/delete", async (req, res) => {
    try {
      const { notificationId } = req.body;
      if (!notificationId) {
        return res.status(400).json({ error: "Notification ID is required" });
      }

      const currentState = getGameState(req.session);
      const updatedNotifications = currentState.notifications.filter(
        (n) => n.id !== notificationId
      );

      const gameState = updateGameState(req.session, {
        notifications: updatedNotifications,
      });

      res.json(gameState);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  app.post("/api/notification/respond", async (req, res) => {
    try {
      const result = respondToNotificationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid request data" });
      }

      const { notificationId, accepted } = result.data;
      const currentState = getGameState(req.session);
      
      const notification = currentState.notifications.find((n) => n.id === notificationId);
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      const updatedNotifications = currentState.notifications.map((n) =>
        n.id === notificationId
          ? { ...n, isActive: false, userFellFor: accepted }
          : n
      );
      
      let accountCompromised = currentState.casualUser.accountCompromised;
      let updatedUser = currentState.casualUser;
      let attacksSuccessful = currentState.hacker.attacksSuccessful;
      
      const ATTACK_SCENARIOS = [
        'phishing',
        'sim_swap',
        'dns_spoofing',
        'malware_injection',
        'credential_stuffing',
        'session_hijacking',
        'man_in_the_middle',
      ];
      
      if (accepted && notification.type === 'phishing') {
        accountCompromised = true;
        attacksSuccessful += 1;
      } else if (accepted && notification.type === 'social_engineering') {
        accountCompromised = true;
      } else if (accepted && notification.type === 'suspicious_login') {
        accountCompromised = true;
      }
      
      if (accepted && ATTACK_SCENARIOS.includes(notification.type)) {
        if (notification.type === 'phishing') {
        } else {
          accountCompromised = true;
          attacksSuccessful += 1;
        }
      }
      
      if (accepted && notification.ctaType === 'confirm_email') {
        const recoveryEmail = currentState.casualUser.securityConfig?.recoveryEmail;
        if (recoveryEmail) {
          updatedUser = {
            ...currentState.casualUser,
            accountCompromised,
            securityMeasures: {
              ...currentState.casualUser.securityMeasures,
              backupEmail: true,
            },
            securityConfig: {
              ...currentState.casualUser.securityConfig,
              recoveryEmail: {
                ...recoveryEmail,
                verified: true,
              },
            },
          };
        }
      } else if (accepted && notification.ctaType === 'confirm_2fa') {
        updatedUser = {
          ...currentState.casualUser,
          accountCompromised,
          securityMeasures: {
            ...currentState.casualUser.securityMeasures,
            twoFactorAuth: true,
          },
        };
      } else if (accepted && notification.ctaType === 'confirm_email_verification') {
        updatedUser = {
          ...currentState.casualUser,
          accountCompromised,
          securityMeasures: {
            ...currentState.casualUser.securityMeasures,
            emailVerification: true,
          },
        };
      } else {
        updatedUser = {
          ...currentState.casualUser,
          accountCompromised,
        };
      }
      
      const tempState = {
        ...currentState,
        casualUser: updatedUser,
      };
      
      const newVulnerability = calculateVulnerability(tempState);
      
      const gameState = updateGameState(req.session, {
        notifications: updatedNotifications,
        casualUser: updatedUser,
        vulnerabilityScore: newVulnerability,
        hacker: {
          ...currentState.hacker,
          attacksSuccessful,
        },
      });
      
      res.json(gameState);
    } catch (error) {
      res.status(500).json({ error: "Failed to respond to notification" });
    }
  });

  app.post("/api/account/step", async (req, res) => {
    try {
      const result = accountCreationStepSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid request data" });
      }

      const { step, data } = result.data;
      const currentState = getGameState(req.session);
      
      const gameState = updateGameState(req.session, {
        casualUser: {
          ...currentState.casualUser,
          accountCreationStep: step,
          ...(data || {}),
        },
      });
      
      res.json(gameState);
    } catch (error) {
      res.status(500).json({ error: "Failed to update account step" });
    }
  });

  app.post("/api/security/flow", async (req, res) => {
    try {
      const result = securityFlowStepSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid request data" });
      }

      const { flowType, step, data } = result.data;
      const currentState = getGameState(req.session);
      
      const updatedFlows = {
        ...currentState.casualUser.securitySetupFlows,
        [flowType]: {
          ...(currentState.casualUser.securitySetupFlows[flowType] || {}),
          step,
          ...(data || {}),
        },
      };
      
      const gameState = updateGameState(req.session, {
        casualUser: {
          ...currentState.casualUser,
          securitySetupFlows: updatedFlows,
        },
      });
      
      res.json(gameState);
    } catch (error) {
      res.status(500).json({ error: "Failed to update security flow" });
    }
  });

  app.post("/api/attack/step", async (req, res) => {
    try {
      const result = attackFlowStepSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid request data" });
      }

      const { attackId, step, data } = result.data;
      const currentState = getGameState(req.session);
      
      const updatedFlows = {
        ...currentState.hacker.attackFlows,
        [attackId]: {
          ...(currentState.hacker.attackFlows[attackId] || {}),
          step,
          progress: 0,
          ...(data || {}),
        },
      };
      
      const gameState = updateGameState(req.session, {
        hacker: {
          ...currentState.hacker,
          attackFlows: updatedFlows,
        },
      });
      
      res.json(gameState);
    } catch (error) {
      res.status(500).json({ error: "Failed to update attack step" });
    }
  });

  app.post("/api/passwords/save", async (req, res) => {
    try {
      const result = savePasswordSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid request data" });
      }

      const currentState = getGameState(req.session);
      const newPassword = {
        id: randomUUID(),
        ...result.data,
        createdAt: Date.now(),
      };

      const newVault = [...currentState.casualUser.passwordVault, newPassword];
      const shouldActivateVault = newVault.length >= 3 && !currentState.casualUser.securityMeasures.passwordVault;

      const activityLog = [
        ...currentState.activityLog,
        {
          id: randomUUID(),
          timestamp: Date.now(),
          actor: 'user' as const,
          action: 'Senha salva no cofre',
          detail: `"${result.data.title}" adicionada ao cofre de senhas`,
        },
      ];

      if (shouldActivateVault) {
        activityLog.push({
          id: randomUUID(),
          timestamp: Date.now(),
          actor: 'system' as const,
          action: 'Cofre de Senhas ativado',
          detail: '3 ou mais senhas armazenadas - bônus de segurança aplicado',
        });
      }

      const gameState = updateGameState(req.session, {
        casualUser: {
          ...currentState.casualUser,
          passwordVault: newVault,
          securityMeasures: {
            ...currentState.casualUser.securityMeasures,
            passwordVault: shouldActivateVault || currentState.casualUser.securityMeasures.passwordVault,
          },
        },
        activityLog,
      });

      res.json(gameState);
    } catch (error) {
      res.status(500).json({ error: "Failed to save password" });
    }
  });

  app.post("/api/passwords/delete", async (req, res) => {
    try {
      const result = deletePasswordSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid request data" });
      }

      const { id } = result.data;
      const currentState = getGameState(req.session);
      const deletedPassword = currentState.casualUser.passwordVault.find(p => p.id === id);
      const newVault = currentState.casualUser.passwordVault.filter(p => p.id !== id);
      const shouldDeactivateVault = newVault.length < 3 && currentState.casualUser.securityMeasures.passwordVault;

      const activityLog = [
        ...currentState.activityLog,
        {
          id: randomUUID(),
          timestamp: Date.now(),
          actor: 'user' as const,
          action: 'Senha removida do cofre',
          detail: deletedPassword ? `"${deletedPassword.title}" removida` : 'Senha removida',
        },
      ];

      if (shouldDeactivateVault) {
        activityLog.push({
          id: randomUUID(),
          timestamp: Date.now(),
          actor: 'system' as const,
          action: 'Cofre de Senhas desativado',
          detail: 'Menos de 3 senhas - bônus de segurança removido',
        });
      }

      const gameState = updateGameState(req.session, {
        casualUser: {
          ...currentState.casualUser,
          passwordVault: newVault,
          securityMeasures: {
            ...currentState.casualUser.securityMeasures,
            passwordVault: !shouldDeactivateVault && currentState.casualUser.securityMeasures.passwordVault,
          },
        },
        activityLog,
      });

      res.json(gameState);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete password" });
    }
  });

  app.post("/api/passwords/generate", async (req, res) => {
    try {
      const { length = 16, includeSymbols = true, includeNumbers = true } = req.body;
      
      const lowercase = 'abcdefghijklmnopqrstuvwxyz';
      const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const numbers = '0123456789';
      const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      
      let chars = lowercase + uppercase;
      if (includeNumbers) chars += numbers;
      if (includeSymbols) chars += symbols;
      
      let password = '';
      for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      res.json({ password });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate password" });
    }
  });

  app.post("/api/game/reset", async (req, res) => {
    try {
      const gameState = resetGameState(req.session);
      res.json(gameState);
    } catch (error) {
      res.status(500).json({ error: "Failed to reset game" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
