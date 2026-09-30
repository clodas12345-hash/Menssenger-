import { Contact, MessageTemplate, ScheduledCampaign, DispatchLogItem, ContactGroup, AppSettings, ProjectArchive } from '../types';
import { USER_SAVED_CONTACTS } from '../data/userContacts';
import { detectGenderFromName, isGenericOrInvalidName } from './gender';
import { processContactName } from './contactProcessor';

const STORAGE_KEYS = {
  CONTACTS: 'zap_contacts_v1',
  TEMPLATES: 'zap_templates_v1',
  CAMPAIGNS: 'zap_campaigns_v1',
  LOGS: 'zap_dispatch_logs_v1',
  GROUPS: 'zap_groups_v1',
  SETTINGS: 'zap_settings_v1',
  CARDS: 'gkd_cards_album_v1',
  PROJECTS: 'zap_project_archives_v1',
  DELETED_TEMPLATE_IDS: 'zap_deleted_template_ids_v1',
  DELETED_TOPICS: 'zap_deleted_topics_v1',
  TEMPLATES_INITIALIZED: 'zap_templates_initialized_v2',
};

export const DEFAULT_GROUPS: ContactGroup[] = [
  { id: 'grp_agenda', name: 'Agenda de Contatos', color: 'bg-slate-500' },
];

export const INITIAL_CONTACTS: Contact[] = USER_SAVED_CONTACTS;

import { TOPICS_LIST } from '../data/topics';

export const CORRA_GANHE_ADDITIONAL_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tmpl_cg_carro_1',
    title: '💰 Bônus de R$ 100 nas Suas Corridas (Carro)',
    category: 'Corre E Ganhe ⚠️ Somente Aos Elegíveis (08/09)',
    content: '💰 *Sua campanha vale R$ 100 de bônus para você, [Nome]!*\nSou o Cláudio motorista de aplicativo parceiro da 99. Faça suas corridas de carro e garanta seu bônus de R$ 100 no saldo.\n⚠️ Negocia, Expresso, Plus, Entrega e outras categorias não contam.\nMe adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais. Vamos iniciar a primeira corrida?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_cg_carro_2',
    title: '📢 Spoiler dos Ganhos de Hoje (Carro)',
    category: 'Corre E Ganhe ⚠️ Somente Aos Elegíveis (08/09)',
    content: 'Bom dia, [Nome], tudo certo? Sou o Cláudio motorista de aplicativo parceiro da 99!\nPassando rápido para te dar um spoiler dos ganhos de hoje! 📢 Tá valendo a campanha onde você ganha R$ 100 extras no saldo. O movimento na rua tá ótimo e dá para bater essa meta rapidinho. 🏁\nMe adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais. Posso contar com você para acelerar com a gente hoje? 👍',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_cg_carro_3',
    title: '🔥 Meta Relâmpago R$ 100 (Carro)',
    category: 'Corre E Ganhe ⚠️ Somente Aos Elegíveis (08/09)',
    content: 'Fala, [Nome], tudo bem? Sou o Cláudio motorista de aplicativo parceiro da 99.\nPassando para te avisar que a campanha Corra e Ganhe tá ativa e tá muito fácil de faturar! 🔥 Garanta R$ 100 de bônus direto na sua conta. 💵\nMe adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais. E aí, bora ligar o aplicativo e faturar esse bônus hoje?🤔🚀',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_cg_carro_4',
    title: '⚠️ Não Deixe Esse Bônus Escapar (Carro)',
    category: 'Corre E Ganhe ⚠️ Somente Aos Elegíveis (08/09)',
    content: '⚠️ [Nome], não deixe esse bônus escapar! Sou o Cláudio motorista de aplicativo parceiro da 99.\nVocê está com a campanha Corra e Ganhe ativa no app.\n✅ Faça suas corridas. ✅ Receba R$ 100 de bônus no saldo.\nMe adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais. Comece agora e aproveite!',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_cg_carro_5',
    title: '💰 Tem R$ 100 Esperando por Você (Carro)',
    category: 'Corre E Ganhe ⚠️ Somente Aos Elegíveis (08/09)',
    content: '💰 [Nome], tem R$ 100 esperando por você! Sou o Cláudio motorista de aplicativo parceiro da 99.\nVocê já está participando da campanha Corra e Ganhe. Completando suas corridas, você recebe R$ 100 de bônus garantido.\nMe adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais. Quanto antes começar, mais tranquilo será garantir o valor!',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_cg_carro_6',
    title: '🚨 Perto de Ganhar R$ 100 de Bônus! (Carro)',
    category: 'Corre E Ganhe ⚠️ Somente Aos Elegíveis (08/09)',
    content: '🚨 [Nome], você está muito perto de ganhar um bônus! Sou o Cláudio motorista de aplicativo parceiro da 99.\nVocê tem a campanha Corra e Ganhe ativa na sua conta. Garanta R$ 100 de bônus no saldo da 99. 💸\nMe adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais. Bora acelerar hoje?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },

  // Under category 'Corre e Ganhe R$ 100 (Último Dia)'
  {
    id: 'tmpl_cg_3107_carro_1',
    title: '💰 Bônus de R$ 100 nas Suas Corridas (Carro)',
    category: 'Corre e Ganhe R$ 100 (Último Dia)',
    content: '💰 *Sua campanha vale R$ 100 de bônus para você, [Nome]!*\nSou o Cláudio motorista de aplicativo parceiro da 99. Faça suas corridas de carro e garanta seu bônus de R$ 100 no saldo (hoje é o ÚLTIMO DIA da campanha e do meu suporte, mas ainda dá tempo).\n⚠️ Negocia, Expresso, Plus, Entrega e outras categorias não contam.\nMe adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais. Vamos iniciar a primeira corrida?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_cg_3107_carro_2',
    title: '📢 Spoiler dos Ganhos de Hoje (Carro)',
    category: 'Corre e Ganhe R$ 100 (Último Dia)',
    content: 'Bom dia, [Nome], tudo certo? Sou o Cláudio motorista de aplicativo parceiro da 99!\nPassando rápido para te dar um spoiler dos ganhos de hoje! 📢 Tá valendo a campanha onde você ganha R$ 100 extras e hoje é o ÚLTIMO DIA da campanha e do meu suporte, mas ainda dá tempo. O movimento na rua tá ótimo e dá para bater essa meta rapidinho. 🏁\nMe adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais. Posso contar com você para acelerar com a gente hoje? 👍',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_cg_3107_carro_3',
    title: '🔥 Meta Relâmpago R$ 100 (Carro)',
    category: 'Corre e Ganhe R$ 100 (Último Dia)',
    content: 'Fala, [Nome], tudo bem? Sou o Cláudio motorista de aplicativo parceiro da 99.\nPassando para te avisar que a campanha Corra e Ganhe tá ativa e hoje é o ÚLTIMO DIA da campanha e do meu suporte, mas ainda dá tempo! 🔥 Garanta R$ 100 de bônus direto na sua conta. 💵\nMe adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais. E aí, bora ligar o aplicativo e faturar esse bônus hoje?🤔🚀',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_cg_3107_carro_4',
    title: '⚠️ Não Deixe Esse Bônus Escapar (Carro)',
    category: 'Corre e Ganhe R$ 100 (Último Dia)',
    content: '⚠️ [Nome], não deixe esse bônus escapar! Sou o Cláudio motorista de aplicativo parceiro da 99.\nVocê está com a campanha Corra e Ganhe ativa e hoje é o ÚLTIMO DIA da campanha e do meu suporte, mas ainda dá tempo.\n✅ Faça suas corridas. ✅ Receba R$ 100 de bônus.\nMe adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais. Comece agora e aproveite!',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_cg_3107_carro_5',
    title: '💰 Tem R$ 100 Esperando por Você (Carro)',
    category: 'Corre e Ganhe R$ 100 (Último Dia)',
    content: '💰 [Nome], tem R$ 100 esperando por você! Sou o Cláudio motorista de aplicativo parceiro da 99.\nVocê já está participando da campanha Corra e Ganhe (hoje é o ÚLTIMO DIA da campanha e do meu suporte, mas ainda dá tempo). Completando suas corridas, você recebe R$ 100 de bônus.\nMe adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais. Quanto antes começar, mais tranquilo será garantir o valor!',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_cg_3107_carro_6',
    title: '🚨 Perto de Ganhar R$ 100 de Bônus! (Carro)',
    category: 'Corre e Ganhe R$ 100 (Último Dia)',
    content: '🚨 [Nome], você está muito perto de ganhar um bônus! Sou o Cláudio motorista de aplicativo parceiro da 99.\nVocê tem a campanha Corra e Ganhe ativa e hoje é o ÚLTIMO DIA da campanha e do meu suporte, mas ainda dá tempo. Garanta R$ 100 de bônus no saldo. 💸\nMe adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais. Bora acelerar hoje?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
];

