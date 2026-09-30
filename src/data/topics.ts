import { MessageTemplate } from '../types';

export interface TopicItem {
  id: string;
  title: string;
  icon?: string;
  description: string;
  badge?: string;
  defaultTemplate: {
    title: string;
    content: string;
    variations?: string[];
  };
}

export const TOPICS_LIST: TopicItem[] = [
  {
    id: 'primeiro-contato-apresentacao',
    title: '2º Contato / Convite App',
    badge: '✉️ 2º Contato',
    description: 'Mensagem de reengajamento para convidar o motorista a conhecer o aplicativo e começar',
    defaultTemplate: {
      title: 'Convite para Conhecer o App (2º Contato)',
      content: 'Olá, {primeiro_nome}! {saudacao} Estou passando novamente para te convidar a vir conhecer o aplicativo da 99 e ver como é fácil começar a faturar hoje mesmo. {primeiro_nome}, bora ligar o app e dar o primeiro passo? Qualquer dúvida estou aqui!',
      variations: [
        'Oi, {primeiro_nome}! {saudacao} Tudo bem? Passando para te convidar a vir conhecer o aplicativo da 99 e ver as oportunidades de hoje. {primeiro_nome}, vamos ligar o app e começar a faturar? Se precisar de ajuda, me chama!',
        'Olá, {primeiro_nome}! {saudacao} Vi que seu cadastro está ok. Te convido a vir conhecer o aplicativo da 99 agora e ver como as corridas estão tocando bem. {primeiro_nome}, bora fazer sua primeira hoje?',
        'Oi, {primeiro_nome}! {saudacao} Passando para te convidar a vir conhecer o aplicativo da 99 e ver como você pode faturar extra hoje. {primeiro_nome}, qualquer dúvida sobre o app, estou à disposição!'
      ]
    }
  },
  {
    id: 'cg-05-100-0809',
    title: 'Corre e Ganhe R$ 100 (5 Corridas - 08/09)',
    badge: '💰 R$ 100',
    description: 'Campanha de 5 corridas para ganhar R$ 100 de bônus',
    defaultTemplate: {
      title: 'Corre e Ganhe R$ 100 (5 Corridas - 08/09)',
      content: 'Olá {primeiro_nome}, {saudacao}! 💰 Passando para te avisar que sua campanha *Corre e Ganhe de R$ 100* continua ativa: completando apenas *5 corridas até dia 08/09*, você garante esse bônus de *R$ 100* direto no saldo da 99!\n⚠️ Negocia, Expresso, Plus e Entrega não contam.\nAproveite essa oportunidade enquanto está disponível. Bora ligar o app hoje?',
      variations: [
        'Fala, {nome}, tudo bem? 🚀\nPassando para avisar que sua campanha *Corre e Ganhe* ainda está valendo: completando *5 corridas até 08/09* você recebe *R$ 100 de bônus* na conta!\nO movimento na rua está ótimo e a campanha continua disponível. Que tal ligar o aplicativo agora?',
        '⚠️ {nome}, atenção para sua meta de bônus! Você ainda tem a campanha *Corre e Ganhe* ativa: faça apenas *5 corridas até 08/09* e receba *R$ 100 extras* direto na carteira.\nNão deixe esse bônus passar, ele continua disponível para você. Posso te ajudar a dar o primeiro passo hoje?',
        '💰 {nome}, tem R$ 100 esperando por você até 08/09! Completando suas *5 corridas até dia 08/09*, você recebe R$ 100 de bônus garantido.\nA campanha continua ativa, aproveite para faturar esse extra. Vamos acelerar juntos hoje?'
      ]
    }
  },
  {
    id: 'cg-10-100-0809',
    title: 'Corre e Ganhe R$ 100 (10 Corridas - 08/09)',
    badge: '💰 R$ 100',
    description: 'Campanha de 10 corridas para ganhar R$ 100 de bônus',
    defaultTemplate: {
      title: 'Corre e Ganhe R$ 100 (10 Corridas - 08/09)',
      content: 'Olá {primeiro_nome}, {saudacao}! 💰 Passando para lembrar que a campanha *Corre e Ganhe de R$ 100* (completando *10 corridas até dia 08/09*) continua ativa na sua conta para você aproveitar! Não deixe esse bônus passar, ele ainda está disponível. Qualquer dúvida ou se precisar de ajuda para ligar o app, me chama que estou à disposição!',
      variations: [
        'Fala, {nome}, beleza? 💵 Passando para avisar que a sua campanha *Corre e Ganhe de R$ 100* (completando *10 corridas até 08/09*) continua ativa na sua conta para você aproveitar! Não deixe essa oportunidade passar, aproveite enquanto está disponível. Qualquer coisa me chama no zap, estou à disposição!',
        'Oi, {nome}! Lembrando que a campanha de R$ 100 de bônus (10 corridas até dia 08/09) ainda está 100% ativa e disponível na sua conta para você aproveitar. Se você precisar de qualquer suporte para começar ou tirar dúvidas, pode me chamar que estou à disposição!',
        '💰 {nome}, lembrando que a campanha de *10 corridas para faturar R$ 100 de bônus até 08/09* ainda está disponível na sua conta! Bora aproveitar e garantir essa grana extra no saldo? Qualquer coisa é só me chamar aqui, estou à disposição!'
      ]
    }
  },
  {
    id: 'cg-05-50-0809',
    title: 'Corre e Ganhe R$ 50 (5 Corridas - 08/09)',
    badge: '💰 R$ 50',
    description: 'Campanha de 5 corridas para ganhar R$ 50 de bônus',
    defaultTemplate: {
      title: 'Corre e Ganhe R$ 50 (5 Corridas - 08/09)',
      content: 'Olá {primeiro_nome}, {saudacao}! 💰 Sua campanha *Corre e Ganhe de R$ 50* continua liberada: faça apenas *5 corridas até dia 08/09* e garanta *R$ 50 de bônus* extra direto no seu saldo da 99.\n⚠️ Válido nas categorias principais.\nAproveite que a meta ainda está disponível. Bora ligar o aplicativo hoje para faturar?',
      variations: [
        'Oi, {nome}! Tudo bem? 🔥 Passando rápido para lembrar que sua meta de *5 corridas para ganhar R$ 50* continua ativa até 08/09!\nMeta super tranquila de bater em poucas horas e ainda está disponível. Vamos ligar o app hoje?',
        'Fala, {nome}, beleza? ⏰ Sua campanha de R$ 50 extras (5 corridas) continua disponível até 08/09.\nNão perca essa oportunidade de faturar um extra. Posso contar com você para acelerar hoje?',
        '🎯 {nome}, aceite esse desafio de bônus! Faça 5 corridas até dia 08/09 e receba R$ 50 de bônus no saldo.\nA campanha ainda está valendo para você, aproveite! Bora começar agora?'
      ]
    }
  },
  {
    id: 'cg-10-150-0809',
    title: 'Corre e Ganhe R$ 150 (10 Corridas - 08/09)',
    badge: '🏆 R$ 150',
    description: 'Campanha de 10 corridas para ganhar R$ 150 de bônus',
    defaultTemplate: {
      title: 'Corre e Ganhe R$ 150 (10 Corridas - 08/09)',
      content: 'Olá {primeiro_nome}, {saudacao}! 🏆 Passando para lembrar que a campanha *Corre e Ganhe de R$ 150* (10 corridas até dia 08/09) continua ativa na sua conta para você aproveitar! Não deixe esse bônus passar, ele ainda está disponível. Qualquer dúvida ou se precisar de ajuda para ligar o app, me chama que estou à disposição!',
      variations: [
        'Fala, {nome}, beleza? 💵 Passando para avisar que a sua campanha *Corre e Ganhe de R$ 150* (completando *10 corridas até 08/09*) continua ativa na sua conta para você aproveitar! Não deixe essa oportunidade passar enquanto está disponível. Qualquer coisa me chama no zap, estou à disposição!',
        'Oi, {nome}! Lembrando que a campanha de R$ 150 de bônus (10 corridas até dia 08/09) ainda está 100% ativa e disponível na sua conta para você aproveitar. Se você precisar de qualquer suporte para começar ou tirar dúvidas, pode me chamar que estou à disposição!',
        '💰 {nome}, lembrando que a campanha de *10 corridas para faturar R$ 150 de bônus até 08/09* ainda está disponível na sua conta! Bora aproveitar e garantir essa grana extra no saldo? Qualquer coisa é só me chamar aqui, estou à disposição!'
      ]
    }
  },
  {
    id: 'cg-100-3107',
    title: 'Corre e Ganhe R$ 100 (Último Dia)',
    badge: '🚨 Último Dia',
    description: 'Campanha de Corre e Ganhe R$ 100 - Encerra hoje, último dia da campanha e suporte',
    defaultTemplate: {
      title: 'Corre e Ganhe R$ 100 (Último Dia)',
      content: 'Olá {primeiro_nome}, {saudacao}! ⚠️ URGENTE: Hoje é o ÚLTIMO DIA da sua campanha *Corre e Ganhe de R$ 100,00*! A oportunidade ainda está disponível, mas encerra hoje. Complete suas corridas e garanta seu bônus de R$ 100 direto no saldo. Boas corridas!',
      variations: [
        'Bom dia, {nome}, tudo certo? 📢 Passando rápido para te avisar que hoje é o ÚLTIMO DIA da campanha de R$ 100 extras! Ainda dá tempo de aproveitar essa oportunidade disponível. O movimento na rua tá ótimo e dá para bater essa meta rapidinho. 🏁\nPosso contar com você para acelerar hoje? 👍',
        'Fala, {nome}, tudo bem? 🔥 Passando para te avisar que a campanha de R$ 100 de bônus encerra HOJE! A meta continua disponível até o final do dia, complete suas corridas para garantir o valor direto na conta. 💵\nE aí, bora ligar o aplicativo e faturar esse bônus agora?🤔🚀',
        '⚠️ {nome}, não deixe esse bônus de R$ 100 escapar no último dia! Sua campanha Corra e Ganhe encerra hoje, mas ainda está disponível. Aproveite agora!\n✅ Faça suas corridas. ✅ Receba R$ 100 de bônus.\nComece agora e aproveite!',
        '🎯 {nome}, aceita esse desafio final? Faça suas corridas e receba R$ 100 de bônus com a campanha Corra e Ganhe. Lembrando que a oportunidade acaba hoje, mas ainda está disponível! ⏱️\nVamos acelerar hoje?',
        '💰 {nome}, tem R$ 100 esperando por você no último dia! Hoje encerra a campanha Corra e Ganhe. Aproveite enquanto ainda está disponível! Completando suas corridas hoje, você recebe R$ 100 de bônus.\nBora aproveitar!',
        '🚨 {nome}, você está muito perto de ganhar R$ 100 de bônus! Sua campanha Corra e Ganhe ativa encerra HOJE. A oportunidade ainda está disponível por poucas horas. Garanta seu bônus de R$ 100 direto no saldo! 💸\nNão deixe essa chance passar!'
      ]
    }
  },
  {
    id: 'cg-50-1108',
    title: 'Corre e Ganhe R$ 50 (Último Dia)',
    badge: '🚨 Último Dia (Hoje)',
    description: 'Campanha de Corre e Ganhe R$ 50 - 5 corridas, encerra hoje. Último dia da campanha e suporte.',
    defaultTemplate: {
      title: 'Corre e Ganhe R$ 50 (Último Dia)',
      content: 'Olá {primeiro_nome}, {saudacao}! ⚠️ URGENTE: Hoje é o ÚLTIMO DIA da sua campanha *Corre e Ganhe de R$ 50* (5 corridas)! A oportunidade ainda está disponível para você aproveitar. Corra para completar suas 5 corridas hoje e garantir seu bônus de R$ 50 direto no saldo. Vamos lá?',
      variations: [
        'Bom dia, {nome}, tudo certo? ⏰ Passando com extrema urgência! Hoje é o ÚLTIMO DIA da campanha *Corre e Ganhe* (5 corridas para ganhar R$ 50)! Aproveite essa meta disponível para faturar um extra. Ainda dá tempo. Bora acelerar hoje mesmo e garantir esse dinheiro extra no saldo? 🏁',
        'Fala, {nome}, tudo bem? 🔥 Alerta de reta final! A campanha de R$ 50 de bônus (fazendo apenas 5 corridas) vence HOJE, mas ainda está disponível para você. Ainda dá tempo de completar as 5 viagens e garantir o valor na conta. 💵\nBora ligar o aplicativo agora? 🚀',
        '⚠️ {nome}, atenção máxima! Hoje é o encerramento da campanha Corra e Ganhe (R$ 50 por 5 corridas). A chance ainda está disponível!\n✅ Ainda dá tempo: faça suas 5 corridas hoje.\n✅ Receba R$ 50 de bônus.\nComece agora para aproveitar!',
        '🎯 {nome}, aceita esse desafio final? Faça 5 corridas e receba R$ 50 de bônus. Atenção: hoje é o último dia da campanha disponível para você! ⏱️ Ainda tem tempo para bater a meta.\nVamos acelerar hoje mesmo?',
        '💰 {nome}, tem R$ 50 esperando por você! Hoje é o último dia da campanha Corra e Ganhe (5 corridas) ainda disponível. Ainda dá tempo! Completando suas 5 corridas hoje, você recebe os R$ 50 garantidos.\nComece logo para aproveitar!',
        '🚨 {nome}, u-r-g-e-n-t-e! Hoje é o ÚLTIMO DIA da sua campanha Corra e Ganhe ainda disponível! Basta completar 5 corridas para receber R$ 50 de bônus. 💸 O tempo tá correndo, mas ainda dá tempo.\nNão deixe essa chance escapar!'
      ]
    }
  },
  {
    id: 'tx0-0508',
    title: 'Taxa Zero (Encerra Hoje às 23:59)',
    badge: '📅 Encerra Hoje 23:59',
    description: 'Campanha de Isenção de Taxa (Taxa Zero) - Se encerra hoje às 23:59 com suporte',
    defaultTemplate: {
      title: 'Taxa Zero (Encerra Hoje às 23:59)',
      content: 'Olá {primeiro_nome}, {saudacao}! 🚀 Notícia importante: Sua promoção de *Taxa Zero* se encerra hoje às 23:59! Todas as suas corridas serão com 100% dos ganhos para você. Me adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais. Aproveite ao máximo!',
      variations: [
        'Oi {primeiro_nome}, {saudacao}! Aproveite a Taxa Zero em todas as suas corridas. Atenção: a promoção se encerra hoje às 23:59! Todo o valor faturado fica integralmente com você. Me adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais.',
        '{saudacao}, {nome}! Lembrete especial: sua promoção Taxa Zero se encerra hoje às 23:59. Quanto mais você rodar agora, mais economiza em taxas! Me adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais.'
      ]
    }
  },
  {
    id: 'corre-ganhe',
    title: 'Corre E Ganhe ⚠️ Somente Aos Elegíveis (08/09)',
    badge: '⚠️ Elegíveis (08/09)',
    description: 'Aviso de incentivo urgente com bônus por metas até 08/09',
    defaultTemplate: {
      title: 'Aviso Corre e Ganhe Elegível (Até 08/09)',
      content: 'Olá {primeiro_nome}, {saudacao}! ⚠️ Atenção: A campanha *Corre e Ganhe* continua ativa exclusivamente para o seu perfil até dia 08/09! A oportunidade está disponível para você faturar. Faça suas corridas e garanta seu bônus direto no saldo da 99. Não perca essa chance!',
      variations: [
        'Oi {primeiro_nome}, {saudacao}! ⚠️ O Corre e Ganhe continua com bônus exclusivo disponível para seu perfil até 08/09. Aproveite enquanto a campanha está valendo!',
        '{saudacao}, {nome}! Campanha Corre e Ganhe exclusiva para você continua disponível até 08/09. Basta rodar para resgatar o valor extra no saldo. Aproveite essa oportunidade!'
      ]
    }
  },
  {
    id: 'primeira-abordagem',
    title: 'Primeira Abordagem',
    description: 'Boas-vindas para novos cadastrados e primeiros passos na 99',
    defaultTemplate: {
      title: 'Segunda-feira e Primeiro Passo 99',
      content: 'Olá, [Nome], Segunda-feira chegou! 👋 Notei que você já está com o cadastro aprovado na 99 e ainda não fez a primeira corrida. 🚗 *Você ficou com alguma dúvida sobre como usar o aplicativo ou precisa de ajuda para começar hoje?* 🤔 Me adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais.',
      variations: [
        "Fala, [Nome]! Beleza? Passando para te dar os parabéns pela aprovação do cadastro na 99! Eu sei que o primeiro passo às vezes gera dúvidas bem simples, tipo qual suporte de celular comprar. Se precisar de ajuda para ligar o app pela primeira vez, me manda um 'oi' aqui. Me adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais.",
        "Oi, [Nome]! Tudo joia? Me adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais. Para eu não te mandar mensagens em horários ruins, qual o melhor momento do dia para a gente conversar por 2 minutinhos?",
        "Olá, [Nome]! Tudo bem? Vi aqui que o seu cadastro já foi aprovado e está tudo certinho para você começar. Se tiver qualquer dúvida sobre o uso do aplicativo, me avisa por aqui que eu te dou uma força! Me adiciona aqui no zap e quando precisar de ajuda me chama, olhe meu status posto algumas coisas legais. Você prefere que eu te passe as principais dicas por texto ou por um áudio curtinho?"
      ]
    }
  },
  {
    id: 'medo-comecar',
    title: 'Medo De Começar',
    description: 'Quebra de objeção e encorajamento para primeira corrida',
    defaultTemplate: {
      title: 'Insegurança Inicial e Apoio',
      content: '[Nome], muitos motoristas travam no início por insegurança, mas depois da primeira corrida tudo começa a fazer mais sentido. O começo é sempre o mais difícil, mas também o mais importante. Tô aqui pra te apoiar. Vamos juntos?',
      variations: [
        'Oi [Nome], começar algo novo sempre traz dúvidas, mas isso faz parte do processo. Ninguém começa sabendo tudo. O importante é dar o primeiro passo e ganhar experiência no caminho. Se precisar de ajuda, pode contar comigo. Bora destravar essa primeira corrida?',
        'Oi [Nome], tudo bem? Sou um motorista experiente aqui da 99 e queria te dizer que sentir insegurança no começo é totalmente normal. Todo mundo passa por isso. A primeira corrida é justamente o passo que ajuda você a entender como tudo funciona na prática. Depois disso, tudo fica mais natural. Tô aqui pra te ajudar nesse início. Vamos fazer sua primeira corrida?'
      ]
    }
  },
  {
    id: 'recuperar-gastos-fds',
    title: 'Recuperar Os Gastos Do Final De Semana',
    description: 'Engajamento de início de semana para recuperar orçamento',
    defaultTemplate: {
      title: 'Segunda-feira e Fim de Semana Passou',
      content: 'Oi, [Nome]! ☀️ Tudo bem? O fim de semana passou, mas a segunda-feira já começou com tudo e a demanda por corridas está alta. 🚀 Seu cadastro na 99 está prontinho, só esperando você ligar o app. Que tal aproveitar o dia de hoje para fazer a sua primeira corrida e começar a faturar? 💰 *O que acha de ligar o aplicativo hoje?* 📱',
      variations: [
        'Nova semana, novas metas, [Nome]! 🎯 Começar a rodar logo na segunda-feira é o melhor jeito de garantir um bom faturamento até o próximo final de semana com a 99. 💸 Seu cadastro já está liberado. *Posso te ajudar a dar o primeiro passo e ligar o aplicativo ainda hoje?* 👍'
      ]
    }
  },
  {
    id: 'pre-feriado',
    title: 'Pré Feriado Ou Feriado',
    description: 'Aproveitar tarifa dinâmica e alta demanda em feriados',
    defaultTemplate: {
      title: '1. Movimento de Feriado (Restaurantes, Parques, Eventos)',
      content: '🎉 O feriado movimenta restaurantes, parques, shoppings e eventos pela cidade. Isso significa mais pessoas precisando do aplicativo durante todo o dia. Se conseguir iniciar agora, você pode aproveitar esse fluxo de maior demanda e preços maiores.',
      variations: [
        'Hoje a tendência é de maior movimento no aplicativo por conta do feriado. Muitas pessoas preferem usar transporte por aplicativo para evitar dirigir. Aproveite esse momento para fazer suas primeiras corridas!',
        '🧳 As rodoviárias costumam ficar cheias em feriados, gerando muitas solicitações de viagens até os terminais. Se você iniciar agora, tem grandes chances de encontrar passageiros indo viajar. Vamos aproveitar essa oportunidade',
        'O movimento do feriado já começa hoje a noite, muita gente já está saindo para viajar. Isso significa um aumento nas corridas para aeroportos e rodoviárias durante a noite. Que tal aproveitar esse movimento para fazer sua primeira corrida? Posso te ajudar a começar agora!',
        'Olá, [Nome]! Aproveite o feriado para começar a faturar com a 99! 🚀 Hoje a demanda por transporte está alta e tem muita gente precisando se deslocar pela cidade. É a oportunidade ideal para você ligar o seu app, fazer sua primeira corrida e garantir um ganho extra hoje mesmo. Vamos nessa?',
        'Hoje é dia de oportunidade na área! 🚗 [Nome], véspera de feriado costuma trazer mais movimento na cidade e aumento na demanda por corridas. É a chance perfeita de fazer mais viagens e turbinar seus ganhos. Bora ativar o app e aproveitar?',
        'E aí, [Nome]! Já pensou no feriadão? 🚀 Antes de curtir, que tal começar garantindo uma grana extra? A demanda está subindo e essa pode ser a hora ideal para fazer sua primeira corrida, destravar os ganhos e já deixar o dinheiro do churrasco ou da viagem no bolso. Bora ativar o app e começar agora?'
      ]
    }
  },
  {
    id: 'pos-feriado',
    title: 'Pós Feriado',
    description: 'Retorno às pistas após dias de folga',
    defaultTemplate: {
      title: '1. Correr Atrás do Prejuízo Pós-Feriado',
      content: 'Bom dia, [Nome]! E aí, descansou bastante? Agora é aquela hora de correr atrás do prejuízo, né? O pessoal gastou no feriado e agora a demanda volta com tudo. Vamos aproveitar esse gás de retomada pra cobrir os gastos do feriadão e botar o saldo no positivo? Tô te esperando!',
      variations: [
        'O descanso foi bom, mas a fatura do feriado chega, né? 💸 Hora de repor o caixa e recuperar o fôlego! Esta segunda pós-feriado está com demanda altíssima de passageiros voltando à rotina. Estou aqui para te ajudar a ligar o app e começar a faturar agora mesmo!'
      ]
    }
  },
  {
    id: 'falta-tempo',
    title: 'Falta De Tempo',
    description: 'Opções flexíveis de poucas horas diárias',
    defaultTemplate: {
      title: '1. Encaixar as Corridas na sua Rotina',
      content: 'Oi, [Nome], o legal da 99 é que você consegue encaixar as corridas na sua rotina. Não precisa esperar o momento perfeito, só começar. Se quiser, posso te ajudar nesse primeiro passo. Vamos?',
      variations: []
    }
  },
  {
    id: 'reengajamento',
    title: 'Reengajamento (Sumido)',
    description: 'Mensagem para motoristas sem rodar há dias',
    defaultTemplate: {
      title: '1. Oportunidade Continua Aberta',
      content: '[Nome], passando pra reforçar que sua oportunidade continua aberta. Não deixa isso parado. Se tiver qualquer dificuldade ou dúvida, pode contar comigo. Vamos juntos nessa primeira corrida?',
      variations: [
        'Oi [Nome], notei que você ainda não começou e quis te chamar de novo. Às vezes tudo que falta é aquele empurrão inicial. Se quiser, posso te ajudar nesse começo. Bora fazer sua primeira corrida?',
        'Oi [Nome], tudo bem? Passando pra retomar nosso contato. Vi que você ainda não fez sua primeira corrida e queria reforçar que esse primeiro passo faz muita diferença. Se precisar de ajuda ou tiver alguma dúvida, tô aqui. Vamos destravar isso?'
      ]
    }
  },
  {
    id: 'clima',
    title: 'Clima',
    description: 'Disparo estratégico em dias de chuva ou frio intenso',
    defaultTemplate: {
      title: 'Aproveitar Chuva/Frio com Dinâmico',
      content: 'Fala, [Nome]! Tudo bem, irmão? Cara, dá uma olhada na rua agora, está chovendo e a cidade está lotada de passageiro precisando de 99. O valor das corridas está lá em cima e toca uma atrás da outra, sem você precisar ficar esperando parado no tempo. Bora aproveitar esse movimento de hoje para fazer a sua estreia! Fazendo pelo menos uma viagem hoje, o sistema já entende que você está ativo e começa a liberar as suas metas de bônus e os descontos da plataforma. Me avisa se precisar de ajuda para ligar o aplicativo aí, abraço',
      variations: [
        'Opa, [Nome]! O tempo abriu por aqui hoje. Dias de tempo bom são excelentes para quem está iniciando, porque as ruas ficam mais tranquilas e fáceis de rodar. Que tal aproveitar esse momento para fazer sua primeira corrida perto de casa?'
      ]
    }
  },
  {
    id: 'desafio',
    title: 'Desafio',
    description: 'Desafios semanais de quantidade de corridas',
    defaultTemplate: {
      title: '1. Validação de Conta e Bônus de Boas-Vindas',
      content: 'Fala, [Nome]! Sabia que quem inicia rápido aproveita muito melhor as campanhas de bônus de boas-vindas do aplicativo? Se você fizer apenas uma corrida hoje, sua conta já valida no sistema para desbloquear novos desafios de ganhos. Bora aceitar esse desafio hoje?',
      variations: [
        'Oi, [Nome]! Muitos motoristas aumentam muito os ganhos aproveitando os desafios de corrida e horários dinâmicos do aplicativo. Se você tiver uma meta simples para hoje, como pagar uma conta ou o combustível, o app te ajuda a bater rápido. Vamos rodar um pouquinho hoje?',
        'Fala, [Nome]! A 99 costuma lançar algumas campanhas e desafios excelentes que dão ganhos extras (tipo faça X corridas e ganhe um valor adicional). Quanto antes você fizer a sua estreia, mais rápido sua conta atualiza para começar a receber essas oportunidades. Bora faturar esse extra hoje?',
        'Fala, [Nome]! Sabia que a primeira corrida é a mais difícil? Depois dela, vira automático. Meu desafio para você hoje é: faça apenas UMA corrida curta perto da sua casa para testar o app. Topa testar?'
      ]
    }
  },
  {
    id: 'mapa-calor',
    title: 'Mapa De Calor',
    description: 'Aviso de zonas dinâmicas aquecidas',
    defaultTemplate: {
      title: '1. Print do Mapa de Calor dos Pontos que Mais Pagam',
      content: 'Fala, [Nome]! Tudo bem? Notei que você ainda não estreou. Liberei aqui para você um mapa de calor dos pontos que mais pagam na nossa cidade hoje. Quer que eu te envie o print de onde está saindo mais corrida agora para você estrear com o pé direito?',
      variations: []
    }
  },
  {
    id: 'beneficios-99',
    title: 'Benefícios 99',
    description: 'Informativo sobre parcerias e vantagens do aplicativo',
    defaultTemplate: {
      title: '1. Recursos Rota 99 e 99Abastece (Ativação de Perfil)',
      content: 'Fala, [Nome], tudo bem? Cara, deixa eu te passar uma dica muito importante sobre a plataforma: a 99 tem uns recursos de economia sensacionais, como o Rota 99 e o desconto de combustível do 99Abastece, que fazem o seu lucro líquido subir bastante no final da semana. Mas tem uma regrinha: o sistema só libera esses descontos na sua conta depois que você faz as suas primeiras corridas para ativar o perfil. Sabendo disso, o que acha de a gente aproveitar hoje para fazer apenas uma viagem curta perto de casa, só para você estrear e já começar a liberar essas vantagens no seu aplicativo? Me dá um toque aqui se precisar de ajuda para ligar o app! Abraço!',
      variations: [
        'Tudo bem, [Nome]? Muitos motoristas novatos querem usar os descontos da plataforma antes de começar, mas o sistema só destrava as vantagens do Rota 99 e do 99Abastece depois que você realiza a primeira viagem e mostra que está ativo. Que tal fazermos essa primeira corrida curta hoje para validar seu perfil no sistema?',
        'Oi, [Nome]! A plataforma conta com o programa Rota 99, repleto de benefícios e vantagens para apoiar o motorista no dia a dia. Para o sistema liberar o seu acesso a essas promoções, você só precisa fazer as suas primeiras corridas. Vamos ligar o aplicativo hoje para realizar essa estreia e abrir as portas dos benefícios?',
        'Fala, [Nome]! Sabia que a 99 tem o 99Abastece, que dá descontos excelentes direto no combustível para os parceiros? Mas tem um detalhe: esse recurso só é liberado no seu aplicativo depois que você faz as suas primeiras corridas e ativa a conta. Bora fazer uma viagem curta hoje para já começar a destravar essa economia para o seu bolso?'
      ]
    }
  },
  {
    id: 'simulacao',
    title: 'Simulação',
    description: 'Simulação e acompanhamento da primeira corrida',
    defaultTemplate: {
      title: '1. Acompanhamento no Passo a Passo da Primeira Corrida',
      content: 'Fala, [Nome]! Muita gente tem receio de como finalizar a primeira corrida. Vamos fazer o seguinte? Liga o app agora, eu te acompanho por aqui no WhatsApp e, assim que você aceitar a primeira, eu te guio no passo a passo de como chegar e como encerrar. É como uma aula particular de 5 minutos. Topa o desafio?',
      variations: []
    }
  },
  {
    id: 'clt',
    title: 'Clt',
    description: 'Renda extra para quem tem emprego fixo ou CLT',
    defaultTemplate: {
      title: '1. Ganhos em Horas Livres Sem Largar o Emprego',
      content: 'Fala, [Nome]! Me responde uma coisa: você já calculou quanto daria para ganhar usando uma ou duas horas livres do seu dia? Muita gente se surpreende quando faz esse teste. Não precisa mudar sua rotina nem largar o emprego. Faz uma corrida hoje e vê na prática se faz sentido para você.',
      variations: [
        'Oi, [Nome]! Passando rapidinho para te incentivar. A maioria das pessoas que tem emprego fixo começa na 99 justamente para complementar a renda. Às vezes algumas horas por semana já ajudam a pagar uma conta ou acelerar algum objetivo pessoal. Faz uma primeira corrida hoje para sentir como funciona e depois você decide se quer continuar.',
        'Fala, [Nome]! Tudo bem? Vi aqui que você ainda não começou a usar a 99. Cara, queria te falar uma coisa: você não precisa largar seu emprego nem mudar sua rotina. Tem muita gente que faz uma corridinha depois do trabalho ou no final de semana só para ganhar uma renda extra. Faz um teste hoje, só uma corrida mesmo, para conhecer o aplicativo. Qualquer dúvida eu te ajudo.',
        'Fala, [Nome]! Tudo bem? Vi que você ainda não começou na 99. Cara, não precisa largar o emprego nem mudar sua rotina. Tem gente que liga o app só na ida ou na volta do trabalho, pega algumas corridas no caminho e ainda ajuda a pagar o combustível. Faz um teste qualquer dia desses.',
        'Fala, [Nome]! Tudo bem? Vi que você ainda não começou na 99 e queria te falar uma coisa: a maioria das pessoas acha que precisa escolher entre o emprego fixo e os aplicativos, mas não é assim. Muita gente roda só algumas horas depois do trabalho ou nos finais de semana para complementar a renda e ainda consegue ter descontos no combustível com o 99abastece. Que tal fazer apenas uma corrida hoje para conhecer o aplicativo sem compromisso?',
        'Fala, [Nome]! Você sabia que dá para usar a 99 sem mudar sua rotina? Muita gente liga o app na ida ou na volta do trabalho, coloca o destino e pega corridas pelo caminho. Além da renda extra, ajuda a pagar o combustível do trajeto que já faria. Já pensou em testar?'
      ]
    }
  },
  {
    id: 'urgencia',
    title: 'Urgência',
    description: 'Alertas e chamadas de urgência para iniciar a primeira corrida',
    defaultTemplate: {
      title: '1. Sua conta já está pronta para começar',
      content: '🚗💨 *Sua conta já está pronta para começar* 🚗💨\nFalta só fazer a primeira corrida pra começar a aproveitar ganhos, campanhas e movimentação no aplicativo 🔥\nNão deixa pra depois!',
      variations: [
        '🔥🔥 *Quem começa agora sai na frente* 🔥🔥\nA primeira corrida é o passo mais importante pra começar a receber mais oportunidades e campanhas no app 💸\nBora iniciar hoje?!',
        '⚠️⚠️ *Ainda dá tempo de aproveitar o movimento de hoje* ⚠️⚠️\nTem muita gente chamando corridas e entregas no app agora 📲\nNão deixa sua conta parada — faça sua primeira corrida ainda hoje 🚗💨',
        '💥💥 *Sua primeira corrida pode destravar novas oportunidades* 💥💥\nQuanto mais tempo sem iniciar, mais você perde movimento no app e chances de ganhos 🚀\nAtiva hoje mesmo e começa a rodar!',
        '⏳⏳ *Não deixa sua conta esfriar na 99* ⏳⏳\nOs motoristas que iniciam rápido conseguem aproveitar melhor as campanhas e aumentar as chances de ganhos logo no começo 🔥\nBora fazer a primeira corrida hoje?',
        '🚨🚨 *Sua conta ainda está parada na 99* 🚨🚨\nEnquanto você espera, pode estar deixando passar corridas, campanhas e oportunidades de ganhos 💸\nLiga o app hoje e faz sua primeira corrida 🚗',
        'Olá, [Nome]! Falta apenas você realizar a primeira corrida para começar a aproveitar a movimentação e os ganhos do aplicativo. Não deixa para depois o que você pode faturar hoje! Tem muita gente chamando viagens agora na sua região.',
        'Fala, [Nome]! Não deixa sua conta esfriar na 99. Quanto mais tempo você passa sem iniciar, mais você perde o movimento do aplicativo e as chances de faturamento. Bora fazer a primeira corrida hoje mesmo?',
        'Oi, [Nome], passando para te dar um toque: sua conta ainda está parada na 99. Enquanto você deixa para depois, está deixando passar corridas, campanhas e ótimas oportunidades de ganho na sua região. Liga o aplicativo hoje e faz pelo menos uma viagem para ativar o perfil!'
      ]
    }
  },
  {
    id: 'ultimo-dia',
    title: 'Último Dia',
    description: 'Último dia de suporte e acompanhamento exclusivo para estrear',
    defaultTemplate: {
      title: '1. Fechamento de Relatório de Suporte',
      content: 'Fala, [Nome], beleza? Cara, estou fechando meu relatório de suporte aqui e vi que você é um dos últimos que falta estrear. Queria muito te ver ganhando fazendo a primeira corrida. Me dá um alô aqui se você tiver 10 minutinhos hoje, que eu te ajudo a fazer essa primeira viagem sem erro. Abraço!',
      variations: [
        'Olá, [Nome]. Como você ainda não realizou sua primeira corrida, vou precisar liberar minha vaga de suporte para outro motorista da lista de espera amanhã. Antes de eu fazer o fechamento do seu nome aqui, tem algo que eu possa fazer para te ajudar a ligar o app hoje?',
        'Oi, [Nome], passando para te dar um aviso importante: amanhã encerra o meu acompanhamento exclusivo com você.\nAté lá, ainda consigo te acompanhar de perto e ajudar no que for preciso para você fazer sua primeira corrida. Depois disso, seu canal de suporte direto comigo é encerrado e você volta para a fila comum do app.\nVamos aproveitar esse último dia? Estou com o mapa aberto aqui para te guiar e garantir que tudo dê certo.'
      ]
    }
  },
  {
    id: 'sexta-feira',
    title: 'Sexta-feira (Sextou & Fim de Semana)',
    badge: '🎉 Sexta-feira',
    description: 'Frases e campanhas especiais para sexta-feira com foco no Dia dos Pais e alta demanda',
    defaultTemplate: {
      title: 'Dica de Sexta para o Dia dos Pais',
      content: 'Olá, {primeiro_nome}! {saudacao} 🚨 Olha eu, seu mentor Cláudio, aqui para dar uma dica sobre o Dia dos Pais!\nAinda dá tempo de se preparar! Neste domingo a expectativa é de alta demanda em São Paulo. Organize sua rotina, abasteça o carro e se programe para aproveitar os horários de maior movimento. 💰🚗',
      variations: [
        'Olá, {primeiro_nome}! {saudacao} 🚨 Olha eu, seu mentor Cláudio, aqui para dar uma dica sobre o Dia dos Pais!\nAinda dá tempo de se preparar! Neste domingo a expectativa é de alta demanda em São Paulo. Organize sua rotina, abasteça o carro e se programe para aproveitar os horários de maior movimento. 💰🚗',
        'Oi, {primeiro_nome}! {saudacao} 📈 Olha eu, seu mentor Cláudio, aqui para dar uma dica sobre o Dia dos Pais!\nDomingo promete muitas corridas para shoppings, restaurantes, padarias e parques. Quem se planeja antes sai na frente e fatura mais. Já deixe tudo pronto!',
        'Olá, {primeiro_nome}! {saudacao} 🔥 Olha eu, seu mentor Cláudio, aqui para dar uma dica sobre o Dia dos Pais!\nSexta-feira é dia de estratégia! Aproveite para descansar, revisar o carro e montar seu planejamento. No domingo, entre 10h e 19h, a expectativa é de um grande volume de chamadas. Bora fazer caixa! 💸',
        'Bom dia, {primeiro_nome}! {saudacao} ⚠️ Olha eu, seu mentor Cláudio, aqui para dar uma dica sobre o Dia dos Pais!\nNão espere o domingo chegar para pensar onde vai trabalhar. Estude os polos de maior demanda, defina sua estratégia e esteja pronto. Motorista preparado aproveita as melhores oportunidades e aumenta o faturamento! 🚖💛'
      ]
    }
  }
];
