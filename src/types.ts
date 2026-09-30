export interface WhatsAppChip {
  id: string;
  name: string;
  number?: string;
  carrier?: string;
  active?: boolean;
  dailyLimit?: number;
  color?: string;
  lastResetAt?: string; // ISO date string when counter was manually reset
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  group?: string;
  notes?: string;
  chipId?: string;
  chipName?: string;
  gender?: 'homem' | 'mulher';
  vehicleType?: 'carro';
  source: 'vcf' | 'manual' | 'csv' | 'agenda' | string;
  createdAt: string;
  lastContactedDate?: string; // YYYY-MM-DD string when message was confirmed sent
  customFields?: Record<string, string>; // Dynamic fields (e.g., Taxa: "0%", Valor Correção: "R$ 50", etc.)
  categoryDetails?: {
    type?: string; // 'taxa_zero' | 'correcao' | 'corre_e_ganhe' | 'outros' | string;
    value?: string; // e.g. 'R$ 50', '0%', etc.
    target?: string; // e.g. '5 corridas', '10 corridas'
    deadline?: string; // e.g. '14/08'
    tag?: string; // original tag
    [key: string]: any;
  };
}

export interface CardItem {
  id: string;
  title: string;
  imageUrl: string;
  category: string;
  createdAt: string;
}

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  category: string;
  vehicleType?: 'carro';
  variations?: string[];
  createdAt: string;
}

export interface ScheduledCampaign {
  id: string;
  title: string;
  templateId: string;
  templateContent: string;
  categoryName?: string;
  randomTopicTemplates?: string[];
  useVariations: boolean;
  contactIds: string[];
  scheduledAt: string; // ISO date string
  status: 'agendado' | 'em_andamento' | 'concluido' | 'cancelado';
  intervalSeconds: number; // Interval between messages (e.g. 10s)
  sendMode: 'whatsapp_desktop' | 'webhook';
  cardId?: string;
  cardTitle?: string;
  cardImageUrl?: string;
  cardIds?: string[];
  cardImageUrls?: string[];
  progress: {
    sent: number;
    failed: number;
    ignored?: number;
    total: number;
  };
  createdAt: string;
  chipId?: string;
  chipName?: string;
}

export interface DispatchLogItem {
  id: string;
  campaignId: string;
  campaignTitle: string;
  contactId: string;
  contactName: string;
  phone: string;
  messageText: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: 'pendente' | 'enviado' | 'falha' | 'pulado';
  notes?: string;
  chipId?: string;
  chipName?: string;
}

export interface ContactGroup {
  id: string;
  name: string;
  color: string;
}

export interface ProjectArchive {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  createdAt: string; // ISO string
  totalSent: number;
  totalFailed: number;
  totalPending: number;
  totalSkipped: number;
  totalContacts: number;
  logsCount: number;
  campaignsCount: number;
  chipStats: { [chipName: string]: number };
  categoryStats: { [categoryName: string]: number };
  logs: DispatchLogItem[];
  campaigns: ScheduledCampaign[];
}

export interface AppSettings {
  defaultCountryCode: string; // e.g. "55" for Brazil
  defaultIntervalSeconds: number;
  maxMessagesPer24Hours: number; // e.g. 30, 35, 40, 45, 50, 55, 60, 65, 70
  hideLimitBanner?: boolean;
  sendMode: 'whatsapp_desktop' | 'webhook';
  webhookUrl?: string;
  soundEnabled: boolean;
  autoOpenTab: boolean;
  featuredVehicle?: 'carro'; // 'carro' in evidence
  enableSendingRules?: boolean;
  ruleNighttime?: boolean;
  ruleDailyLimit?: boolean;
  ruleSundayAlert?: boolean;
  ruleDoubleMessage?: boolean;
  mentorName?: string;
  chips?: WhatsAppChip[];
  activeChipId?: string;
  blockedUntil?: string; // ISO string date if WhatsApp was reported blocked for 24 hours
  defaultFunnel?: string;
  hideContactedToday?: boolean;
  sortSkippedFirst?: boolean;
  sortThreeDaysUnsentFirst?: boolean;
  sortOldestContactedFirst?: boolean;
  showOnlySkipped?: boolean;
  hideAlreadyScheduled?: boolean;
  historicalSentCount?: number;
  totalSentCount?: number;
}