export const CAMPAIGN_0809_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tmpl_cg_05_100_1',
    title: '💰 Meta 5 Corridas = R$ 100 de Bônus (Até 08/09)',
    category: 'Corre e Ganhe R$ 100 (5 Corridas - 08/09)',
    content: 'Olá, [Nome]! Sou o Cláudio motorista de aplicativo parceiro da 99. 💰 Passando para te avisar que sua campanha *Corre e Ganhe de R$ 100* está ativa: completando apenas *5 corridas até dia 08/09*, você garante esse bônus de *R$ 100* direto no saldo da 99!\n⚠️ Negocia, Expresso, Plus e Entrega não contam.\nMe adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais. Vamos iniciar as primeiras corridas hoje e garantir esse valor?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_cg_05_100_2',
    title: '🚀 Fature R$ 100 com 5 Corridas (Até 08/09)',
    category: 'Corre e Ganhe R$ 100 (5 Corridas - 08/09)',
    content: 'Fala, [Nome], tudo bem? Sou o Cláudio motorista de aplicativo parceiro da 99! 🚀\nPassando para avisar que sua campanha *Corre e Ganhe* está ativa: completando *5 corridas até dia 08/09* você recebe *R$ 100 de bônus* na conta!\nO movimento na rua está ótimo. Me adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais. Que tal ligar o aplicativo agora e dar o primeiro passo?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_cg_05_50_1',
    title: '💰 Meta 5 Corridas = R$ 50 de Bônus (Até 08/09)',
    category: 'Corre e Ganhe R$ 50 (5 Corridas - 08/09)',
    content: 'Olá, [Nome]! Sou o Cláudio motorista de aplicativo parceiro da 99. 💰 Campanha ativa para você: faça apenas *5 corridas até dia 08/09* e garanta *R$ 50 de bônus* extra direto no saldo da sua carteira 99.\n⚠️ Válido na categoria principal.\nMe adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais. Bora ligar o aplicativo e acelerar para garantir esse bônus?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_cg_05_50_2',
    title: '🔥 Meta Fácil: 5 Corridas por R$ 50 (Até 08/09)',
    category: 'Corre e Ganhe R$ 50 (5 Corridas - 08/09)',
    content: 'Oi, [Nome]! Sou o Cláudio motorista de aplicativo parceiro da 99. 🔥 Passando rápido para lembrar que sua meta de *5 corridas para ganhar R$ 50* está liberada até 08/09!\nMeta super tranquila de bater em poucas horas na rua. Me adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais. Vamos ligar o app hoje para destravar seus ganhos?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_cg_10_150_1',
    title: '🏆 Meta 10 Corridas = R$ 150 de Bônus (Até 08/09)',
    category: 'Corre e Ganhe R$ 150 (10 Corridas - 08/09)',
    content: 'Olá, [Nome]! 🏆 Passando para lembrar que a campanha *Corre e Ganhe de R$ 150* (10 corridas até dia 08/09) ainda está ativa na sua conta para você aproveitar! Dividindo em poucos dias você atinge a meta sem esforço e fatura esse super bônus no seu saldo da 99.\nQualquer dúvida ou se precisar de ajuda para ligar o app, me chama que estou à disposição!',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_cg_10_150_2',
    title: '💵 R$ 150 na Conta com 10 Corridas (Até 08/09)',
    category: 'Corre e Ganhe R$ 150 (10 Corridas - 08/09)',
    content: 'Fala, [Nome], beleza? 💵 Passando para avisar que a sua campanha *Corre e Ganhe de R$ 150* ativa na sua conta para completar *10 corridas até 08/09* continua disponível para você aproveitar!\nNão deixe esse dinheiro passar! Qualquer coisa é só me chamar aqui, estou à disposição!',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_cg_10_100_1',
    title: '💰 Meta 10 Corridas = R$ 100 de Bônus (Até 08/09)',
    category: 'Corre e Ganhe R$ 100 (10 Corridas - 08/09)',
    content: 'Olá, [Nome]! Sou o Cláudio motorista de aplicativo parceiro da 99. 💰 Passando para te avisar que sua campanha *Corre e Ganhe de R$ 100* está ativa: completando *10 corridas até dia 08/09*, você garante esse bônus de *R$ 100* direto no saldo da 99!\nMe adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais. Vamos iniciar?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_cg_10_100_2',
    title: '🚀 R$ 100 de Bônus em 10 Corridas (Até 08/09)',
    category: 'Corre e Ganhe R$ 100 (10 Corridas - 08/09)',
    content: 'Fala, [Nome], tudo bem? Sou o Cláudio motorista de aplicativo parceiro da 99! 🚀\nPassando para avisar que sua campanha *Corre e Ganhe* está ativa: completando *10 corridas até dia 08/09* você recebe *R$ 100 de bônus* na conta!\nMe adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais. Bora ligar o aplicativo agora?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
];

export const CAMPAIGN_2508_TEMPLATES = CAMPAIGN_0809_TEMPLATES;

export const PRIMEIRA_ABORDAGEM_ADDITIONAL_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tmpl_pa_add_1',
    title: '1. Segunda-feira e Primeiro Passo 99',
    category: 'Primeira Abordagem',
    content: 'Olá, [Nome], Segunda-feira chegou! 👋 Sou o Cláudio motorista de aplicativo parceiro da 99. Sei que começar algo novo no início da semana pode dar aquela correria, mas notei que você já está com o cadastro aprovado na 99 e ainda não fez a primeira corrida. 🚗 *Você ficou com alguma dúvida sobre como usar o aplicativo ou precisa de ajuda para começar hoje?* 🤔 Me adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais.',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_pa_add_2',
    title: '2. Parabéns Cadastro Aprovado + Dúvidas Iniciais',
    category: 'Primeira Abordagem',
    content: "Fala, [Nome]! Beleza? Sou o Cláudio motorista de aplicativo parceiro da 99. Passando para te dar os parabéns pela aprovação do cadastro na 99! Eu sei que o primeiro passo às vezes gera dúvidas bem simples, tipo qual suporte de celular comprar. Se precisar de ajuda para ligar o app pela primeira vez, me manda um 'oi' aqui. Me adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais.",
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_pa_add_3',
    title: '3. Apresentação Mentor (Melhor Horário)',
    category: 'Primeira Abordagem',
    content: 'Oi, [Nome]! Tudo joia? Sou o Cláudio motorista de aplicativo parceiro da 99. Me adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais. Para eu não te mandar mensagens em horários ruins, qual o melhor momento do dia para a gente conversar por 2 minutinhos?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_pa_add_4',
    title: '4. Apresentação Anjo Parceiro 99 (Texto ou Áudio)',
    category: 'Primeira Abordagem',
    content: 'Olá, [Nome]! Tudo bem? Sou o Cláudio motorista de aplicativo parceiro da 99. Vi aqui que o seu cadastro já foi aprovado e está tudo certinho para você começar. Se tiver qualquer dúvida sobre o uso do aplicativo, me avisa por aqui que eu te dou uma força! Me adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais. Você prefere que eu te passe as principais dicas por texto ou por um áudio curtinho?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
];

export const MEDO_COMECAR_ADDITIONAL_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tmpl_mc_add_1',
    title: '1. Insegurança Inicial e Apoio',
    category: 'Medo De Começar',
    content: '[Nome], muitos motoristas travam no início por insegurança, mas depois da primeira corrida tudo começa a fazer mais sentido. O começo é sempre o mais difícil, mas também o mais importante. Tô aqui pra te apoiar. Vamos juntos?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_mc_add_2',
    title: '2. Fazer Parte do Processo + Dar o Primeiro Passo',
    category: 'Medo De Começar',
    content: 'Oi [Nome], começar algo novo sempre traz dúvidas, mas isso faz parte do processo. Ninguém começa sabendo tudo. O importante é dar o primeiro passo e ganhar experiência no caminho. Se precisar de ajuda, pode contar comigo. Bora destravar essa primeira corrida?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_mc_add_3',
    title: '3. Relato Motorista Experiente + Normalizar Medo',
    category: 'Medo De Começar',
    content: 'Oi [Nome], tudo bem? Sou um motorista experiente aqui da 99 e queria te dizer que sentir insegurança no começo é totalmente normal. Todo mundo passa por isso. A primeira corrida é justamente o passo que ajuda você a entender como tudo funciona na prática. Depois disso, tudo fica mais natural. Tô aqui pra te ajudar nesse início. Vamos fazer sua primeira corrida?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
];

export const RECUPERAR_GASTOS_ADDITIONAL_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tmpl_rg_add_1',
    title: '1. Segunda-feira Chegou (Início de Semana 99)',
    category: 'Recuperar Os Gastos Do Final De Semana',
    content: 'Olá, [Nome], Segunda-feira chegou! 👋 Sei que começar algo novo no início da semana pode dar aquela correria, mas notei que você já está com o cadastro aprovado na 99 e ainda não fez a primeira corrida. 🚗 *Você ficou com alguma dúvida sobre como usar o aplicativo ou precisa de ajuda para começar hoje?* 🤔',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_rg_add_2',
    title: '2. Fim de Semana Passou + Alta Demanda',
    category: 'Recuperar Os Gastos Do Final De Semana',
    content: 'Oi, [Nome]! ☀️ Tudo bem? O fim de semana passou, mas a segunda-feira já começou com tudo e a demanda por corridas está alta. 🚀 Seu cadastro na 99 está prontinho, só esperando você ligar o app. Que tal aproveitar o dia de hoje para fazer a sua primeira corrida e começar a faturar? 💰 *O que acha de ligar o aplicativo hoje?* 📱',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_rg_add_3',
    title: '3. Nova Semana, Novas Metas (Incentivo Faturamento)',
    category: 'Recuperar Os Gastos Do Final De Semana',
    content: 'Nova semana, novas metas, [Nome]! 🎯 Começar a rodar logo na segunda-feira é o melhor jeito de garantir um bom faturamento até o próximo final de semana com a 99. 💸 Seu cadastro já está liberado. *Posso te ajudar a dar o primeiro passo e ligar o aplicativo ainda hoje?* 👍',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
];

export const PRE_FERIADO_ADDITIONAL_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tmpl_pf_add_1',
    title: '1. Movimento de Feriado (Restaurantes, Parques, Eventos)',
    category: 'Pré Feriado Ou Feriado',
    content: '🎉 O feriado movimenta restaurantes, parques, shoppings e eventos pela cidade. Isso significa mais pessoas precisando do aplicativo durante todo o dia. Se conseguir iniciar agora, você pode aproveitar esse fluxo de maior demanda e preços maiores.',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_pf_add_2',
    title: '2. Tendência de Maior Movimento no Feriado',
    category: 'Pré Feriado Ou Feriado',
    content: 'Hoje a tendência é de maior movimento no aplicativo por conta do feriado. Muitas pessoas preferem usar transporte por aplicativo para evitar dirigir. Aproveite esse momento para fazer suas primeiras corridas!',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_pf_add_3',
    title: '3. Rodoviárias Cheias em Feriados',
    category: 'Pré Feriado Ou Feriado',
    content: '🧳 As rodoviárias costumam ficar cheias em feriados, gerando muitas solicitações de viagens até os terminais. Se você iniciar agora, tem grandes chances de encontrar passageiros indo viajar. Vamos aproveitar essa oportunidade',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_pf_add_4',
    title: '4. Movimento de Feriado Começando à Noite',
    category: 'Pré Feriado Ou Feriado',
    content: 'O movimento do feriado já começa hoje a noite, muita gente já está saindo para viajar. Isso significa um aumento nas corridas para aeroportos e rodoviárias durante a noite. Que tal aproveitar esse movimento para fazer sua primeira corrida? Posso te ajudar a começar agora!',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_pf_add_5',
    title: '5. Oportunidade Ideal no Feriado',
    category: 'Pré Feriado Ou Feriado',
    content: 'Olá, [Nome]! Aproveite o feriado para começar a faturar com a 99! 🚀 Hoje a demanda por transporte está alta e tem muita gente precisando se deslocar pela cidade. É a oportunidade ideal para você ligar o seu app, fazer sua primeira corrida e garantir um ganho extra hoje mesmo. Vamos nessa?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_pf_add_6',
    title: '6. Véspera de Feriado e Maior Demanda',
    category: 'Pré Feriado Ou Feriado',
    content: 'Hoje é dia de oportunidade na área! 🚗 [Nome], véspera de feriado costuma trazer mais movimento na cidade e aumento na demanda por corridas. É a chance perfeita de fazer mais viagens e turbinar seus ganhos. Bora ativar o app e aproveitar?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_pf_add_7',
    title: '7. Feriadão Chegando (Grana Extra)',
    category: 'Pré Feriado Ou Feriado',
    content: 'E aí, [Nome]! Já pensou no feriadão? 🚀 Antes de curtir, que tal começar garantindo uma grana extra? A demanda está subindo e essa pode ser a hora ideal para fazer sua primeira corrida, destravar os ganhos e já deixar o dinheiro do churrasco ou da viagem no bolso. Bora ativar o app e começar agora?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
];

export const POS_FERIADO_ADDITIONAL_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tmpl_posf_add_1',
    title: '1. Correr Atrás do Prejuízo Pós-Feriado',
    category: 'Pós Feriado',
    content: 'Bom dia, [Nome]! E aí, descansou bastante? Agora é aquela hora de correr atrás do prejuízo, né? O pessoal gastou no feriado e agora a demanda volta com tudo. Vamos aproveitar esse gás de retomada pra cobrir os gastos do feriadão e botar o saldo no positivo? Tô te esperando!',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_posf_add_2',
    title: '2. Fatura do Feriado + Faturamento em Segunda-feira',
    category: 'Pós Feriado',
    content: 'O descanso foi bom, mas a fatura do feriado chega, né? 💸 Hora de repor o caixa e recuperar o fôlego! Esta segunda pós-feriado está com demanda altíssima de passageiros voltando à rotina. Estou aqui para te ajudar a ligar o app e começar a faturar agora mesmo!',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
];

export const REENGAJAMENTO_ADDITIONAL_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tmpl_reeng_add_1',
    title: '1. Oportunidade Continua Aberta',
    category: 'Reengajamento (Sumido)',
    content: '[Nome], passando pra reforçar que sua oportunidade continua aberta. Não deixa isso parado. Se tiver qualquer dificuldade ou dúvida, pode contar comigo. Vamos juntos nessa primeira corrida?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_reeng_add_2',
    title: '2. Empurrão Inicial (Novo Contato)',
    category: 'Reengajamento (Sumido)',
    content: 'Oi [Nome], notei que você ainda não começou e quis te chamar de novo. Às vezes tudo que falta é aquele empurrão inicial. Se quiser, posso te ajudar nesse começo. Bora fazer sua primeira corrida?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_reeng_add_3',
    title: '3. Retomar Contato + Destravar Primeira Corrida',
    category: 'Reengajamento (Sumido)',
    content: 'Oi [Nome], tudo bem? Passando pra retomar nosso contato. Vi que você ainda não fez sua primeira corrida e queria reforçar que esse primeiro passo faz muita diferença. Se precisar de ajuda ou tiver alguma dúvida, tô aqui. Vamos destravar isso?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
];

export const DESAFIO_ADDITIONAL_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tmpl_desafio_add_1',
    title: '1. Validação de Conta e Bônus de Boas-Vindas',
    category: 'Desafio',
    content: 'Fala, [Nome]! Sabia que quem inicia rápido aproveita muito melhor as campanhas de bônus de boas-vindas do aplicativo? Se você fizer apenas uma corrida hoje, sua conta já valida no sistema para desbloquear novos desafios de ganhos. Bora aceitar esse desafio hoje?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_desafio_add_2',
    title: '2. Meta Simples e Horários Dinâmicos',
    category: 'Desafio',
    content: 'Oi, [Nome]! Muitos motoristas aumentam muito os ganhos aproveitando os desafios de corrida e horários dinâmicos do aplicativo. Se você tiver uma meta simples para hoje, como pagar uma conta ou o combustível, o app te ajuda a bater rápido. Vamos rodar um pouquinho hoje?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_desafio_add_3',
    title: '3. Campanhas e Desafios de Ganhos Extras',
    category: 'Desafio',
    content: 'Fala, [Nome]! A 99 costuma lançar algumas campanhas e desafios excelentes que dão ganhos extras (tipo faça X corridas e ganhe um valor adicional). Quanto antes você fizer a sua estreia, mais rápido sua conta atualiza para começar a receber essas oportunidades. Bora faturar esse extra hoje?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_desafio_add_4',
    title: '4. Desafio UMA Corrida Curta Perto de Casa',
    category: 'Desafio',
    content: 'Fala, [Nome]! Sabia que a primeira corrida é a mais difícil? Depois dela, vira automático. Meu desafio para você hoje é: faça apenas UMA corrida curta perto da sua casa para testar o app. Topa testar?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
];

export const MAPA_CALOR_ADDITIONAL_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tmpl_mapac_add_1',
    title: '1. Print do Mapa de Calor dos Pontos que Mais Pagam',
    category: 'Mapa De Calor',
    content: 'Fala, [Nome]! Tudo bem? Notei que você ainda não estreou. Liberei aqui para você um mapa de calor dos pontos que mais pagam na nossa cidade hoje. Quer que eu te envie o print de onde está saindo mais corrida agora para você estrear com o pé direito?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
];

export const BENEFICIOS_99_ADDITIONAL_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tmpl_ben99_add_1',
    title: '1. Recursos Rota 99 e 99Abastece (Ativação de Perfil)',
    category: 'Benefícios 99',
    content: 'Fala, [Nome], tudo bem? Cara, deixa eu te passar uma dica muito importante sobre a plataforma: a 99 tem uns recursos de economia sensacionais, como o Rota 99 e o desconto de combustível do 99Abastece, que fazem o seu lucro líquido subir bastante no final da semana. Mas tem uma regrinha: o sistema só libera esses descontos na sua conta depois que você faz as suas primeiras corridas para ativar o perfil. Sabendo disso, o que acha de a gente aproveitar hoje para fazer apenas uma viagem curta perto de casa, só para você estrear e já começar a liberar essas vantagens no seu aplicativo? Me dá um toque aqui se precisar de ajuda para ligar o app! Abraço!',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_ben99_add_2',
    title: '2. Descontos Rota 99 e 99Abastece após Primeira Viagem',
    category: 'Benefícios 99',
    content: 'Tudo bem, [Nome]? Muitos motoristas novatos querem usar os descontos da plataforma antes de começar, mas o sistema só destrava as vantagens do Rota 99 e do 99Abastece depois que você realiza a primeira viagem e mostra que está ativo. Que tal fazermos essa primeira corrida curta hoje para validar seu perfil no sistema?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_ben99_add_3',
    title: '3. Programa Rota 99 e Estreia no App',
    category: 'Benefícios 99',
    content: 'Oi, [Nome]! A plataforma conta com o programa Rota 99, repleto de benefícios e vantagens para apoiar o motorista no dia a dia. Para o sistema liberar o seu acesso a essas promoções, você só precisa fazer as suas primeiras corridas. Vamos ligar o aplicativo hoje para realizar essa estreia e abrir as portas dos benefícios?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_ben99_add_4',
    title: '4. Desconto de Combustível 99Abastece',
    category: 'Benefícios 99',
    content: 'Fala, [Nome]! Sabia que a 99 tem o 99Abastece, que dá descontos excelentes direto no combustível para os parceiros? Mas tem um detalhe: esse recurso só é liberado no seu aplicativo depois que você faz as suas primeiras corridas e ativa a conta. Bora fazer uma viagem curta hoje para já começar a destravar essa economia para o seu bolso?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
];

export const SIMULACAO_ADDITIONAL_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tmpl_simu_add_1',
    title: '1. Acompanhamento no Passo a Passo da Primeira Corrida',
    category: 'Simulação',
    content: 'Fala, [Nome]! Muita gente tem receio de como finalizar a primeira corrida. Vamos fazer o seguinte? Liga o app agora, eu te acompanho por aqui no WhatsApp e, assim que você aceitar a primeira, eu te guio no passo a passo de como chegar e como encerrar. É como uma aula particular de 5 minutos. Topa o desafio?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
];

export const CLT_ADDITIONAL_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tmpl_clt_add_1',
    title: '1. Ganhos em Horas Livres Sem Largar o Emprego',
    category: 'Clt',
    content: 'Fala, [Nome]! Me responde uma coisa: você já calculou quanto daria para ganhar usando uma ou duas horas livres do seu dia? Muita gente se surpreende quando faz esse teste. Não precisa mudar sua rotina nem largar o emprego. Faz uma corrida hoje e vê na prática se faz sentido para você.',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_clt_add_2',
    title: '2. Complementar Renda com Emprego Fixo',
    category: 'Clt',
    content: 'Oi, [Nome]! Passando rapidinho para te incentivar. A maioria das pessoas que tem emprego fixo começa na 99 justamente para complementar a renda. Às vezes algumas horas por semana já ajudam a pagar uma conta ou acelerar algum objetivo pessoal. Faz uma primeira corrida hoje para sentir como funciona e depois você decide se quer continuar.',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_clt_add_3',
    title: '3. Corridinha Depois do Trabalho / Fim de Semana',
    category: 'Clt',
    content: 'Fala, [Nome]! Tudo bem? Vi aqui que você ainda não começou a usar a 99. Cara, queria te falar uma coisa: você não precisa largar seu emprego nem mudar sua rotina. Tem muita gente que faz uma corridinha depois do trabalho ou no final de semana só para ganhar uma renda extra. Faz um teste hoje, só uma corrida mesmo, para conhecer o aplicativo. Qualquer dúvida eu te ajudo.',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_clt_add_4',
    title: '4. Corridas no Caminho do Trabalho para Pagar Combustível',
    category: 'Clt',
    content: 'Fala, [Nome]! Tudo bem? Vi que você ainda não começou na 99. Cara, não precisa largar o emprego nem mudar sua rotina. Tem gente que liga o app só na ida ou na volta do trabalho, pega algumas corridas no caminho e ainda ajuda a pagar o combustível. Faz um teste qualquer dia desses.',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_clt_add_5',
    title: '5. Renda Extra + Desconto no Combustível (99abastece)',
    category: 'Clt',
    content: 'Fala, [Nome]! Tudo bem? Vi que você ainda não começou na 99 e queria te falar uma coisa: a maioria das pessoas acha que precisa escolher entre o emprego fixo e os aplicativos, mas não é assim. Muita gente roda só algumas horas depois do trabalho ou nos finais de semana para complementar a renda e ainda consegue ter descontos no combustível com o 99abastece. Que tal fazer apenas uma corrida hoje para conhecer o aplicativo sem compromisso?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_clt_add_6',
    title: '6. Usar a 99 na Ida/Volta do Trabalho',
    category: 'Clt',
    content: 'Fala, [Nome]! Você sabia que dá para usar a 99 sem mudar sua rotina? Muita gente liga o app na ida ou na volta do trabalho, coloca o destino e pega corridas pelo caminho. Além da renda extra, ajuda a pagar o combustível do trajeto que já faria. Já pensou em testar?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
];

export const URGENCIA_ADDITIONAL_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tmpl_urg_add_1',
    title: '1. Sua conta já está pronta para começar',
    category: 'Urgência',
    content: '🚗💨 *Sua conta já está pronta para começar* 🚗💨\nFalta só fazer a primeira corrida pra começar a aproveitar ganhos, campanhas e movimentação no aplicativo 🔥\nNão deixa pra depois!',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_urg_add_2',
    title: '2. Quem começa agora sai na frente',
    category: 'Urgência',
    content: '🔥🔥 *Quem começa agora sai na frente* 🔥🔥\nA primeira corrida é o passo mais importante pra começar a receber mais oportunidades e campanhas no app 💸\nBora iniciar hoje?!',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_urg_add_3',
    title: '3. Ainda dá tempo de aproveitar o movimento de hoje',
    category: 'Urgência',
    content: '⚠️⚠️ *Ainda dá tempo de aproveitar o movimento de hoje* ⚠️⚠️\nTem muita gente chamando corridas e entregas no app agora 📲\nNão deixa sua conta parada — faça sua primeira corrida ainda hoje 🚗💨',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_urg_add_4',
    title: '4. Sua primeira corrida pode destravar novas oportunidades',
    category: 'Urgência',
    content: '💥💥 *Sua primeira corrida pode destravar novas oportunidades* 💥💥\nQuanto mais tempo sem iniciar, mais você perde movimento no app e chances de ganhos 🚀\nAtiva hoje mesmo e começa a rodar!',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_urg_add_5',
    title: '5. Não deixa sua conta esfriar na 99',
    category: 'Urgência',
    content: '⏳⏳ *Não deixa sua conta esfriar na 99* ⏳⏳\nOs motoristas que iniciam rápido conseguem aproveitar melhor as campanhas e aumentar as chances de ganhos logo no começo 🔥\nBora fazer a primeira corrida hoje?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_urg_add_6',
    title: '6. Sua conta ainda está parada na 99',
    category: 'Urgência',
    content: '🚨🚨 *Sua conta ainda está parada na 99* 🚨🚨\nEnquanto você espera, pode estar deixando passar corridas, campanhas e oportunidades de ganhos 💸\nLiga o app hoje e faz sua primeira corrida 🚗',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_urg_add_7',
    title: '7. Falta Apenas Realizar a Primeira Corrida',
    category: 'Urgência',
    content: 'Olá, [Nome]! Falta apenas você realizar a primeira corrida para começar a aproveitar a movimentação e os ganhos do aplicativo. Não deixa para depois o que você pode faturar hoje! Tem muita gente chamando viagens agora na sua região.',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_urg_add_8',
    title: '8. Não Deixa Sua Conta Esfriar',
    category: 'Urgência',
    content: 'Fala, [Nome]! Não deixa sua conta esfriar na 99. Quanto mais tempo você passa sem iniciar, mais você perde o movimento do aplicativo e as chances de faturamento. Bora fazer a primeira corrida hoje mesmo?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_urg_add_9',
    title: '9. Toque de Conta Parada na 99',
    category: 'Urgência',
    content: 'Oi, [Nome], passando para te dar um toque: sua conta ainda está parada na 99. Enquanto você deixa para depois, está deixando passar corridas, campanhas e ótimas oportunidades de ganho na sua região. Liga o aplicativo hoje e faz pelo menos uma viagem para ativar o perfil!',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
];

export const ULTIMO_DIA_ADDITIONAL_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tmpl_ultdia_add_1',
    title: '1. Fechamento de Relatório de Suporte',
    category: 'Último Dia',
    content: 'Fala, [Nome], beleza? Cara, estou fechando meu relatório de suporte aqui e vi que você é um dos últimos que falta estrear. Queria muito te ver ganhando fazendo a primeira corrida. Me dá um alô aqui se você tiver 10 minutinhos hoje, que eu te ajudo a fazer essa primeira viagem sem erro. Abraço!',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_ultdia_add_2',
    title: '2. Liberação de Vaga de Suporte Amanhã',
    category: 'Último Dia',
    content: 'Olá, [Nome]. Como você ainda não realizou sua primeira corrida, vou precisar liberar minha vaga de suporte para outro motorista da lista de espera amanhã. Antes de eu fazer o fechamento do seu nome aqui, tem algo que eu possa fazer para te ajudar a ligar o app hoje?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_ultdia_add_3',
    title: '3. Encerramento de Acompanhamento Exclusivo',
    category: 'Último Dia',
    content: 'Oi, [Nome], passando para te dar um aviso importante: amanhã encerra o meu acompanhamento exclusivo com você.\nAté lá, ainda consigo te acompanhar de perto e ajudar no que for preciso para você fazer sua primeira corrida. Depois disso, seu canal de suporte direto comigo é encerrado e você volta para a fila comum do app.\nVamos aproveitar esse último dia? Estou com o mapa aberto aqui para te guiar e garantir que tudo dê certo.',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
];

export const FALTA_TEMPO_ADDITIONAL_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tmpl_tempo_add_1',
    title: '2. Poucas Horas para Entender a Dinâmica',
    category: 'Falta De Tempo',
    content: '[Nome], muita gente acha que precisa ter bastante tempo livre pra começar, mas não é assim. Às vezes poucas horas já são suficientes pra entender a dinâmica e começar a ganhar. Bora aproveitar um tempo livre e destravar isso?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tmpl_tempo_add_2',
    title: '3. Motorista Experiente e Flexibilidade da 99',
    category: 'Falta De Tempo',
    content: 'Oi, [Nome], tudo bem? Sou um motorista experiente aqui da 99. Sei que a rotina pode ser corrida, mas uma das maiores vantagens da plataforma é justamente a flexibilidade. Você pode começar no seu tempo, sem precisar separar um dia inteiro. Tô aqui pra te ajudar. Vamos fazer sua primeira corrida?',
    vehicleType: 'carro',
    createdAt: new Date().toISOString(),
  },
];

function buildInitialTemplates(): MessageTemplate[] {
  const list: MessageTemplate[] = [];

  TOPICS_LIST.forEach((topic, tIdx) => {
    // 1. Primary Default Template (Carro)
    list.push({
      id: `tmpl_topic_${tIdx + 1}_def`,
      title: topic.defaultTemplate.title || `${topic.title} - Opção 1`,
      category: topic.title,
      content: topic.defaultTemplate.content,
      vehicleType: 'carro',
      createdAt: new Date().toISOString(),
    });

    // 2. Topic Variations (Carro)
    if (topic.defaultTemplate.variations && topic.defaultTemplate.variations.length > 0) {
      topic.defaultTemplate.variations.forEach((varText, vIdx) => {
        let varTitle = `${topic.title} - Opção ${vIdx + 2}`;
        const cleanFirstLine = varText.trim().split('\n')[0].replace(/[*_#~]/g, '').trim();
        if (cleanFirstLine.length > 5 && cleanFirstLine.length < 55) {
          varTitle = `${vIdx + 2}. ${cleanFirstLine}`;
        }

        list.push({
          id: `tmpl_topic_${tIdx + 1}_var_${vIdx + 1}`,
          title: varTitle,
          category: topic.title,
          content: varText,
          vehicleType: 'carro',
          createdAt: new Date().toISOString(),
        });
      });
    }
  });

  // 3. Merge additional curated template collections (Car only)
  const additionalLists = [
    CAMPAIGN_2508_TEMPLATES,
    PRIMEIRA_ABORDAGEM_ADDITIONAL_TEMPLATES,
    MEDO_COMECAR_ADDITIONAL_TEMPLATES,
    RECUPERAR_GASTOS_ADDITIONAL_TEMPLATES,
    PRE_FERIADO_ADDITIONAL_TEMPLATES,
    URGENCIA_ADDITIONAL_TEMPLATES,
    ULTIMO_DIA_ADDITIONAL_TEMPLATES,
    FALTA_TEMPO_ADDITIONAL_TEMPLATES,
  ];

  additionalLists.forEach((arr) => {
    arr.forEach((addTmpl) => {
      if (!list.some((existing) => existing.content.trim() === addTmpl.content.trim())) {
        list.push(addTmpl);
      }
    });
  });

  return list;
}

export const INITIAL_TEMPLATES: MessageTemplate[] = buildInitialTemplates();

export const DEFAULT_SETTINGS: AppSettings = {
  defaultCountryCode: '55',
  defaultIntervalSeconds: 8,
  maxMessagesPer24Hours: 50,
  hideLimitBanner: false,
  sendMode: 'whatsapp_desktop',
  soundEnabled: true,
  autoOpenTab: true,
  featuredVehicle: 'carro',
  mentorName: 'Cláudio',
  chips: [
    { id: 'chip_1', name: 'Business', number: '', active: true, color: '#10B981' },
    { id: 'chip_2', name: 'Suporte', number: '', active: false, color: '#3B82F6' }
  ],
  activeChipId: 'chip_1',
  defaultFunnel: 'all',
  hideContactedToday: false,
  sortSkippedFirst: true,
  sortThreeDaysUnsentFirst: true,
  sortOldestContactedFirst: true,
  showOnlySkipped: false,
  hideAlreadyScheduled: false,
  historicalSentCount: 0,
  totalSentCount: 0
};

// Storage Helpers
export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    let item = localStorage.getItem(key);
    if (!item) {
      item = sessionStorage.getItem(key);
    }
    if (!item) return fallback;
    return JSON.parse(item);
  } catch (err) {
    console.error(`Error loading key ${key}:`, err);
    return fallback;
  }
}

export function saveToStorage<T>(key: string, value: T): boolean {
  let savedLocal = false;
  let jsonStr: string;
  try {
    jsonStr = JSON.stringify(value);
  } catch (err) {
    console.error(`Error stringifying key ${key}:`, err);
    return false;
  }

  try {
    localStorage.setItem(key, jsonStr);
    savedLocal = true;
  } catch (err: any) {
    console.warn(`localStorage quota or error for key ${key}, attempting cleanup...`, err);
    try {
      // Cleanup logs safely if quota exceeded: preserve sent count
      const existingLogsStr = localStorage.getItem(STORAGE_KEYS.LOGS);
      if (existingLogsStr) {
        try {
          const parsedLogs = JSON.parse(existingLogsStr);
          if (Array.isArray(parsedLogs) && parsedLogs.length > 200) {
            const keptLogs = parsedLogs.slice(0, 200);
            const discardedLogs = parsedLogs.slice(200);
            const discardedSent = discardedLogs.filter((l: any) => l.status === 'enviado').length;
            if (discardedSent > 0) {
              try {
                const curSettings = getSettings();
                const newHist = (curSettings.historicalSentCount || 0) + discardedSent;
                const newTotal = Math.max(curSettings.totalSentCount || 0, newHist + keptLogs.filter((l: any) => l.status === 'enviado').length);
                saveSettings({ ...curSettings, historicalSentCount: newHist, totalSentCount: newTotal });
              } catch {}
            }
            localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(keptLogs));
          }
        } catch {}
      }
      // Retry setting item
      localStorage.setItem(key, jsonStr);
      savedLocal = true;
    } catch (err2) {
      console.error(`Failed to save key ${key} even after cleanup:`, err2);
    }
  }

  try {
    sessionStorage.setItem(key, jsonStr);
  } catch (err) {
    // sessionStorage failure is non-critical
  }

  return savedLocal;
}

export function restoreFromBackup(backupData: any): { success: boolean; error?: string } {
  try {
    if (!backupData || typeof backupData !== 'object') {
      throw new Error('Formato de backup inválido');
    }

    if (backupData.rawLocalStorage && typeof backupData.rawLocalStorage === 'object') {
      Object.entries(backupData.rawLocalStorage).forEach(([key, val]) => {
        if (typeof val === 'string') {
          localStorage.setItem(key, val);
        } else {
          localStorage.setItem(key, JSON.stringify(val));
        }
      });
    }

    // List of keys we can restore explicitly
    const keysToRestore = [
      { backupKey: 'contacts', storageKey: STORAGE_KEYS.CONTACTS },
      { backupKey: 'templates', storageKey: STORAGE_KEYS.TEMPLATES },
      { backupKey: 'campaigns', storageKey: STORAGE_KEYS.CAMPAIGNS },
      { backupKey: 'logs', storageKey: STORAGE_KEYS.LOGS },
      { backupKey: 'groups', storageKey: STORAGE_KEYS.GROUPS },
      { backupKey: 'settings', storageKey: STORAGE_KEYS.SETTINGS },
    ];

    keysToRestore.forEach(({ backupKey, storageKey }) => {
      if (backupData[backupKey]) {
        saveToStorage(storageKey, backupData[backupKey]);
      }
    });

    invalidateAllStorageCaches();

    return { success: true };
  } catch (err: any) {
    console.error('Error restoring from backup:', err);
    return { success: false, error: err.message || 'Erro desconhecido ao restaurar' };
  }
}

// In-memory runtime caches to avoid thousands of blocking JSON stringify/parse operations
let contactsCache: Contact[] | null = null;
let settingsCache: AppSettings | null = null;
let groupsCache: ContactGroup[] | null = null;
let campaignsCache: ScheduledCampaign[] | null = null;
let logsCache: DispatchLogItem[] | null = null;

export function invalidateAllStorageCaches(): void {
  contactsCache = null;
  settingsCache = null;
  groupsCache = null;
  campaignsCache = null;
  logsCache = null;
  templatesCache = null;
}

// Data Managers
export function getContacts(): Contact[] {
  if (contactsCache) return contactsCache;

  const item = localStorage.getItem(STORAGE_KEYS.CONTACTS);
  let contactsList = INITIAL_CONTACTS;
  if (item) {
    try {
      contactsList = JSON.parse(item);
    } catch (err) {
      contactsList = INITIAL_CONTACTS;
    }
  }

  // Build map of initial system contacts by clean phone
  const initialPhoneMap = new Map<string, Contact>();
  INITIAL_CONTACTS.forEach((ic) => {
    const cp = (ic.phone || '').replace(/\D/g, '');
    if (cp) initialPhoneMap.set(cp, ic);
  });

  // Deduplicate by phone number & sync updated groups/notes from INITIAL_CONTACTS
  const seenPhones = new Set<string>();
  const uniqueContacts: Contact[] = [];
  let updated = false;

  const obsoleteGroups = new Set([
    'importados', '1 contato', '1º contato / apresentação', 'taxa zero (14/08)'
  ]);

  for (let c of contactsList) {
    // Auto-rename CG10/1500 to CG10/150
    if (c.group === 'CG10' || c.group === 'CG 10' || c.group === 'CG10/1500') {
      c = { ...c, group: 'CG10/150' };
      updated = true;
    }
    // Auto-migrate contacts from "Correção" category to the corresponding CG category
    if (c.group && (c.group.toLowerCase().includes('correção') || c.group.toLowerCase().includes('correcao') || c.group.toLowerCase().startsWith('corr:'))) {
      const fullStr = `${c.name || ''} ${c.group || ''} ${c.notes || ''}`.toUpperCase();
      let targetGroup = 'CG 50'; // Default for R$ 50 corrections
      
      const valMatch = fullStr.match(/(?:R\$|\$)?\s*(\d+)/);
      const val = valMatch ? valMatch[1] : '50';

      const cgMatch = fullStr.match(/CG\s*(\d+)(?:\s*[_\/\-\$]*\s*(\d+))?/i);
      if (cgMatch) {
        if (cgMatch[2]) {
          targetGroup = `CG ${cgMatch[1].padStart(2, '0')}/${cgMatch[2]}`;
        } else {
          targetGroup = `CG ${cgMatch[1]}`;
        }
      } else if (val === '50') {
        targetGroup = 'CG 50';
      } else if (val === '100') {
        targetGroup = 'CG 100';
      } else if (val === '150') {
        targetGroup = 'CG 10/150';
      } else {
        targetGroup = `CG ${val}`;
      }

      c = {
        ...c,
        group: targetGroup,
        notes: (c.notes || '').includes('Correção') ? c.notes : `${c.notes ? c.notes + ' • ' : ''}Correção: R$ ${val}`,
        customFields: {
          ...(c.customFields || {}),
          'Valor Correção': `R$ ${val}`,
          'Correção': 'Sim'
        }
      };
      updated = true;
    }
    // Migrate 25/08 to 08/09 and update CG10 to R$ 150
    if (c.group && c.group.includes('25/08')) {
      c = {
        ...c,
        group: c.group.replace(/25\/08/g, '08/09').replace(/R\$\s*100\s*\(\s*10\s*Corridas/i, 'R$ 150 (10 Corridas'),
        notes: (c.notes || '').replace(/25\/08/g, '08/09').replace(/10 corridas e ganhe R\$100/i, '10 corridas e ganhe R$150')
      };
      updated = true;
    }
    if (c.notes && c.notes.includes('25/08')) {
      c = {
        ...c,
        notes: c.notes.replace(/25\/08/g, '08/09').replace(/10 corridas e ganhe R\$100/i, '10 corridas e ganhe R$150')
      };
      updated = true;
    }
    // Ensure gender is present and correctly detected
    if (!c.gender) {
      c.gender = detectGenderFromName(c.name || '');
      updated = true;
    }

    // Auto-repair corrupted names of existing contacts (e.g. name = "CG10" or "150" or generic invalid name)
    const currentName = (c.name || '').trim();
    const isNameInvalid = !currentName || 
                          isGenericOrInvalidName(currentName) || 
                          /^(cg\d*|r?\$?\d+|\d+\$|moto|carro|pop|99moto|99pop|99|elegivel|inativo|ativo|novo|falta\d*|sem_?nome|contato\d*|lead\d*|grupo\d*)$/i.test(currentName) ||
                          currentName.toUpperCase() === 'CONTACT' ||
                          currentName.toUpperCase() === 'CONTATO' ||
                          currentName.toUpperCase().startsWith('CG');

    if (isNameInvalid) {
      // Look for the original raw name tag in categoryDetails or notes
      let rawTag = c.categoryDetails?.tag || '';
      if (!rawTag && c.notes) {
        const tagMatch = c.notes.match(/Tag:\s*([^•\r\n]+)/i);
        if (tagMatch) {
          rawTag = tagMatch[1];
        }
      }

      if (rawTag && rawTag.trim()) {
        const processed = processContactName(rawTag);
        const repairedName = processed.cleanName;
        // Verify repairedName is valid and different from current name
        if (repairedName && repairedName !== 'Contato Sem Nome' && repairedName !== currentName && !isGenericOrInvalidName(repairedName)) {
          c = { ...c, name: repairedName, gender: detectGenderFromName(repairedName) };
          updated = true;
        }
      }
    }

    // Ensure ID is present
    if (!c.id) {
      c.id = `ct_migrated_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      updated = true;
    }

    const cleanPhone = (c.phone || '').replace(/\D/g, '');
    if (cleanPhone) {
      if (!seenPhones.has(cleanPhone)) {
        seenPhones.add(cleanPhone);
        const initMatch = initialPhoneMap.get(cleanPhone);
        if (initMatch && initMatch.group && initMatch.group !== 'Agenda de Contatos') {
          if (c.group === 'Agenda de Contatos' || c.group !== initMatch.group) {
            c = { ...c, group: initMatch.group, notes: c.notes || initMatch.notes };
            updated = true;
          }
        }
        uniqueContacts.push(c);
      }
    } else {
      uniqueContacts.push(c);
    }
  }

  if (updated || uniqueContacts.length !== contactsList.length) {
    saveToStorage(STORAGE_KEYS.CONTACTS, uniqueContacts);
  }

  contactsCache = uniqueContacts;
  return uniqueContacts;
}

export function saveContacts(contacts: Contact[]): void {
  contactsCache = contacts;
  saveToStorage(STORAGE_KEYS.CONTACTS, contacts);
}

export function getDeletedTemplateIds(): Set<string> {
  const arr = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_TEMPLATE_IDS, []);
  return new Set(arr || []);
}

export function addDeletedTemplateIds(ids: string[]): void {
  const current = getDeletedTemplateIds();
  ids.forEach((id) => {
    if (id) current.add(id);
  });
  saveToStorage(STORAGE_KEYS.DELETED_TEMPLATE_IDS, Array.from(current));
}

export function getDeletedTopics(): Set<string> {
  const arr = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_TOPICS, []);
  return new Set(
    (arr || [])
      .filter((s): s is string => typeof s === 'string' && !!s.trim())
      .map((s) => s.trim().toLowerCase())
  );
}

export function addDeletedTopic(topicName: string): void {
  if (!topicName || typeof topicName !== 'string' || !topicName.trim()) return;
  const current = getDeletedTopics();
  current.add(topicName.trim().toLowerCase());
  saveToStorage(STORAGE_KEYS.DELETED_TOPICS, Array.from(current));
}

export function clearDeletedTemplatesAndTopics(): void {
  localStorage.removeItem(STORAGE_KEYS.DELETED_TEMPLATE_IDS);
  localStorage.removeItem(STORAGE_KEYS.DELETED_TOPICS);
  localStorage.removeItem(STORAGE_KEYS.TEMPLATES_INITIALIZED);
}

let templatesCache: MessageTemplate[] | null = null;

export function getTemplates(): MessageTemplate[] {
  if (templatesCache) return templatesCache;

  const isInitialized = !!localStorage.getItem(STORAGE_KEYS.TEMPLATES_INITIALIZED);
  const deletedIds = getDeletedTemplateIds();
  const deletedTopics = getDeletedTopics();

  const loaded = loadFromStorage<MessageTemplate[] | null>(STORAGE_KEYS.TEMPLATES, null);

  // If never initialized before and no loaded templates exist, seed initial templates
  if (!isInitialized && (!loaded || loaded.length === 0)) {
    saveToStorage(STORAGE_KEYS.TEMPLATES, INITIAL_TEMPLATES);
    localStorage.setItem(STORAGE_KEYS.TEMPLATES_INITIALIZED, 'true');
    templatesCache = INITIAL_TEMPLATES;
    return INITIAL_TEMPLATES;
  }

  const rawTemplates: MessageTemplate[] = Array.isArray(loaded) ? loaded : [];

  // Create lookup for initial system templates
  const initialById = new Map<string, MessageTemplate>();
  INITIAL_TEMPLATES.forEach((t) => initialById.set(t.id, t));

  // Deduplicate and filter out deleted templates or deleted topics
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const uniqueLoaded: MessageTemplate[] = [];

  for (let t of rawTemplates) {
    if (!t || !t.content || !t.content.trim()) continue;

    // Filter out if user previously deleted this template ID
    if (deletedIds.has(t.id)) continue;

    // Filter out if user deleted this category/topic
    const catLower = (t.category || '').trim().toLowerCase();
    if (catLower && deletedTopics.has(catLower)) continue;

    // Discard obsolete initial system templates that are no longer part of OFFICIAL INITIAL_TEMPLATES
    if (t.id.startsWith('tmpl_') && !initialById.has(t.id)) {
      const isTimestampOrCustom =
        t.id.startsWith('custom_tmpl_') ||
        t.id.startsWith('tmpl_custom_') ||
        /^\d+$/.test(t.id.replace('tmpl_', ''));
      if (!isTimestampOrCustom) {
        continue;
      }
    }

    // Notice: We DO NOT overwrite user edits with initialById! User's custom edits to title/content/variations are respected!

    const isSystem = t.id.startsWith('tmpl_');
    const key = `${t.category || ''}::${t.title || ''}::${t.content.trim()}`.toLowerCase();

    if (!seenIds.has(t.id) && (isSystem || !seenKeys.has(key))) {
      seenIds.add(t.id);
      seenKeys.add(key);
      uniqueLoaded.push(t);
    }
  }

  // ONLY if app was never initialized, we inject missing INITIAL_TEMPLATES that weren't deleted
  let finalTemplates = uniqueLoaded;
  if (!isInitialized) {
    const missing = INITIAL_TEMPLATES.filter((t) => {
      if (seenIds.has(t.id)) return false;
      if (deletedIds.has(t.id)) return false;
      const tCat = (t.category || '').trim().toLowerCase();
      if (tCat && deletedTopics.has(tCat)) return false;
      return true;
    });
    finalTemplates = [...uniqueLoaded, ...missing];
    localStorage.setItem(STORAGE_KEYS.TEMPLATES_INITIALIZED, 'true');
  }

  if (finalTemplates.length !== rawTemplates.length) {
    saveToStorage(STORAGE_KEYS.TEMPLATES, finalTemplates);
  }

  templatesCache = finalTemplates;
  return finalTemplates;
}

export function saveTemplates(templates: MessageTemplate[]): void {
  templatesCache = templates;
  saveToStorage(STORAGE_KEYS.TEMPLATES, templates);
  localStorage.setItem(STORAGE_KEYS.TEMPLATES_INITIALIZED, 'true');
}

export function deleteTemplatePermanently(id: string): MessageTemplate[] {
  addDeletedTemplateIds([id]);
  const current = getTemplates().filter((t) => t.id !== id);
  saveTemplates(current);
  return current;
}

export function deleteTemplatesPermanently(ids: string[]): MessageTemplate[] {
  addDeletedTemplateIds(ids);
  const idSet = new Set(ids);
  const current = getTemplates().filter((t) => !idSet.has(t.id));
  saveTemplates(current);
  return current;
}

export function renameTopicPermanently(oldTopicName: string, newTopicName: string): MessageTemplate[] {
  const oldTrimmed = oldTopicName.trim();
  const newTrimmed = newTopicName.trim();
  if (!oldTrimmed || !newTrimmed || oldTrimmed === newTrimmed) {
    return getTemplates();
  }

  const oldLower = oldTrimmed.toLowerCase();
  const newLower = newTrimmed.toLowerCase();

  // If new topic name was in deleted topics, restore it
  const deletedTopics = getDeletedTopics();
  if (deletedTopics.has(newLower)) {
    deletedTopics.delete(newLower);
    saveToStorage(STORAGE_KEYS.DELETED_TOPICS, Array.from(deletedTopics));
  }

  const current = getTemplates();
  const updated = current.map((t) => {
    if (t.category && t.category.trim().toLowerCase() === oldLower) {
      return { ...t, category: newTrimmed };
    }
    return t;
  });
  saveTemplates(updated);

  // Also update categoryName in any campaigns that reference this category
  try {
    const campaigns = getCampaigns();
    let campaignsChanged = false;
    const updatedCampaigns = campaigns.map((camp) => {
      if (camp.categoryName && camp.categoryName.trim().toLowerCase() === oldLower) {
        campaignsChanged = true;
        return { ...camp, categoryName: newTrimmed };
      }
      return camp;
    });
    if (campaignsChanged) {
      saveCampaigns(updatedCampaigns);
    }
  } catch (err) {
    console.error('Error updating campaigns on rename topic:', err);
  }

  return updated;
}

export function deleteTopicPermanently(topicName: string): MessageTemplate[] {
  addDeletedTopic(topicName);
  const lower = topicName.trim().toLowerCase();
  const current = getTemplates();
  const toDelete = current.filter((t) => t.category && t.category.trim().toLowerCase() === lower);
  addDeletedTemplateIds(toDelete.map((t) => t.id));
  const remaining = current.filter((t) => !t.category || t.category.trim().toLowerCase() !== lower);
  saveTemplates(remaining);
  return remaining;
}

export function getCampaigns(): ScheduledCampaign[] {
  if (campaignsCache) return campaignsCache;

  const loaded = loadFromStorage<ScheduledCampaign[]>(STORAGE_KEYS.CAMPAIGNS, []);
  if (!Array.isArray(loaded)) return [];
  const valid = loaded.filter((c) => c && typeof c === 'object' && c.id && c.scheduledAt);
  
  let modified = false;
  valid.forEach((c) => {
    if (c.sendMode !== 'webhook' && c.sendMode !== 'whatsapp_desktop') {
      c.sendMode = 'whatsapp_desktop';
      modified = true;
    }
  });

  const sorted = valid.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  if (modified) {
    saveToStorage(STORAGE_KEYS.CAMPAIGNS, sorted);
  }
  campaignsCache = sorted;
  return sorted;
}

export function saveCampaigns(campaigns: ScheduledCampaign[]): void {
  const sorted = [...campaigns].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  campaignsCache = sorted;
  const success = saveToStorage(STORAGE_KEYS.CAMPAIGNS, sorted);
  if (!success) {
    console.warn('saveCampaigns: localStorage write failed, clearing draft and optimizing payload...');
    try {
      localStorage.removeItem('zap_campaign_draft_v1');
      sessionStorage.removeItem('zap_campaign_draft_v1');
    } catch {}

    // Optimize campaign payload if quota exceeded
    const optimized = sorted.map((c) => {
      let cardImg = c.cardImageUrl;
      if (cardImg && cardImg.length > 30000 && cardImg.startsWith('data:')) {
        cardImg = undefined;
      }
      return {
        ...c,
        cardImageUrl: cardImg,
      };
    });

    const retrySuccess = saveToStorage(STORAGE_KEYS.CAMPAIGNS, optimized);
    if (!retrySuccess) {
      console.warn('saveCampaigns: Retry failed, trimming log history...');
      try {
        const logs = getDispatchLogs();
        if (logs.length > 200) {
          const keptLogs = logs.slice(0, 200);
          const discardedLogs = logs.slice(200);
          const discardedSent = discardedLogs.filter(l => l.status === 'enviado').length;
          if (discardedSent > 0) {
            const curSettings = getSettings();
            const newHist = (curSettings.historicalSentCount || 0) + discardedSent;
            const newTotal = Math.max(curSettings.totalSentCount || 0, newHist + keptLogs.filter(l => l.status === 'enviado').length);
            saveSettings({ ...curSettings, historicalSentCount: newHist, totalSentCount: newTotal });
          }
          saveToStorage(STORAGE_KEYS.LOGS, keptLogs);
        }
      } catch {}
      saveToStorage(STORAGE_KEYS.CAMPAIGNS, optimized);
    }
  }
}

export function getDispatchLogs(): DispatchLogItem[] {
  if (logsCache) return logsCache;
  logsCache = loadFromStorage<DispatchLogItem[]>(STORAGE_KEYS.LOGS, []);
  return logsCache;
}

export function saveDispatchLogs(logs: DispatchLogItem[]): void {
  // Cap logs to 1000 most recent items to avoid localStorage quota errors & freeze
  let cappedLogs = logs;
  if (logs.length > 1000) {
    const keptLogs = logs.slice(0, 1000);
    const discardedLogs = logs.slice(1000);
    const discardedSent = discardedLogs.filter(l => l.status === 'enviado').length;
    if (discardedSent > 0) {
      try {
        const curSettings = getSettings();
        const newHist = (curSettings.historicalSentCount || 0) + discardedSent;
        const currentKeptSent = keptLogs.filter(l => l.status === 'enviado').length;
        const newTotal = Math.max(curSettings.totalSentCount || 0, newHist + currentKeptSent);
        saveSettings({ ...curSettings, historicalSentCount: newHist, totalSentCount: newTotal });
      } catch (err) {
        console.error('Failed to update settings in saveDispatchLogs:', err);
      }
    }
    cappedLogs = keptLogs;
  }
  logsCache = cappedLogs;
  saveToStorage(STORAGE_KEYS.LOGS, cappedLogs);
}

export function getGroups(): ContactGroup[] {
  if (groupsCache) return groupsCache;

  let loaded = loadFromStorage<ContactGroup[]>(STORAGE_KEYS.GROUPS, DEFAULT_GROUPS);
  let groupsUpdated = false;
  const initialLoadedCount = loaded.length;
  loaded = loaded.filter(g => !g.name.toLowerCase().includes('correção') && !g.name.toLowerCase().includes('correcao'));
  if (loaded.length !== initialLoadedCount) {
    groupsUpdated = true;
  }
  loaded = loaded.map(g => {
    if (g.name === 'CG10' || g.name === 'CG10/1500') {
      groupsUpdated = true;
      return { ...g, name: 'CG10/150' };
    }
    return g;
  });
  if (groupsUpdated) {
    saveToStorage(STORAGE_KEYS.GROUPS, loaded);
  }
  const loadedNames = new Set(loaded.map((g) => g.name));
  const missing = DEFAULT_GROUPS.filter((g) => !loadedNames.has(g.name));

  // Collect unique group names and counts from contacts
  const groupCounts = new Map<string, number>();
  const contactGroupNames = new Set<string>();
  try {
    const contacts = getContacts();
    contacts.forEach((c) => {
      if (c.group && c.group.trim()) {
        const gName = c.group.trim();
        contactGroupNames.add(gName);
        const lower = gName.toLowerCase();
        groupCounts.set(lower, (groupCounts.get(lower) || 0) + 1);
      }
    });
  } catch (err) {
    console.error('Error scanning contact groups:', err);
  }

  const dynamicGroups: ContactGroup[] = [];
  const obsoleteGroups = new Set([
    'até 30d', 'mais de 30', 'até 11d', 'importados', '1 contato', '1º contato / apresentação', 'taxa zero (14/08)'
  ]);

  contactGroupNames.forEach((gName) => {
    const lower = gName.toLowerCase();
    if (
      !loadedNames.has(gName) &&
      !missing.some((m) => m.name === gName) &&
      !obsoleteGroups.has(lower) &&
      lower !== 'geral' &&
      lower !== 'sem_campanha' &&
      !/^T[\_\-\s]?\d{1,3}$/i.test(gName) &&
      !lower.includes('14/08') &&
      !lower.includes('até 30d') &&
      !lower.includes('mais de 30') &&
      !lower.includes('até 11d')
    ) {
      let color = 'bg-gray-600';
      if (lower.includes('taxa zero') || lower.includes('tx0')) {
        color = 'bg-blue-500';
      } else if (lower.includes('corre e ganhe') || lower.includes('cg')) {
        color = 'bg-emerald-500';
      } else if (lower.includes('vip')) {
        color = 'bg-purple-500';
      } else if (lower.includes('importados') || lower.includes('vcf')) {
        color = 'bg-slate-500';
      }
      dynamicGroups.push({
        id: `grp_dyn_${gName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        name: gName,
        color,
      });
    }
  });

  const allGroupsRaw = [...loaded, ...missing, ...dynamicGroups];
  
  // Deduplicate by ID and Name
  const uniqueIds = new Set<string>();
  const uniqueNames = new Set<string>();
  const finalGroups: ContactGroup[] = [];
  
  for (const g of allGroupsRaw) {
    if (!uniqueIds.has(g.id) && !uniqueNames.has(g.name.toLowerCase())) {
      uniqueIds.add(g.id);
      uniqueNames.add(g.name.toLowerCase());
      finalGroups.push(g);
    }
  }

  groupsCache = finalGroups;
  saveToStorage(STORAGE_KEYS.GROUPS, finalGroups);
  return finalGroups;
}

export function saveGroups(groups: ContactGroup[]): void {
  groupsCache = groups;
  saveToStorage(STORAGE_KEYS.GROUPS, groups);
}

export function getSettings(): AppSettings {
  if (settingsCache) {
    settingsCache.defaultCountryCode = '55';
    settingsCache.sendMode = 'whatsapp_desktop';
    return settingsCache;
  }

  const loaded = loadFromStorage<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  settingsCache = {
    ...DEFAULT_SETTINGS,
    ...loaded,
    defaultCountryCode: '55',
    sendMode: 'whatsapp_desktop',
  };
  return settingsCache;
}

export function saveSettings(settings: AppSettings): void {
  const normalized = {
    ...settings,
    defaultCountryCode: '55',
    sendMode: 'whatsapp_desktop' as const,
  };
  settingsCache = normalized;
  saveToStorage(STORAGE_KEYS.SETTINGS, normalized);
}

export function getTodayDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isContactedToday(contact: Contact): boolean {
  if (!contact.lastContactedDate) return false;
  return contact.lastContactedDate === getTodayDateString();
}

export function getProjectArchives(): ProjectArchive[] {
  return loadFromStorage<ProjectArchive[]>(STORAGE_KEYS.PROJECTS, []);
}

export function saveProjectArchives(archives: ProjectArchive[]): void {
  saveToStorage(STORAGE_KEYS.PROJECTS, archives);
}
