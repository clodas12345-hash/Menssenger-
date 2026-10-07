import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Download,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CheckSquare,
  Square,
  Calendar,
  Clock,
  BarChart3,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
  Smartphone,
  RefreshCw,
  FolderArchive,
  FolderCheck,
  Folder,
  FolderPlus,
  Archive,
  Users,
  TrendingUp,
  Sparkles,
  Printer,
  FileSpreadsheet
} from 'lucide-react';
import { DispatchLogItem, AppSettings, ScheduledCampaign, ProjectArchive, Contact } from '../types';
import { formatPhoneDisplay, cleanChipName, matchContact, normalizeSearchText, matchPhoneNumber } from '../utils/whatsapp';
import { downloadFileSafely } from '../utils/downloadHelper';

interface HistoryViewProps {
  logs: DispatchLogItem[];
  campaigns?: ScheduledCampaign[];
  settings: AppSettings;
  projectArchives?: ProjectArchive[];
  contacts?: Contact[];
  onClearLogs: () => void;
  onDeleteLog: (id: string) => void;
  onUpdateLog: (id: string, updates: Partial<DispatchLogItem>) => void;
  onDeleteMultipleLogs: (ids: string[]) => void;
  onReturnToQueue?: (campaignId: string, contactId: string) => void;
  onCreateProjectArchive?: (name: string, startDate: string, endDate: string, resetData: boolean) => void;
  onDeleteProjectArchive?: (id: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = React.memo(({
  logs,
  campaigns = [],
  settings,
  projectArchives = [],
  contacts = [],
  onClearLogs,
  onDeleteLog,
  onUpdateLog,
  onDeleteMultipleLogs,
  onReturnToQueue,
  onCreateProjectArchive,
  onDeleteProjectArchive,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'hourly' | 'projects' | 'contactsAudit'>('general');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deleteScope, setDeleteScope] = useState<'selected' | 'today' | 'week' | 'month' | 'all'>('today');
  const [isTableExpanded, setIsTableExpanded] = useState<boolean>(false);
  const [chipFilter, setChipFilter] = useState<string>(() => settings.chips?.[0]?.id || 'chip_1');
  const [logToDelete, setLogToDelete] = useState<DispatchLogItem | null>(null);
  const [undoPromptItem, setUndoPromptItem] = useState<DispatchLogItem | null>(null);
  const [bulkReturnToQueue, setBulkReturnToQueue] = useState<boolean>(false);

  // Contact Audit & Delivery Frequency State
  const [auditFilter, setAuditFilter] = useState<'all' | 'zero' | 'one' | 'multiple'>('all');
  const [auditSearch, setAuditSearch] = useState<string>('');

  const archiveLogs = useMemo(() => (projectArchives || []).flatMap(p => p.logs || []), [projectArchives]);

  const contactAuditData = useMemo(() => {
    const successLogsByContact = new Map<string, DispatchLogItem[]>();
    
    // Process current logs
    for (const l of logs) {
      if (l.status === 'enviado') {
        const key = l.contactId || l.phone;
        const list = successLogsByContact.get(key) || [];
        list.push(l);
        successLogsByContact.set(key, list);
      }
    }
    
    // Process archive logs
    for (const l of archiveLogs) {
      if (l.status === 'enviado') {
        const key = l.contactId || l.phone;
        const list = successLogsByContact.get(key) || [];
        list.push(l);
        successLogsByContact.set(key, list);
      }
    }

    return contacts.map(c => {
      const cleanPhone = (c.phone || '').replace(/\D/g, '');
      const logsForContact = successLogsByContact.get(c.id) || successLogsByContact.get(c.phone) || successLogsByContact.get(cleanPhone) || [];
      return {
        contact: c,
        successCount: logsForContact.length,
        logs: logsForContact,
      };
    });
  }, [contacts, logs, archiveLogs]);

  const filteredAuditData = useMemo(() => {
    return contactAuditData.filter(item => {
      if (auditSearch.trim() && !matchContact(item.contact, auditSearch)) {
        return false;
      }

      if (auditFilter === 'zero') return item.successCount === 0;
      if (auditFilter === 'one') return item.successCount === 1;
      if (auditFilter === 'multiple') return item.successCount >= 2;
      return true;
    });
  }, [contactAuditData, auditFilter, auditSearch]);

  const auditStats = useMemo(() => {
    let zero = 0;
    let one = 0;
    let multiple = 0;
    contactAuditData.forEach(item => {
      if (item.successCount === 0) zero++;
      else if (item.successCount === 1) one++;
      else multiple++;
    });
    return { zero, one, multiple, total: contactAuditData.length };
  }, [contactAuditData]);

  // Hourly History state
  const [hourlyPeriod, setHourlyPeriod] = useState<'today' | 'last24h' | 'yesterday' | 'custom'>('today');
  const [hourlyCustomDate, setHourlyCustomDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [expandedHour, setExpandedHour] = useState<number | null>(null);
  const [hideEmptyHours, setHideEmptyHours] = useState<boolean>(false);
  const [excludeNightHours, setExcludeNightHours] = useState<boolean>(true);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  // 15-Day Projects State
  const [projectNameInput, setProjectNameInput] = useState<string>('');
  const [projectStartDate, setProjectStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 15);
    return d.toISOString().slice(0, 10);
  });
  const [projectEndDate, setProjectEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [resetAfterArchive, setResetAfterArchive] = useState<boolean>(true);
  const [selectedArchivedProject, setSelectedArchivedProject] = useState<ProjectArchive | null>(null);
  const [archivedProjectSearch, setArchivedProjectSearch] = useState<string>('');
  const [projectLogSearch, setProjectLogSearch] = useState<string>('');
  const [projectLogFilter, setProjectLogFilter] = useState<'all' | 'enviado' | 'falha' | 'pulado'>('all');

  const handleSetProjectPreset = (days: number | 'all') => {
    const today = new Date().toISOString().slice(0, 10);
    setProjectEndDate(today);
    if (days === 'all') {
      if (logs.length > 0) {
        const sorted = [...logs].sort((a, b) => {
          const da = a.sentAt ? new Date(a.sentAt).getTime() : 0;
          const db = b.sentAt ? new Date(b.sentAt).getTime() : 0;
          return da - db;
        });
        const first = sorted[0]?.sentAt ? new Date(sorted[0].sentAt).toISOString().slice(0, 10) : today;
        setProjectStartDate(first);
      } else {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        setProjectStartDate(d.toISOString().slice(0, 10));
      }
    } else {
      const d = new Date();
      d.setDate(d.getDate() - days);
      setProjectStartDate(d.toISOString().slice(0, 10));
    }
  };

  // 15-Day Statistics Calculation
  const stats15Days = useMemo(() => {
    const start = new Date(projectStartDate + 'T00:00:00');
    const end = new Date(projectEndDate + 'T23:59:59');

    const logsInRange = logs.filter((l) => {
      const d = l.sentAt ? new Date(l.sentAt) : new Date(l.scheduledAt || Date.now());
      return d >= start && d <= end;
    });

    const activeLogs = logsInRange.length > 0 ? logsInRange : logs;

    let sent = 0;
    let failed = 0;
    let pending = 0;
    let skipped = 0;
    const uniqueContacts = new Set<string>();
    const chipCounts: { [name: string]: number } = {};
    const categoryCounts: { [name: string]: number } = {};

    activeLogs.forEach((l) => {
      uniqueContacts.add(l.contactId);
      if (l.status === 'enviado') sent++;
      else if (l.status === 'falha') failed++;
      else if (l.status === 'pendente') pending++;
      else if (l.status === 'pulado') skipped++;

      const cName = cleanChipName(l.chipName || l.chipId || 'Business');
      chipCounts[cName] = (chipCounts[cName] || 0) + 1;

      if (l.campaignTitle) {
        categoryCounts[l.campaignTitle] = (categoryCounts[l.campaignTitle] || 0) + 1;
      }
    });

    const total = sent + failed + pending + skipped;
    const successRate = total > 0 ? Math.round((sent / total) * 100) : 0;

    return {
      sent,
      failed,
      pending,
      skipped,
      total,
      successRate,
      uniqueContactsCount: uniqueContacts.size,
      chipCounts,
      categoryCounts,
      logsInRange: activeLogs,
    };
  }, [logs, projectStartDate, projectEndDate]);

  const chipsInLogs = useMemo(() => {
    const chipsMap = new Map<string, string>();
    logs.forEach((log) => {
      if (log.chipId) {
        chipsMap.set(log.chipId, cleanChipName(log.chipName || log.chipId));
      } else {
        chipsMap.set('default', 'Business');
      }
    });
    return Array.from(chipsMap.entries()).map(([id, name]) => ({ id, name }));
  }, [logs]);

  const chipFilteredLogs = useMemo(() => {
    if (chipFilter === 'default') return logs.filter((l) => !l.chipId);
    return logs.filter((l) => l.chipId === chipFilter);
  }, [logs, chipFilter]);

  // Stats calculation
  const now = new Date();

  const getLogDate = (log: DispatchLogItem) => {
    return log.sentAt ? new Date(log.sentAt) : new Date(log.scheduledAt || Date.now());
  };

  const isToday = (d: Date) => {
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday as start of week
  startOfWeek.setDate(now.getDate() - diffToMonday);

  const isThisWeek = (d: Date) => {
    return d >= startOfWeek;
  };

  const isThisMonth = (d: Date) => {
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth()
    );
  };

  const twentyFourHoursAgoMs = now.getTime() - 24 * 60 * 60 * 1000;
  const isLast24H = (d: Date) => {
    return d.getTime() >= twentyFourHoursAgoMs;
  };

  const [detailModal, setDetailModal] = useState<{
    title: string;
    status: 'pulado' | 'falha' | 'enviado';
    logs: DispatchLogItem[];
  } | null>(null);

  const calculatePeriodStats = (filterFn: (d: Date) => boolean) => {
    let sent = 0;
    let skipped = 0;
    let failed = 0;
    const sentLogs: DispatchLogItem[] = [];
    const skippedLogs: DispatchLogItem[] = [];
    const failedLogs: DispatchLogItem[] = [];

    chipFilteredLogs.forEach((log) => {
      const d = getLogDate(log);
      if (filterFn(d)) {
        if (log.status === 'enviado') {
          sent += 1;
          sentLogs.push(log);
        } else if (log.status === 'pulado') {
          skipped += 1;
          skippedLogs.push(log);
        } else if (log.status === 'falha') {
          failed += 1;
          failedLogs.push(log);
        } else {
          skipped += 1;
          skippedLogs.push(log);
        }
      }
    });

    return { sent, skipped, failed, total: sent + skipped + failed, sentLogs, skippedLogs, failedLogs };
  };

  const todayStats = calculatePeriodStats(isToday);
  const last24hStats = calculatePeriodStats(isLast24H);
  const weekStats = calculatePeriodStats(isThisWeek);
  const monthStats = calculatePeriodStats(isThisMonth);

  const chipBreakdownData = useMemo(() => {
    const map: Record<string, { chipId: string; name: string; sent: number; skipped: number; failed: number; total: number }> = {};
    const availableChips = settings.chips && settings.chips.length > 0 ? settings.chips : [{ id: 'chip_1', name: 'Business', active: true }];
    availableChips.forEach(c => {
      map[c.id] = { chipId: c.id, name: cleanChipName(c.name), sent: 0, skipped: 0, failed: 0, total: 0 };
    });

    chipFilteredLogs.forEach(l => {
      const chipId = l.chipId || availableChips[0]?.id || 'chip_1';
      const chipObj = availableChips.find(c => c.id === chipId);
      const name = l.chipName ? cleanChipName(l.chipName) : (chipObj ? cleanChipName(chipObj.name) : 'Business');
      if (!map[chipId]) {
        map[chipId] = { chipId, name, sent: 0, skipped: 0, failed: 0, total: 0 };
      }
      map[chipId].total += 1;
      if (l.status === 'enviado') map[chipId].sent += 1;
      else if (l.status === 'pulado') map[chipId].skipped += 1;
      else if (l.status === 'falha') map[chipId].failed += 1;
      else map[chipId].skipped += 1;
    });

    return Object.values(map);
  }, [chipFilteredLogs, settings.chips]);

  // Hourly Breakdown Calculation
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const filteredHours = excludeNightHours ? hours.filter((h) => h >= 6 && h < 21) : hours;

    const periodLogs = chipFilteredLogs.filter((log) => {
      const d = getLogDate(log);
      if (excludeNightHours) {
        const h = d.getHours();
        if (h >= 21 || h < 6) return false;
      }
      if (hourlyPeriod === 'today') {
        return isToday(d);
      } else if (hourlyPeriod === 'yesterday') {
        const y = new Date(now);
        y.setDate(now.getDate() - 1);
        return (
          d.getFullYear() === y.getFullYear() &&
          d.getMonth() === y.getMonth() &&
          d.getDate() === y.getDate()
        );
      } else if (hourlyPeriod === 'last24h') {
        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
        return d.getTime() >= twentyFourHoursAgo;
      } else if (hourlyPeriod === 'custom') {
        if (!hourlyCustomDate) return true;
        const [year, month, day] = hourlyCustomDate.split('-').map(Number);
        return (
          d.getFullYear() === year &&
          d.getMonth() === month - 1 &&
          d.getDate() === day
        );
      }
      return true;
    });

    const breakdown = filteredHours.map((hour) => {
      const hourLogs = periodLogs.filter((log) => getLogDate(log).getHours() === hour);
      const sent = hourLogs.filter((l) => l.status === 'enviado').length;
      const skipped = hourLogs.filter((l) => l.status === 'pulado').length;
      const failed = hourLogs.filter((l) => l.status === 'falha').length;
      return {
        hour,
        hourLabel: `${hour.toString().padStart(2, '0')}:00 - ${(hour + 1 === 24 ? 0 : hour + 1).toString().padStart(2, '0')}:00`,
        total: hourLogs.length,
        sent,
        skipped,
        failed,
        logs: hourLogs,
      };
    });

    const maxTotalInAnHour = Math.max(...breakdown.map((b) => b.total), 1);
    const peakHour = breakdown.reduce(
      (max, b) => (b.total > max.total ? b : max),
      breakdown[0] || {
        hour: 0,
        hourLabel: '06:00 - 07:00',
        total: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
        logs: [],
      }
    );
    const activeHoursCount = breakdown.filter((b) => b.total > 0).length;
    const totalSentInPeriod = periodLogs.filter((l) => l.status === 'enviado').length;
    const totalInPeriod = periodLogs.length;

    return {
      breakdown,
      maxTotalInAnHour,
      peakHour,
      activeHoursCount,
      totalSentInPeriod,
      totalInPeriod,
      periodLogs,
    };
  }, [chipFilteredLogs, hourlyPeriod, hourlyCustomDate, now, excludeNightHours]);

  const generateHourlyReportText = () => {
    const periodLabel =
      hourlyPeriod === 'today'
        ? 'Hoje'
        : hourlyPeriod === 'last24h'
        ? 'Últimas 24 Horas'
        : hourlyPeriod === 'yesterday'
        ? 'Ontem'
        : `Data ${hourlyCustomDate}`;

    let text = `📊 RELATÓRIO DE DISPAROS - HORA EM HORA (${excludeNightHours ? '06:00 às 21:00' : '00:00 às 24:00'})\n`;
    text += `📅 Período: ${periodLabel}\n`;
    text += `----------------------------------------\n`;
    text += `🟢 Enviadas: ${hourlyData.totalSentInPeriod}\n`;
    text += `🟡 Puladas: ${hourlyData.periodLogs.filter((l) => l.status === 'pulado').length}\n`;
    text += `🔴 Canceladas: ${hourlyData.periodLogs.filter((l) => l.status === 'falha').length}\n`;
    text += `📈 Total de Disparos: ${hourlyData.totalInPeriod}\n`;
    text += `⏱️ Horas Ativas: ${hourlyData.activeHoursCount} / ${excludeNightHours ? '15' : '24'} horas\n`;
    if (hourlyData.peakHour.total > 0) {
      text += `🏆 Hora de Pico: ${hourlyData.peakHour.hourLabel} (${hourlyData.peakHour.total} msgs)\n`;
    }
    text += `----------------------------------------\n`;
    text += `DETALHAMENTO HORA A HORA:\n\n`;

    hourlyData.breakdown.forEach((slot) => {
      text += `• ${slot.hourLabel.padEnd(15, ' ')} ➔ ${slot.total} msgs`;
      if (slot.total > 0) {
        text += ` (${slot.sent} enviadas, ${slot.skipped} puladas, ${slot.failed} canceladas)`;
      }
      text += `\n`;
    });

    text += `----------------------------------------\n`;
    text += `Gerado pelo sistema em ${new Date().toLocaleString('pt-BR')}\n`;
    return text;
  };

  const handleCopyHourlyReport = () => {
    const text = generateHourlyReportText();
    navigator.clipboard.writeText(text).then(() => {
      setCopiedNotice('📋 Relatório de hora em hora (06h - 22h) copiado para a área de transferência!');
      setTimeout(() => setCopiedNotice(null), 3500);
    });
  };

  const handleDownloadHourlyReport = () => {
    const text = generateHourlyReportText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    downloadFileSafely(blob, `relatorio_hora_em_hora_06h_22h_${hourlyPeriod}.txt`);
    setCopiedNotice('📥 Relatório em texto (.txt) baixado com sucesso!');
    setTimeout(() => setCopiedNotice(null), 3500);
  };

  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 50;

  const filteredLogs = useMemo(() => {
    return chipFilteredLogs.filter((l) => {
      const contactName = l.contactName || '';
      const phone = l.phone || '';
      const campaignTitle = l.campaignTitle || '';

      const term = searchTerm.trim();
      if (!term) return statusFilter === 'all' || l.status === statusFilter;

      const normTerm = normalizeSearchText(term);
      const normName = normalizeSearchText(contactName);
      const normTitle = normalizeSearchText(campaignTitle);
      const normMsg = normalizeSearchText(l.messageText);

      const matchesSearch =
        normName.includes(normTerm) ||
        normTitle.includes(normTerm) ||
        normMsg.includes(normTerm) ||
        matchPhoneNumber(phone, term);

      const matchesStatus = statusFilter === 'all' || l.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [chipFilteredLogs, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Reset page on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, chipFilter]);

  const handleSelectAll = () => {
    if (selectedIds.length === filteredLogs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLogs.map((l) => l.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleOpenDeleteModal = () => {
    if (selectedIds.length > 0) {
      setDeleteScope('selected');
    } else {
      setDeleteScope('today');
    }
    setIsDeleteModalOpen(true);
  };

  const handleExecuteDeletion = () => {
    let idsToDelete: string[] = [];
    
    if (deleteScope === 'selected') {
      idsToDelete = selectedIds;
    } else if (deleteScope === 'today') {
      idsToDelete = logs.filter((l) => isToday(getLogDate(l))).map((l) => l.id);
    } else if (deleteScope === 'week') {
      idsToDelete = logs.filter((l) => isThisWeek(getLogDate(l))).map((l) => l.id);
    } else if (deleteScope === 'month') {
      idsToDelete = logs.filter((l) => isThisMonth(getLogDate(l))).map((l) => l.id);
    } else if (deleteScope === 'all') {
      idsToDelete = logs.map(l => l.id);
    }

    if (idsToDelete.length > 0) {
      if (bulkReturnToQueue && onReturnToQueue) {
        const logsToDelete = logs.filter(l => idsToDelete.includes(l.id));
        logsToDelete.forEach(l => {
          onReturnToQueue(l.campaignId, l.contactId);
        });
      }
      
      if (deleteScope === 'all') {
        onClearLogs();
      } else {
        onDeleteMultipleLogs(idsToDelete);
      }
      setSelectedIds([]);
    }

    setIsDeleteModalOpen(false);
    setBulkReturnToQueue(false);
  };

  const handleExportCsv = () => {
    const headers = ['Campanha', 'Contato', 'Telefone', 'Status', 'Data Envio', 'Mensagem'];
    const rows = filteredLogs.map((l) => [
      `"${l.campaignTitle}"`,
      `"${l.contactName}"`,
      `"${l.phone}"`,
      `"${l.status}"`,
      `"${l.sentAt ? new Date(l.sentAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}"`,
      `"${l.messageText.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8' });
    downloadFileSafely(blob, `relatorio_disparos_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportPdf = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Relatório de Histórico de Disparos - PDF</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111; margin: 20px; font-size: 12px; }
            h1 { font-size: 20px; color: #A88B4B; border-bottom: 2px solid #A88B4B; padding-bottom: 8px; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
            th { background-color: #f4f4f4; color: #333; font-weight: bold; }
            tr:nth-child(even) { background-color: #fafafa; }
            .meta { margin-bottom: 15px; color: #555; }
          </style>
        </head>
        <body>
          <h1>Relatório de Histórico e Relatórios de Disparo</h1>
          <div class="meta">
            <p><strong>Data de Geração:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            <p><strong>Total de Registros Exibidos:</strong> ${filteredLogs.length} (de ${logs.length} totais)</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Campanha</th>
                <th>Contato</th>
                <th>Telefone</th>
                <th>Status</th>
                <th>Data Envio</th>
                <th>Mensagem</th>
              </tr>
            </thead>
            <tbody>
              ${filteredLogs.map(l => `
                <tr>
                  <td>${l.campaignTitle}</td>
                  <td>${l.contactName}</td>
                  <td>${l.phone}</td>
                  <td><strong>${l.status}</strong></td>
                  <td>${l.sentAt ? new Date(l.sentAt).toLocaleString('pt-BR') : '—'}</td>
                  <td>${l.messageText}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
        </html>
      `;
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#15181E] border border-[#1F2229] p-6 rounded-xl shadow-xl">
        <div>
          <h2 className="text-2xl font-serif italic text-white flex items-center space-x-2">
            <FileText className="w-6 h-6 text-[#A88B4B]" />
            <span>Histórico e Relatórios de Disparo ({logs.length})</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Acompanhe o total de disparos por dia, semana e mês, com opção de filtrar e excluir por período.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {logs.length > 0 && (
            <button
              onClick={handleOpenDeleteModal}
              className="bg-red-500/20 hover:bg-red-500/35 text-red-400 border border-red-500/40 px-3.5 py-2.5 rounded font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-1.5 shadow"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir Registros {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}</span>
            </button>
          )}

          <button
            onClick={handleExportPdf}
            disabled={logs.length === 0}
            className="bg-[#A88B4B]/20 hover:bg-[#A88B4B]/30 border border-[#A88B4B]/40 disabled:opacity-50 text-[#A88B4B] px-4 py-2.5 rounded font-bold text-xs uppercase tracking-widest shadow transition-all flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Salvar PDF</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={logs.length === 0}
            className="bg-[#A88B4B] hover:bg-[#C5A968] disabled:opacity-50 text-[#0A0C10] px-4 py-2.5 rounded font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#A88B4B]/20 transition-all flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-col sm:flex-row border-b border-[#1F2229] gap-1.5 bg-[#15181E] p-1.5 rounded-xl border border-[#1F2229] shadow-lg">
        <button
          type="button"
          onClick={() => setActiveSubTab('general')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer ${
            activeSubTab === 'general'
              ? 'bg-[#A88B4B] text-slate-950 shadow-md font-extrabold'
              : 'text-gray-400 hover:text-white hover:bg-[#1F2229]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Relatório Geral</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('hourly')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer ${
            activeSubTab === 'hourly'
              ? 'bg-[#A88B4B] text-slate-950 shadow-md font-extrabold'
              : 'text-gray-400 hover:text-white hover:bg-[#1F2229]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Histórico por Hora</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('projects')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer ${
            activeSubTab === 'projects'
              ? 'bg-[#A88B4B] text-slate-950 shadow-md font-extrabold'
              : 'text-gray-400 hover:text-white hover:bg-[#1F2229]'
          }`}
        >
          <FolderArchive className="w-4 h-4" />
          <span>📁 Projetos (15 Dias)</span>
          {projectArchives.length > 0 && (
            <span className="bg-slate-900/40 text-amber-300 text-[10px] px-1.5 py-0.5 rounded-full font-mono ml-1">
              {projectArchives.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('contactsAudit')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer ${
            activeSubTab === 'contactsAudit'
              ? 'bg-[#A88B4B] text-slate-950 shadow-md font-extrabold'
              : 'text-gray-400 hover:text-white hover:bg-[#1F2229]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>👥 Auditoria por Contato</span>
          {auditStats.multiple > 0 && (
            <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded-full font-mono ml-1">
              {auditStats.multiple} dup
            </span>
          )}
        </button>
      </div>


      {activeSubTab === 'contactsAudit' ? (
        <div className="space-y-6 animate-fade-in">
          {/* Informational Banner */}
          <div className="bg-[#15181E] border border-[#1F2229] p-5 rounded-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-[#A88B4B]" />
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  Auditoria de Frequência de Envios por Contato
                </h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Monitore exatamente quantas mensagens cada contato recebeu. Evite enviar duplicado (2 ou 3 mensagens para a mesma pessoa) ou deixar contatos sem envio (nenhuma mensagem).
              </p>
            </div>
            <div className="flex items-center space-x-3 shrink-0">
              <div className="bg-[#0A0C10] border border-[#1F2229] px-4 py-2.5 rounded-xl text-center">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest block">Total Contatos</span>
                <span className="text-lg font-extrabold text-white">{auditStats.total}</span>
              </div>
            </div>
          </div>

          {/* Stat Cards & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => setAuditFilter('all')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                auditFilter === 'all'
                  ? 'bg-[#A88B4B]/15 border-[#A88B4B] shadow-lg'
                  : 'bg-[#15181E] border-[#1F2229] hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Todos</span>
                <Users className="w-4 h-4 text-[#A88B4B]" />
              </div>
              <p className="text-2xl font-extrabold text-white mt-2">{auditStats.total}</p>
            </button>

            <button
              type="button"
              onClick={() => setAuditFilter('zero')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                auditFilter === 'zero'
                  ? 'bg-rose-500/15 border-rose-500 shadow-lg'
                  : 'bg-[#15181E] border-[#1F2229] hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Sem Envio (0)</span>
                <XCircle className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-2xl font-extrabold text-rose-400 mt-2">{auditStats.zero}</p>
            </button>

            <button
              type="button"
              onClick={() => setAuditFilter('one')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                auditFilter === 'one'
                  ? 'bg-emerald-500/15 border-emerald-500 shadow-lg'
                  : 'bg-[#15181E] border-[#1F2229] hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Equilibrados (1)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-extrabold text-emerald-400 mt-2">{auditStats.one}</p>
            </button>

            <button
              type="button"
              onClick={() => setAuditFilter('multiple')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                auditFilter === 'multiple'
                  ? 'bg-amber-500/15 border-amber-500 shadow-lg'
                  : 'bg-[#15181E] border-[#1F2229] hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Múltiplos (2+)</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-extrabold text-amber-400 mt-2">{auditStats.multiple}</p>
            </button>
          </div>

          {/* Search bar */}
          <div className="bg-[#15181E] border border-[#1F2229] p-4 rounded-xl shadow-lg flex items-center space-x-3">
            <Search className="w-5 h-5 text-gray-400 shrink-0" />
            <input
              type="text"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              placeholder="Buscar contato por nome ou telefone na auditoria..."
              className="w-full bg-transparent text-white text-xs font-medium placeholder-gray-500 focus:outline-none"
            />
          </div>

          {/* Contact Audit Table */}
          <div className="bg-[#15181E] border border-[#1F2229] rounded-xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1F2229] text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-[#0A0C10]/60">
                    <th className="p-4">Contato</th>
                    <th className="p-4">Telefone</th>
                    <th className="p-4">Grupo</th>
                    <th className="p-4 text-center">Mensagens Enviadas</th>
                    <th className="p-4">Último Envio / Campanhas</th>
                    <th className="p-4 text-right">Status de Frequência</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2229] text-xs">
                  {filteredAuditData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500 italic">
                        Nenhum contato encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditData.map(({ contact, successCount, logs: contactLogs }) => {
                      const lastLog = contactLogs[contactLogs.length - 1];
                      return (
                        <tr key={contact.id} className="hover:bg-[#1F2229]/50 transition-colors">
                          <td className="p-4 font-bold text-white flex items-center space-x-2">
                            <span>{contact.name || 'Sem nome'}</span>
                          </td>
                          <td className="p-4 font-mono text-[#A88B4B]">
                            {formatPhoneDisplay(contact.phone)}
                          </td>
                          <td className="p-4 text-gray-300">
                            <span className="px-2 py-0.5 rounded bg-[#0A0C10] border border-[#1F2229] text-[10px] text-gray-300">
                              {contact.group || 'Agenda de Contatos'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-mono font-bold text-xs ${
                              successCount === 0
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                : successCount === 1
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            }`}>
                              {successCount}
                            </span>
                          </td>
                          <td className="p-4 text-gray-300">
                            {successCount === 0 ? (
                              <span className="text-gray-500 italic">Nenhuma mensagem enviada ainda</span>
                            ) : (
                              <div className="space-y-0.5">
                                <div className="font-semibold text-white">
                                  {lastLog?.campaignTitle || 'Disparo Direto'}
                                </div>
                                <div className="text-[10px] text-gray-400">
                                  {lastLog?.sentAt ? new Date(lastLog.sentAt).toLocaleString('pt-BR') : 'Data não registrada'}
                                  {successCount > 1 && (
                                    <span className="text-amber-400 font-semibold ml-1.5">
                                      (+{successCount - 1} anterior{successCount > 2 ? 'es' : ''})
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            {successCount === 0 ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                🔴 Pendente (0)
                              </span>
                            ) : successCount === 1 ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                🟢 Ideal (1)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20" title="Contato recebeu múltiplos envios (potencial duplicado)">
                                🟡 Duplicado ({successCount})
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeSubTab === 'projects' ? (
        <div className="space-y-6 animate-fade-in">
          {/* Informational Banner */}
          <div className="bg-[#15181E] border border-[#1F2229] p-5 rounded-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center space-x-2">
                <FolderArchive className="w-5 h-5 text-[#A88B4B]" />
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  Gestão e Fechamento de Projetos (Ciclos de 15 Dias)
                </h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Cada projeto possui duração padrão de <strong>15 dias</strong> do início ao encerramento. Realize a contagem dos envios deste período, salve o histórico completo em uma pasta com o <strong>Nome do Projeto</strong> e zere os dados para iniciar o próximo ciclo de 15 dias com o sistema rápido e limpo!
              </p>
            </div>

            <div className="bg-[#0A0C10] border border-[#1F2229] p-3 rounded-lg text-right shrink-0">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold">Pastas Salvas</span>
              <span className="text-xl font-mono font-extrabold text-[#A88B4B]">{projectArchives.length} Projetos</span>
            </div>
          </div>

          {/* Current 15-Day Project Creation & Reset Form Card */}
          <div className="bg-[#15181E] border border-[#1F2229] p-6 rounded-xl shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F2229] pb-4">
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <FolderPlus className="w-4 h-4 text-[#A88B4B]" />
                  <span>Finalizar e Arquivar Projeto (Fechamento de Ciclo)</span>
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Selecione o período do ciclo, confira os números consolidados e guarde tudo com segurança.
                </p>
              </div>

              {/* Quick Period Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetProjectPreset(15)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#1A1D24] hover:bg-[#252830] border border-[#2A2E39] text-[#A88B4B] transition-all"
                >
                  ⚡ Ciclo 15 Dias
                </button>
                <button
                  type="button"
                  onClick={() => handleSetProjectPreset(7)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#1A1D24] hover:bg-[#252830] border border-[#2A2E39] text-gray-300 transition-all"
                >
                  7 Dias
                </button>
                <button
                  type="button"
                  onClick={() => handleSetProjectPreset(30)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#1A1D24] hover:bg-[#252830] border border-[#2A2E39] text-gray-300 transition-all"
                >
                  30 Dias
                </button>
                <button
                  type="button"
                  onClick={() => handleSetProjectPreset('all')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#1A1D24] hover:bg-[#252830] border border-[#2A2E39] text-emerald-400 transition-all"
                >
                  Histórico Completo
                </button>
              </div>
            </div>

            {/* 15-Day Counters Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#0A0C10] border border-[#1F2229] p-3.5 rounded-xl space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Envios no Período</span>
                <div className="text-xl font-mono font-extrabold text-emerald-400">
                  {stats15Days.sent} <span className="text-xs font-normal text-gray-500">/ {stats15Days.total}</span>
                </div>
              </div>

              <div className="bg-[#0A0C10] border border-[#1F2229] p-3.5 rounded-xl space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Taxa de Sucesso</span>
                <div className="text-xl font-mono font-extrabold text-[#A88B4B]">
                  {stats15Days.successRate}%
                </div>
              </div>

              <div className="bg-[#0A0C10] border border-[#1F2229] p-3.5 rounded-xl space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Contatos Atingidos</span>
                <div className="text-xl font-mono font-extrabold text-indigo-400">
                  {stats15Days.uniqueContactsCount}
                </div>
              </div>

              <div className="bg-[#0A0C10] border border-[#1F2229] p-3.5 rounded-xl space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Falhas / Pulados</span>
                <div className="text-xl font-mono font-extrabold text-red-400">
                  {stats15Days.failed + stats15Days.skipped}
                </div>
              </div>
            </div>

            {/* Chip Breakdown in 15 Days */}
            {Object.keys(stats15Days.chipCounts).length > 0 && (
              <div className="bg-[#0A0C10] border border-[#1F2229] p-3.5 rounded-xl space-y-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                  📱 Disparos por Chip de WhatsApp no Período Selecionado:
                </span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats15Days.chipCounts).map(([chip, count]) => (
                    <span key={chip} className="bg-[#15181E] border border-[#1F2229] text-gray-300 text-xs px-2.5 py-1 rounded-lg font-mono">
                      <strong className="text-emerald-400">{cleanChipName(chip)}:</strong> {count} msgs
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Inputs Form */}
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                      Nome do Projeto <span className="text-red-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setProjectNameInput(`Projeto ${projectStartDate} a ${projectEndDate} (${stats15Days.sent} envios)`)}
                      className="text-[10px] text-[#A88B4B] hover:underline font-bold flex items-center space-x-0.5"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Sugerir Nome</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={projectNameInput}
                    onChange={(e) => setProjectNameInput(e.target.value)}
                    placeholder="Ex: Campanha Especial - Turma 1"
                    className="w-full bg-[#0A0C10] border border-[#1F2229] hover:border-[#A88B4B]/50 focus:border-[#A88B4B] text-white text-xs font-bold rounded-lg px-3.5 py-2.5 focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                    Data de Início do Projeto
                  </label>
                  <input
                    type="date"
                    value={projectStartDate}
                    onChange={(e) => setProjectStartDate(e.target.value)}
                    className="w-full bg-[#0A0C10] border border-[#1F2229] hover:border-[#A88B4B]/50 focus:border-[#A88B4B] text-white text-xs font-mono font-bold rounded-lg px-3.5 py-2.5 focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                    Data de Encerramento
                  </label>
                  <input
                    type="date"
                    value={projectEndDate}
                    onChange={(e) => setProjectEndDate(e.target.value)}
                    className="w-full bg-[#0A0C10] border border-[#1F2229] hover:border-[#A88B4B]/50 focus:border-[#A88B4B] text-white text-xs font-mono font-bold rounded-lg px-3.5 py-2.5 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Checkbox to reset history */}
              <div className="bg-[#0A0C10] border border-[#1F2229] p-3.5 rounded-xl flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="resetAfterArchive"
                  checked={resetAfterArchive}
                  onChange={(e) => setResetAfterArchive(e.target.checked)}
                  className="rounded bg-[#15181E] border-gray-700 text-[#A88B4B] focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="resetAfterArchive" className="text-xs text-gray-300 cursor-pointer select-none">
                  <strong className="text-white font-bold">Começar tudo do zero:</strong> Limpar disparos do histórico ativo após salvar na pasta para iniciar o próximo projeto com a agenda e envios zerados.
                </label>
              </div>

              {/* Archive Action Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!projectNameInput.trim()) {
                      alert('Por favor, informe o Nome do Projeto para salvar a pasta no histórico.');
                      return;
                    }
                    if (onCreateProjectArchive) {
                      onCreateProjectArchive(projectNameInput, projectStartDate, projectEndDate, resetAfterArchive);
                      setProjectNameInput('');
                    }
                  }}
                  className="bg-[#A88B4B] hover:bg-[#C5A968] text-slate-950 font-extrabold text-xs uppercase tracking-widest px-6 py-3 rounded-lg shadow-lg shadow-[#A88B4B]/20 transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <FolderCheck className="w-4 h-4" />
                  <span>💾 Finalizar e Arquivar Projeto em Pasta Salva</span>
                </button>
              </div>
            </div>
          </div>

          {/* List of Saved Project Archives */}
          <div className="bg-[#15181E] border border-[#1F2229] p-6 rounded-xl shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F2229] pb-4">
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <FolderArchive className="w-4 h-4 text-[#A88B4B]" />
                  <span>Pastas de Histórico de Projetos ({projectArchives.length})</span>
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Consulte, baixe relatórios PDF/CSV e visualize todos os projetos e ciclos já concluídos.
                </p>
              </div>

              {projectArchives.length > 0 && (
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={archivedProjectSearch}
                    onChange={(e) => setArchivedProjectSearch(e.target.value)}
                    placeholder="Buscar pasta do projeto..."
                    className="w-full bg-[#0A0C10] border border-[#1F2229] text-white text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-[#A88B4B]"
                  />
                </div>
              )}
            </div>

            {projectArchives.length === 0 ? (
              <div className="py-12 text-center text-gray-500 space-y-3">
                <Folder className="w-12 h-12 mx-auto text-gray-600 stroke-[1.5]" />
                <p className="text-xs italic">Nenhum projeto arquivado ainda.</p>
                <p className="text-[11px] text-gray-600 max-w-md mx-auto">
                  Preencha o formulário acima ao concluir seus envios para consolidar tudo em uma pasta exclusiva e manter seu histórico seguro!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projectArchives
                  .filter((p) => p.name.toLowerCase().includes(archivedProjectSearch.toLowerCase()))
                  .map((project) => {
                    const total = project.totalSent + project.totalFailed + project.totalSkipped;
                    const successPct = total > 0 ? Math.round((project.totalSent / total) * 100) : 0;

                    return (
                      <div
                        key={project.id}
                        className="bg-[#0A0C10] border border-[#1F2229] hover:border-[#A88B4B]/50 p-4 rounded-xl transition-all space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center space-x-2">
                              <Folder className="w-5 h-5 text-[#A88B4B] shrink-0" />
                              <h5 className="text-sm font-bold text-white truncate">{project.name}</h5>
                            </div>
                            <span className="text-[10px] font-mono text-gray-500 bg-[#15181E] border border-[#1F2229] px-2 py-0.5 rounded shrink-0">
                              {new Date(project.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>

                          <div className="text-xs text-gray-400 font-mono flex items-center space-x-2">
                            <span>📅 Período: {project.startDate} até {project.endDate}</span>
                          </div>

                          {/* Stats Badges */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
                              🚀 {project.totalSent} envios
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-[#A88B4B]/10 text-[#A88B4B] border border-[#A88B4B]/30 px-2 py-0.5 rounded">
                              🎯 {successPct}% sucesso
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded">
                              👤 {project.totalContacts} contatos
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#1F2229]">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedArchivedProject(project);
                              setProjectLogSearch('');
                              setProjectLogFilter('all');
                            }}
                            className="bg-[#15181E] hover:bg-[#1F2229] text-white border border-[#1F2229] px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#A88B4B]" />
                            <span>Ver Pasta / Logs</span>
                          </button>

                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const total = project.totalSent + project.totalFailed + project.totalSkipped;
                                const successPct = total > 0 ? Math.round((project.totalSent / total) * 100) : 0;
                                const chipRows = Object.entries(project.chipStats || {})
                                  .map(([chip, count]) => `<li><strong>${chip}:</strong> ${count} disparos</li>`)
                                  .join('');

                                const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${project.name} - Relatório de Fechamento</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; margin: 30px; font-size: 12px; background: #fff; }
    .header { border-bottom: 3px solid #A88B4B; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    h1 { font-size: 20px; color: #A88B4B; margin: 0; }
    .badge { background: #A88B4B; color: #000; font-weight: bold; padding: 4px 10px; border-radius: 4px; font-size: 11px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .card { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 12px; }
    .card-label { font-size: 10px; text-transform: uppercase; color: #6c757d; font-weight: bold; }
    .card-value { font-size: 18px; font-weight: bold; color: #212529; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
    th, td { border: 1px solid #dee2e6; padding: 8px; text-align: left; }
    th { background-color: #f1f3f5; color: #495057; font-weight: bold; }
    tr:nth-child(even) { background-color: #fafbfc; }
    .status-enviado { color: #2b8a3e; font-weight: bold; }
    .status-falha { color: #c92a2a; font-weight: bold; }
    .status-pulado { color: #e67700; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${project.name}</h1>
      <p style="margin: 5px 0 0 0; color: #666;">Período: ${project.startDate} a ${project.endDate} • Fechado em: ${new Date(project.createdAt).toLocaleString('pt-BR')}</p>
    </div>
    <div class="badge">PROJETO CONCLUÍDO</div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-label">Envios Efetuados</div>
      <div class="card-value" style="color: #2b8a3e;">${project.totalSent}</div>
    </div>
    <div class="card">
      <div class="card-label">Taxa de Sucesso</div>
      <div class="card-value" style="color: #A88B4B;">${successPct}%</div>
    </div>
    <div class="card">
      <div class="card-label">Contatos Atingidos</div>
      <div class="card-value" style="color: #3b5bdb;">${project.totalContacts}</div>
    </div>
    <div class="card">
      <div class="card-label">Falhas / Pulados</div>
      <div class="card-value" style="color: #c92a2a;">${project.totalFailed + project.totalSkipped}</div>
    </div>
  </div>

  ${chipRows ? `<div style="margin-bottom: 20px; background: #f8f9fa; padding: 10px 15px; border-radius: 6px;"><strong>Distribuição por Chip:</strong> <ul style="margin: 5px 0 0 0; padding-left: 20px;">${chipRows}</ul></div>` : ''}

  <h3>Auditoria de Disparos (${project.logs.length} registros)</h3>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Contato</th>
        <th>Telefone</th>
        <th>Campanha</th>
        <th>Data/Hora Envio</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${project.logs.map((l, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${l.contactName || 'Sem nome'}</strong></td>
          <td>${formatPhoneDisplay(l.phone)}</td>
          <td>${l.campaignTitle}</td>
          <td>${l.sentAt ? new Date(l.sentAt).toLocaleString('pt-BR') : '—'}</td>
          <td class="status-${l.status}">${l.status.toUpperCase()}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`;
                                const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                                downloadFileSafely(blob, `relatorio_${project.name.replace(/\s+/g, '_')}.html`);
                              }}
                              className="bg-[#15181E] hover:bg-[#1F2229] text-gray-300 hover:text-white border border-[#1F2229] p-1.5 rounded text-xs transition-all cursor-pointer"
                              title="Baixar Relatório HTML / Imprimir PDF"
                            >
                              <Printer className="w-3.5 h-3.5 text-[#A88B4B]" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const headers = ['Campanha', 'Contato', 'Telefone', 'Status', 'Data Envio', 'Mensagem'];
                                const rows = project.logs.map((l) => [
                                  `"${l.campaignTitle}"`,
                                  `"${l.contactName}"`,
                                  `"${l.phone}"`,
                                  `"${l.status}"`,
                                  `"${l.sentAt ? new Date(l.sentAt).toLocaleString('pt-BR') : '—'}"`,
                                  `"${l.messageText.replace(/"/g, '""')}"`,
                                ]);
                                const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
                                const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8' });
                                downloadFileSafely(blob, `projeto_${project.name.replace(/\s+/g, '_')}_logs.csv`);
                              }}
                              className="bg-[#15181E] hover:bg-[#1F2229] text-gray-300 hover:text-white border border-[#1F2229] p-1.5 rounded text-xs transition-all cursor-pointer"
                              title="Baixar CSV do Projeto"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Tem certeza que deseja excluir a pasta do projeto "${project.name}" do histórico?`)) {
                                  if (onDeleteProjectArchive) {
                                    onDeleteProjectArchive(project.id);
                                  }
                                }
                              }}
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 p-1.5 rounded text-xs transition-all cursor-pointer"
                              title="Excluir Pasta do Histórico"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      ) : activeSubTab === 'hourly' ? (
        <div className="space-y-6 animate-fade-in">
          {/* Hourly Filter & Date Controls */}
          <div className="bg-[#15181E] border border-[#1F2229] p-4 rounded-xl shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-[#A88B4B]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Selecione o Período Horário
                </h3>
              </div>

              {/* Period Selectors */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setHourlyPeriod('today')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    hourlyPeriod === 'today'
                      ? 'bg-[#A88B4B] text-slate-950 font-extrabold'
                      : 'bg-[#0A0C10] text-gray-300 border border-[#1F2229] hover:border-[#A88B4B]/40'
                  }`}
                >
                  📆 Hoje
                </button>
                <button
                  type="button"
                  onClick={() => setHourlyPeriod('last24h')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    hourlyPeriod === 'last24h'
                      ? 'bg-[#A88B4B] text-slate-950 font-extrabold'
                      : 'bg-[#0A0C10] text-gray-300 border border-[#1F2229] hover:border-[#A88B4B]/40'
                  }`}
                >
                  ⏱️ Últimas 24h
                </button>
                <button
                  type="button"
                  onClick={() => setHourlyPeriod('yesterday')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    hourlyPeriod === 'yesterday'
                      ? 'bg-[#A88B4B] text-slate-950 font-extrabold'
                      : 'bg-[#0A0C10] text-gray-300 border border-[#1F2229] hover:border-[#A88B4B]/40'
                  }`}
                >
                  ⏮️ Ontem
                </button>
                <button
                  type="button"
                  onClick={() => setHourlyPeriod('custom')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    hourlyPeriod === 'custom'
                      ? 'bg-[#A88B4B] text-slate-950 font-extrabold'
                      : 'bg-[#0A0C10] text-gray-300 border border-[#1F2229] hover:border-[#A88B4B]/40'
                  }`}
                >
                  📅 Data Específica
                </button>
              </div>
            </div>

            {/* Custom Date Input & Hide Empty Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#1F2229]">
              {hourlyPeriod === 'custom' ? (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-400 font-semibold">Data:</span>
                  <input
                    type="date"
                    value={hourlyCustomDate}
                    onChange={(e) => setHourlyCustomDate(e.target.value)}
                    className="bg-[#0A0C10] border border-[#1F2229] text-white text-xs font-mono font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#A88B4B]"
                  />
                </div>
              ) : (
                <div className="text-xs text-gray-400">
                  Exibindo agrupamento de disparos por hora para o período selecionado.
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center space-x-2 cursor-pointer text-xs text-gray-300 hover:text-white bg-[#0A0C10] border border-[#1F2229] hover:border-[#A88B4B]/40 px-3 py-1.5 rounded-lg transition-all">
                  <input
                    type="checkbox"
                    checked={excludeNightHours}
                    onChange={(e) => setExcludeNightHours(e.target.checked)}
                    className="rounded bg-[#15181E] border-gray-700 text-[#A88B4B] focus:ring-0 cursor-pointer"
                  />
                  <span className="flex items-center space-x-1.5">
                    <span>🌙 Excluir horário (22h às 06h)</span>
                    <span className="text-[10px] text-[#A88B4B] font-mono font-bold bg-[#A88B4B]/10 border border-[#A88B4B]/30 px-1.5 py-0.5 rounded">
                      06h-22h
                    </span>
                  </span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer text-xs text-gray-300 hover:text-white bg-[#0A0C10] border border-[#1F2229] hover:border-[#A88B4B]/40 px-3 py-1.5 rounded-lg transition-all">
                  <input
                    type="checkbox"
                    checked={hideEmptyHours}
                    onChange={(e) => setHideEmptyHours(e.target.checked)}
                    className="rounded bg-[#0A0C10] border-gray-700 text-[#A88B4B] focus:ring-0 cursor-pointer"
                  />
                  <span>Ocultar horas sem disparos</span>
                </label>
              </div>
            </div>
          </div>

          {/* Hourly Metrics Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#15181E] border border-[#1F2229] rounded-xl p-4 shadow-lg space-y-1">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                Total Enviado no Período
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-mono font-extrabold text-emerald-400">
                  {hourlyData.totalSentInPeriod}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  / {hourlyData.totalInPeriod} total
                </span>
              </div>
            </div>

            <div className="bg-[#15181E] border border-[#1F2229] rounded-xl p-4 shadow-lg space-y-1">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                Pico de Envios (Hora de Ouro)
              </span>
              <div className="text-sm font-bold text-[#A88B4B]">
                {hourlyData.peakHour.total > 0 ? (
                  <span>
                    {hourlyData.peakHour.hourLabel}{' '}
                    <span className="text-xs font-mono font-normal text-gray-300">
                      ({hourlyData.peakHour.total} msgs)
                    </span>
                  </span>
                ) : (
                  <span className="text-gray-500 italic text-xs">Nenhum envio</span>
                )}
              </div>
            </div>

            <div className="bg-[#15181E] border border-[#1F2229] rounded-xl p-4 shadow-lg space-y-1">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                Horas Ativas no Dia
              </span>
              <div className="text-2xl font-mono font-extrabold text-white">
                {hourlyData.activeHoursCount}{' '}
                <span className="text-xs text-gray-500 font-sans">
                  / {excludeNightHours ? '15' : '24'} horas
                </span>
              </div>
            </div>

            <div className="bg-[#15181E] border border-[#1F2229] rounded-xl p-4 shadow-lg space-y-1">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                Média por Hora Ativa
              </span>
              <div className="text-2xl font-mono font-extrabold text-indigo-400">
                {hourlyData.activeHoursCount > 0
                  ? (hourlyData.totalSentInPeriod / hourlyData.activeHoursCount).toFixed(1)
                  : '0'}
                <span className="text-xs text-gray-500 font-sans ml-1">msgs/hora</span>
              </div>
            </div>
          </div>

          {/* Hourly Slots Table / Cards */}
          <div className="bg-[#15181E] border border-[#1F2229] rounded-xl p-4 shadow-lg space-y-4">
            {copiedNotice && (
              <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs font-semibold p-3 rounded-lg flex items-center justify-between animate-fade-in">
                <span>{copiedNotice}</span>
                <button
                  type="button"
                  onClick={() => setCopiedNotice(null)}
                  className="text-emerald-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#1F2229] pb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-200 flex items-center space-x-2">
                  <span>📊 Detalhamento de Hora em Hora</span>
                  {excludeNightHours ? (
                    <span className="text-[#A88B4B] font-mono normal-case text-[11px] bg-[#0A0C10] border border-[#1F2229] px-2 py-0.5 rounded">
                      06:00 - 21:00
                    </span>
                  ) : (
                    <span className="text-gray-400 font-mono normal-case text-[11px] bg-[#0A0C10] border border-[#1F2229] px-2 py-0.5 rounded">
                      24h Completo
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Relatório completo de envios divididos de 1 em 1 hora.
                </p>
              </div>

              {/* Action Buttons for Report Export */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyHourlyReport}
                  className="bg-[#A88B4B] hover:bg-[#b89b5b] text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs shadow-md transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
                >
                  <span>📋 Copiar Relatório (06h-22h)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadHourlyReport}
                  className="bg-[#0A0C10] hover:bg-[#1A1D23] text-gray-200 hover:text-white border border-[#1F2229] hover:border-[#A88B4B]/50 font-bold px-3 py-1.5 rounded-lg text-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#A88B4B]" />
                  <span>Baixar TXT</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {hourlyData.breakdown
                .filter((slot) => !hideEmptyHours || slot.total > 0)
                .map((slot) => {
                  const isExpanded = expandedHour === slot.hour;
                  const barWidthPercent = Math.round((slot.total / hourlyData.maxTotalInAnHour) * 100);

                  return (
                    <div
                      key={slot.hour}
                      className={`bg-[#0A0C10] border transition-all rounded-xl overflow-hidden ${
                        slot.total > 0
                          ? 'border-[#1F2229] hover:border-[#A88B4B]/50'
                          : 'border-[#15181E] opacity-60'
                      }`}
                    >
                      {/* Slot Header Bar */}
                      <div
                        onClick={() => {
                          if (slot.total > 0) {
                            setExpandedHour(isExpanded ? null : slot.hour);
                          }
                        }}
                        className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          slot.total > 0 ? 'cursor-pointer hover:bg-[#15181E]/50' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3 shrink-0">
                          <div className="p-2 bg-[#15181E] border border-[#1F2229] rounded-lg text-[#A88B4B] font-mono text-xs font-bold">
                            {slot.hour.toString().padStart(2, '0')}:00
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">
                              {slot.hourLabel}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400">
                              {slot.total} disparo(s) registrado(s)
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="flex-1 max-w-md mx-auto w-full px-2">
                          {slot.total > 0 ? (
                            <div className="space-y-1">
                              <div className="w-full bg-[#15181E] h-2 rounded-full overflow-hidden flex">
                                {slot.sent > 0 && (
                                  <div
                                    style={{ width: `${(slot.sent / slot.total) * barWidthPercent}%` }}
                                    className="bg-emerald-500 h-full"
                                    title={`${slot.sent} enviadas`}
                                  />
                                )}
                                {slot.skipped > 0 && (
                                  <div
                                    style={{ width: `${(slot.skipped / slot.total) * barWidthPercent}%` }}
                                    className="bg-amber-500 h-full"
                                    title={`${slot.skipped} puladas`}
                                  />
                                )}
                                {slot.failed > 0 && (
                                  <div
                                    style={{ width: `${(slot.failed / slot.total) * barWidthPercent}%` }}
                                    className="bg-red-500 h-full"
                                    title={`${slot.failed} falhas`}
                                  />
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-[10px] text-gray-600 font-mono italic text-center">
                              Sem envios nesta faixa
                            </div>
                          )}
                        </div>

                        {/* Status Count Badges & Chevron */}
                        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                          {slot.sent > 0 && (
                            <span className="text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded">
                              {slot.sent} enviadas
                            </span>
                          )}
                          {slot.skipped > 0 && (
                            <span className="text-[10px] font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded">
                              {slot.skipped} puladas
                            </span>
                          )}
                          {slot.failed > 0 && (
                            <span className="text-[10px] font-mono font-bold bg-red-500/10 border border-red-500/30 text-red-400 px-2 py-0.5 rounded">
                              {slot.failed} falhas
                            </span>
                          )}

                          {slot.total > 0 && (
                            <button
                              type="button"
                              className="text-gray-400 hover:text-white p-1"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded Contact List for this Hour */}
                      {isExpanded && slot.logs.length > 0 && (
                        <div className="border-t border-[#1F2229] bg-[#15181E]/70 p-3 space-y-2 animate-fade-in">
                          <span className="text-[10px] uppercase font-bold text-[#A88B4B] block tracking-wider">
                            Lista de Disparos entre {slot.hourLabel}:
                          </span>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-[#1F2229] text-[10px] uppercase font-mono text-gray-400">
                                  <th className="py-1.5 px-2">Contato</th>
                                  <th className="py-1.5 px-2">Telefone</th>
                                  <th className="py-1.5 px-2">Campanha</th>
                                  <th className="py-1.5 px-2">Chip</th>
                                  <th className="py-1.5 px-2 text-right">Hora Envio</th>
                                  <th className="py-1.5 px-2 text-right">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#1F2229]/50">
                                {slot.logs.map((item, idx) => (
                                  <tr key={item.id || idx} className="hover:bg-[#1F2229]/40">
                                    <td className="py-2 px-2 font-bold text-white">
                                      {item.contactName || 'Sem nome'}
                                    </td>
                                    <td className="py-2 px-2 font-mono text-gray-300">
                                      {formatPhoneDisplay(item.phone)}
                                    </td>
                                    <td className="py-2 px-2 text-gray-400 max-w-[150px] truncate">
                                      {item.campaignTitle}
                                    </td>
                                    <td className="py-2 px-2 text-emerald-400 font-mono text-[11px]">
                                      📱 {cleanChipName(item.chipName || 'Business')}
                                    </td>
                                    <td className="py-2 px-2 font-mono text-gray-400 text-right">
                                      {item.sentAt ? new Date(item.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                        item.status === 'enviado'
                                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                          : item.status === 'pulado'
                                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                          : 'bg-red-500/10 text-red-400 border border-red-500/30'
                                      }`}>
                                        {item.status.toUpperCase()}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      ) : (
        <>
      {/* Summary Cards: Hoje, Últimas 24h, Semana, Mês */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Today Card */}
        <div className="bg-[#15181E] border border-[#1F2229] hover:border-[#A88B4B]/30 rounded-xl p-4 shadow-lg transition-all space-y-3">
          <div className="flex items-center justify-between border-b border-[#1F2229] pb-2.5">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-[#A88B4B]" />
              <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">Hoje (Dia)</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#A88B4B] bg-[#0A0C10] border border-[#1F2229] px-2 py-0.5 rounded">
              {todayStats.total} Total
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            <button
              onClick={() => setDetailModal({ title: 'Mensagens Enviadas - Hoje', status: 'enviado', logs: todayStats.sentLogs })}
              className="bg-[#0A0C10] hover:bg-[#1A1D23] border border-[#1F2229] hover:border-emerald-500/50 p-2 rounded transition-all group text-left sm:text-center cursor-pointer"
            >
              <span className="block text-emerald-400 font-bold font-mono text-sm group-hover:scale-105 transition-transform">{todayStats.sent}</span>
              <span className="text-[9px] text-gray-500 group-hover:text-emerald-400 uppercase tracking-wider font-semibold">Enviadas</span>
            </button>
            <button
              onClick={() => setDetailModal({ title: 'Mensagens Puladas - Hoje', status: 'pulado', logs: todayStats.skippedLogs })}
              className="bg-[#0A0C10] hover:bg-[#1A1D23] border border-[#1F2229] hover:border-amber-500/50 p-2 rounded transition-all group text-left sm:text-center cursor-pointer"
            >
              <span className="block text-amber-400 font-bold font-mono text-sm group-hover:scale-105 transition-transform">{todayStats.skipped}</span>
              <span className="text-[9px] text-gray-500 group-hover:text-amber-400 uppercase tracking-wider font-semibold">Puladas</span>
            </button>
            <button
              onClick={() => setDetailModal({ title: 'Mensagens Canceladas - Hoje', status: 'falha', logs: todayStats.failedLogs })}
              className="bg-[#0A0C10] hover:bg-[#1A1D23] border border-[#1F2229] hover:border-red-500/50 p-2 rounded transition-all group text-left sm:text-center cursor-pointer"
            >
              <span className="block text-red-400 font-bold font-mono text-sm group-hover:scale-105 transition-transform">{todayStats.failed}</span>
              <span className="text-[9px] text-gray-500 group-hover:text-red-400 uppercase tracking-wider font-semibold">Canceladas</span>
            </button>
          </div>
        </div>

        {/* 24 Hours Card */}
        <div className="bg-[#15181E] border border-[#1F2229] hover:border-[#A88B4B]/30 rounded-xl p-4 shadow-lg transition-all space-y-3">
          <div className="flex items-center justify-between border-b border-[#1F2229] pb-2.5">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-[#A88B4B]" />
              <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">Últimas 24h</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#A88B4B] bg-[#0A0C10] border border-[#1F2229] px-2 py-0.5 rounded">
              {last24hStats.total} Total
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            <button
              onClick={() => setDetailModal({ title: 'Mensagens Enviadas - Últimas 24h', status: 'enviado', logs: last24hStats.sentLogs })}
              className="bg-[#0A0C10] hover:bg-[#1A1D23] border border-[#1F2229] hover:border-emerald-500/50 p-2 rounded transition-all group text-left sm:text-center cursor-pointer"
            >
              <span className="block text-emerald-400 font-bold font-mono text-sm group-hover:scale-105 transition-transform">{last24hStats.sent}</span>
              <span className="text-[9px] text-gray-500 group-hover:text-emerald-400 uppercase tracking-wider font-semibold">Enviadas</span>
            </button>
            <button
              onClick={() => setDetailModal({ title: 'Mensagens Puladas - Últimas 24h', status: 'pulado', logs: last24hStats.skippedLogs })}
              className="bg-[#0A0C10] hover:bg-[#1A1D23] border border-[#1F2229] hover:border-amber-500/50 p-2 rounded transition-all group text-left sm:text-center cursor-pointer"
            >
              <span className="block text-amber-400 font-bold font-mono text-sm group-hover:scale-105 transition-transform">{last24hStats.skipped}</span>
              <span className="text-[9px] text-gray-500 group-hover:text-amber-400 uppercase tracking-wider font-semibold">Puladas</span>
            </button>
            <button
              onClick={() => setDetailModal({ title: 'Mensagens Canceladas - Últimas 24h', status: 'falha', logs: last24hStats.failedLogs })}
              className="bg-[#0A0C10] hover:bg-[#1A1D23] border border-[#1F2229] hover:border-red-500/50 p-2 rounded transition-all group text-left sm:text-center cursor-pointer"
            >
              <span className="block text-red-400 font-bold font-mono text-sm group-hover:scale-105 transition-transform">{last24hStats.failed}</span>
              <span className="text-[9px] text-gray-500 group-hover:text-red-400 uppercase tracking-wider font-semibold">Canceladas</span>
            </button>
          </div>
        </div>

        {/* Week Card */}
        <div className="bg-[#15181E] border border-[#1F2229] hover:border-[#A88B4B]/30 rounded-xl p-4 shadow-lg transition-all space-y-3">
          <div className="flex items-center justify-between border-b border-[#1F2229] pb-2.5">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-[#A88B4B]" />
              <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">Acumulado Semana</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#A88B4B] bg-[#0A0C10] border border-[#1F2229] px-2 py-0.5 rounded">
              {weekStats.total} Total
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            <button
              onClick={() => setDetailModal({ title: 'Mensagens Enviadas - Semana', status: 'enviado', logs: weekStats.sentLogs })}
              className="bg-[#0A0C10] hover:bg-[#1A1D23] border border-[#1F2229] hover:border-emerald-500/50 p-2 rounded transition-all group text-left sm:text-center cursor-pointer"
            >
              <span className="block text-emerald-400 font-bold font-mono text-sm group-hover:scale-105 transition-transform">{weekStats.sent}</span>
              <span className="text-[9px] text-gray-500 group-hover:text-emerald-400 uppercase tracking-wider font-semibold">Enviadas</span>
            </button>
            <button
              onClick={() => setDetailModal({ title: 'Mensagens Puladas - Semana', status: 'pulado', logs: weekStats.skippedLogs })}
              className="bg-[#0A0C10] hover:bg-[#1A1D23] border border-[#1F2229] hover:border-amber-500/50 p-2 rounded transition-all group text-left sm:text-center cursor-pointer"
            >
              <span className="block text-amber-400 font-bold font-mono text-sm group-hover:scale-105 transition-transform">{weekStats.skipped}</span>
              <span className="text-[9px] text-gray-500 group-hover:text-amber-400 uppercase tracking-wider font-semibold">Puladas</span>
            </button>
            <button
              onClick={() => setDetailModal({ title: 'Mensagens Canceladas - Semana', status: 'falha', logs: weekStats.failedLogs })}
              className="bg-[#0A0C10] hover:bg-[#1A1D23] border border-[#1F2229] hover:border-red-500/50 p-2 rounded transition-all group text-left sm:text-center cursor-pointer"
            >
              <span className="block text-red-400 font-bold font-mono text-sm group-hover:scale-105 transition-transform">{weekStats.failed}</span>
              <span className="text-[9px] text-gray-500 group-hover:text-red-400 uppercase tracking-wider font-semibold">Canceladas</span>
            </button>
          </div>
        </div>

        {/* Month Card */}
        <div className="bg-[#15181E] border border-[#1F2229] hover:border-[#A88B4B]/30 rounded-xl p-4 shadow-lg transition-all space-y-3">
          <div className="flex items-center justify-between border-b border-[#1F2229] pb-2.5">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-[#A88B4B]" />
              <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">Acumulado Mês</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#A88B4B] bg-[#0A0C10] border border-[#1F2229] px-2 py-0.5 rounded">
              {monthStats.total} Total
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            <button
              onClick={() => setDetailModal({ title: 'Mensagens Enviadas - Mês', status: 'enviado', logs: monthStats.sentLogs })}
              className="bg-[#0A0C10] hover:bg-[#1A1D23] border border-[#1F2229] hover:border-emerald-500/50 p-2 rounded transition-all group text-left sm:text-center cursor-pointer"
            >
              <span className="block text-emerald-400 font-bold font-mono text-sm group-hover:scale-105 transition-transform">{monthStats.sent}</span>
              <span className="text-[9px] text-gray-500 group-hover:text-emerald-400 uppercase tracking-wider font-semibold">Enviadas</span>
            </button>
            <button
              onClick={() => setDetailModal({ title: 'Mensagens Puladas - Mês', status: 'pulado', logs: monthStats.skippedLogs })}
              className="bg-[#0A0C10] hover:bg-[#1A1D23] border border-[#1F2229] hover:border-amber-500/50 p-2 rounded transition-all group text-left sm:text-center cursor-pointer"
            >
              <span className="block text-amber-400 font-bold font-mono text-sm group-hover:scale-105 transition-transform">{monthStats.skipped}</span>
              <span className="text-[9px] text-gray-500 group-hover:text-amber-400 uppercase tracking-wider font-semibold">Puladas</span>
            </button>
            <button
              onClick={() => setDetailModal({ title: 'Mensagens Canceladas - Mês', status: 'falha', logs: monthStats.failedLogs })}
              className="bg-[#0A0C10] hover:bg-[#1A1D23] border border-[#1F2229] hover:border-red-500/50 p-2 rounded transition-all group text-left sm:text-center cursor-pointer"
            >
              <span className="block text-red-400 font-bold font-mono text-sm group-hover:scale-105 transition-transform">{monthStats.failed}</span>
              <span className="text-[9px] text-gray-500 group-hover:text-red-400 uppercase tracking-wider font-semibold">Canceladas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Retractable Toggle Bar for Detailed List */}
      <div className="bg-[#15181E] border border-[#1F2229] hover:border-[#A88B4B]/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg transition-all">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-[#0A0C10] border border-[#1F2229] rounded-lg text-[#A88B4B]">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <span>Lista e Relatório Detalhado de Disparos</span>
              <span className="text-[10px] font-mono font-bold bg-[#0A0C10] text-[#A88B4B] border border-[#1F2229] px-2 py-0.5 rounded">
                {filteredLogs.length} registro(s)
              </span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {isTableExpanded
                ? 'Visualizando tabela completa com filtros de busca e status.'
                : 'A lista está retraída para economizar espaço. Clique em Expandir para visualizar a tabela detalhada.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsTableExpanded(!isTableExpanded)}
          className="bg-[#0A0C10] hover:bg-[#1A1D23] text-[#A88B4B] border border-[#1F2229] hover:border-[#A88B4B]/50 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow shrink-0 self-start sm:self-auto"
        >
          <span>{isTableExpanded ? 'Retrair Lista' : 'Expandir Lista Detalhada'}</span>
          {isTableExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isTableExpanded && (
        <div className="space-y-4 animate-fade-in">
          {/* Filter and Search */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por contato, telefone ou campanha..."
                className="w-full bg-[#15181E] border border-[#1F2229] rounded-lg pl-10 pr-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-[#A88B4B]"
              />
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-[#15181E] border border-[#1F2229] rounded-lg px-3 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-[#A88B4B]"
              >
                <option value="all">Todos os Status</option>
                <option value="enviado">Enviados com Sucesso</option>
                <option value="pulado">Pulados / Cancelados</option>
                <option value="falha">Falhas</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#15181E] border border-[#1F2229] rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0F1115] text-gray-400 font-semibold uppercase tracking-widest border-b border-[#1F2229] text-[10px]">
                  <tr>
                    <th className="p-4 w-10 text-center">
                      <button onClick={handleSelectAll} className="text-gray-400 hover:text-white">
                        {filteredLogs.length > 0 && selectedIds.length === filteredLogs.length ? (
                          <CheckSquare className="w-4 h-4 text-[#A88B4B]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="p-4">Campanha</th>
                    <th className="p-4">Contato</th>
                    <th className="p-4 whitespace-nowrap">Telefone</th>
                    <th className="p-4 hidden md:table-cell">Data/Horário</th>
                    <th className="p-4 hidden lg:table-cell">Mensagem Enviada</th>
                    <th className="p-4 text-right">Status / Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2229] text-gray-300">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500">
                        Nenhum registro de envio localizado.
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((l) => {
                      const isSelected = selectedIds.includes(l.id);
                      return (
                        <tr key={l.id} className={`hover:bg-[#1A1D23] transition-colors ${isSelected ? 'bg-[#A88B4B]/5' : ''}`}>
                          <td className="p-4 text-center">
                            <button onClick={() => handleToggleSelect(l.id)} className="text-gray-400 hover:text-white">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-[#A88B4B]" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                          <td className="p-4 font-semibold text-white">
                            <div>{l.campaignTitle}</div>
                            <div className="text-gray-500 font-mono text-[10px] font-normal md:hidden mt-0.5 mb-1">
                              {l.sentAt ? new Date(l.sentAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                            </div>
                            <div className="relative mt-1 inline-block">
                              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono font-normal rounded px-1.5 py-0.5">
                                 📱 {cleanChipName(l.chipName || l.chipId || 'Business')}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-gray-200 font-medium">{l.contactName || 'Sem nome'}</td>
                          <td className="p-4 font-mono font-medium text-[#A88B4B]">
                            {formatPhoneDisplay(l.phone)}
                          </td>
                          <td className="p-4 text-gray-500 font-mono text-[11px] hidden md:table-cell whitespace-nowrap">
                            {l.sentAt ? new Date(l.sentAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td className="p-4 max-w-xs hidden lg:table-cell">
                            <p className="line-clamp-2 text-gray-400 font-sans text-[11px] italic">
                              "{l.messageText}"
                            </p>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex flex-wrap sm:flex-col items-end gap-1.5 justify-end">
                              {(() => {
                                if (l.status === 'pulado' && l.notes && l.notes.startsWith('Ação:')) {
                                  const actionText = l.notes.replace('Ação: ', '');
                                  const isDeleteAction = actionText.includes('Sem WhatsApp') || actionText.includes('Já correu') || actionText.includes('Sem Carro');
                                  return (
                                    <span className={`text-[9px] px-2 py-0.5 rounded font-extrabold uppercase tracking-widest border ${
                                      isDeleteAction 
                                        ? 'bg-red-500/10 text-red-400 border-red-500/30' 
                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                    }`}>
                                      {actionText}
                                    </span>
                                  );
                                }
                                return (
                                  <span
                                    className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest ${
                                      l.status === 'enviado'
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                        : l.status === 'ignorado'
                                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                        : l.status === 'falha'
                                        ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                    }`}
                                  >
                                    {l.status === 'enviado' ? 'Enviado' : l.status === 'ignorado' ? 'Já Enviado' : l.status === 'falha' ? 'Falha' : 'Pulado'}
                                  </span>
                                );
                              })()}
                              <button
                                onClick={() => {
                                  setLogToDelete(l);
                                }}
                                className="text-gray-500 hover:text-red-400 p-1 rounded transition-colors"
                                title="Excluir Registro"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* Delete Scope Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#15181E] border border-[#1F2229] rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 border-b border-[#1F2229] pb-4">
              <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Excluir Registros do Histórico</h3>
                <p className="text-xs text-gray-400">Escolha quais dados de disparos deseja remover:</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {/* Option 1: Selected */}
              <label
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedIds.length === 0
                    ? 'opacity-40 cursor-not-allowed border-[#1F2229] bg-[#0A0C10]'
                    : deleteScope === 'selected'
                    ? 'border-red-500 bg-red-500/10 text-white'
                    : 'border-[#1F2229] bg-[#0A0C10] hover:border-gray-700 text-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="deleteScope"
                    value="selected"
                    disabled={selectedIds.length === 0}
                    checked={deleteScope === 'selected'}
                    onChange={() => setDeleteScope('selected')}
                    className="text-red-500 focus:ring-0"
                  />
                  <div>
                    <span className="block text-xs font-bold">Registros Selecionados na Tabela</span>
                    <span className="text-[10px] text-gray-400">Excluir {selectedIds.length} item(ns) marcados</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-red-400">{selectedIds.length}</span>
              </label>

              {/* Option 2: Today */}
              <label
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  deleteScope === 'today'
                    ? 'border-red-500 bg-red-500/10 text-white'
                    : 'border-[#1F2229] bg-[#0A0C10] hover:border-gray-700 text-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="deleteScope"
                    value="today"
                    checked={deleteScope === 'today'}
                    onChange={() => setDeleteScope('today')}
                    className="text-red-500 focus:ring-0"
                  />
                  <div>
                    <span className="block text-xs font-bold">Histórico de Hoje</span>
                    <span className="text-[10px] text-gray-400">Excluir apenas mensagens enviadas/processadas hoje</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-red-400">{todayStats.total}</span>
              </label>

              {/* Option 3: Week */}
              <label
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  deleteScope === 'week'
                    ? 'border-red-500 bg-red-500/10 text-white'
                    : 'border-[#1F2229] bg-[#0A0C10] hover:border-gray-700 text-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="deleteScope"
                    value="week"
                    checked={deleteScope === 'week'}
                    onChange={() => setDeleteScope('week')}
                    className="text-red-500 focus:ring-0"
                  />
                  <div>
                    <span className="block text-xs font-bold">Histórico desta Semana</span>
                    <span className="text-[10px] text-gray-400">Excluir registros acumulados na semana atual</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-red-400">{weekStats.total}</span>
              </label>

              {/* Option 4: Month */}
              <label
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  deleteScope === 'month'
                    ? 'border-red-500 bg-red-500/10 text-white'
                    : 'border-[#1F2229] bg-[#0A0C10] hover:border-gray-700 text-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="deleteScope"
                    value="month"
                    checked={deleteScope === 'month'}
                    onChange={() => setDeleteScope('month')}
                    className="text-red-500 focus:ring-0"
                  />
                  <div>
                    <span className="block text-xs font-bold">Histórico deste Mês</span>
                    <span className="text-[10px] text-gray-400">Excluir registros acumulados no mês atual</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-red-400">{monthStats.total}</span>
              </label>

              {/* Option 5: All */}
              <label
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  deleteScope === 'all'
                    ? 'border-red-500 bg-red-500/10 text-white'
                    : 'border-[#1F2229] bg-[#0A0C10] hover:border-gray-700 text-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="deleteScope"
                    value="all"
                    checked={deleteScope === 'all'}
                    onChange={() => setDeleteScope('all')}
                    className="text-red-500 focus:ring-0"
                  />
                  <div>
                    <span className="block text-xs font-bold text-red-400">Excluir TODO o Histórico</span>
                    <span className="text-[10px] text-gray-400">Apagar completamente todos os registros salvos</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-red-500">{logs.length}</span>
              </label>
            </div>

            {onReturnToQueue && (
              <label className="flex items-center space-x-3 p-3 bg-[#A88B4B]/10 border border-[#A88B4B]/30 rounded-lg cursor-pointer hover:bg-[#A88B4B]/20 transition-colors text-left mt-2">
                <input
                  type="checkbox"
                  checked={bulkReturnToQueue}
                  onChange={(e) => setBulkReturnToQueue(e.target.checked)}
                  className="w-4 h-4 text-[#A88B4B] bg-transparent border-gray-500 rounded focus:ring-[#A88B4B] focus:ring-offset-0"
                />
                <div>
                  <span className="block text-[11px] font-bold text-[#A88B4B] uppercase tracking-wider">
                    Voltar pro agendado
                  </span>
                  <span className="block text-[10px] text-gray-400 mt-0.5">
                    Os contatos excluídos serão adicionados novamente nas campanhas originais.
                  </span>
                </div>
              </label>
            )}

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#1F2229] mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setBulkReturnToQueue(false);
                }}
                className="bg-[#1A1D23] hover:bg-[#252830] text-gray-400 hover:text-white px-4 py-2.5 rounded font-semibold text-xs uppercase tracking-wider transition-all border border-[#1F2229]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteDeletion}
                className="bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-600/20 flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {logToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#15181E] border border-[#2A2D35] rounded-xl w-full max-w-sm shadow-2xl p-6 text-center space-y-5 animate-scale-up">
            <div className="w-12 h-12 bg-gray-800 text-gray-300 rounded-full flex items-center justify-center mx-auto border border-gray-700">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-serif italic text-white mb-2">Excluir Registro</h3>
              <p className="text-xs text-gray-400">
                Deseja excluir este registro e adicioná-lo de volta à fila de envio da campanha original, ou apenas apagar o registro?
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 pt-2">
              {onReturnToQueue && (
                <button
                  onClick={() => {
                    onReturnToQueue(logToDelete.campaignId, logToDelete.contactId);
                    onDeleteLog(logToDelete.id);
                    setSelectedIds(selectedIds.filter((i) => i !== logToDelete.id));
                    setLogToDelete(null);
                  }}
                  className="w-full bg-[#1A1D23] hover:bg-[#252A33] text-gray-300 border border-[#2A2D35] font-bold py-3 px-4 rounded text-xs uppercase tracking-widest transition-colors flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Voltar pro agendado e apagar</span>
                </button>
              )}
              <button
                onClick={() => {
                  onDeleteLog(logToDelete.id);
                  setSelectedIds(selectedIds.filter((i) => i !== logToDelete.id));
                  setLogToDelete(null);
                }}
                className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-bold py-3 px-4 rounded text-xs uppercase tracking-widest transition-colors flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Apenas Apagar</span>
              </button>
              <button
                onClick={() => setLogToDelete(null)}
                className="w-full mt-2 text-gray-500 hover:text-white font-bold py-2 text-xs uppercase tracking-widest transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal for Puladas / Canceladas / Enviadas */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#15181E] border border-[#1F2229] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setDetailModal(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 border-b border-[#1F2229] pb-4 shrink-0">
              <div className={`p-2.5 rounded-lg border ${
                detailModal.status === 'enviado' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : detailModal.status === 'pulado' 
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {detailModal.status === 'enviado' ? <CheckCircle2 className="w-5 h-5" /> : detailModal.status === 'pulado' ? <AlertTriangle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span>{detailModal.title}</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#0A0C10] border border-[#1F2229]">
                    {detailModal.logs.length}
                  </span>
                </h3>
                <p className="text-xs text-gray-400">
                  Relação de pessoas e contatos registrados para este status:
                </p>
              </div>
            </div>

            <div className="overflow-y-auto space-y-2 pr-1 flex-1 custom-scrollbar">
              {detailModal.logs.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-xs italic">
                  Nenhuma pessoa registrada para este período.
                </div>
              ) : (
                detailModal.logs.map((item, idx) => (
                  <div key={item.id || idx} className="bg-[#0A0C10] border border-[#1F2229] p-3 rounded-lg flex items-center justify-between gap-3 hover:border-gray-700 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-white truncate">{item.contactName || 'Contato sem nome'}</span>
                        {item.chipName && (
                          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">
                            📱 {cleanChipName(item.chipName)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-gray-400 font-mono mt-0.5">
                        <span className="text-[#A88B4B]">{formatPhoneDisplay(item.phone)}</span>
                        <span>•</span>
                        <span className="truncate text-gray-500 font-sans">{item.campaignTitle}</span>
                      </div>
                      {item.notes && (
                        <p className="text-[10px] text-amber-400/80 italic mt-1 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 inline-block">
                          {item.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-gray-500 font-mono block">
                          {item.sentAt 
                            ? new Date(item.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                            : item.scheduledAt
                            ? new Date(item.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                            : '—'
                          }
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUndoPromptItem(item);
                        }}
                        className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-300 hover:text-white px-2.5 py-1.5 rounded text-[10px] uppercase font-bold flex items-center space-x-1 transition-colors cursor-pointer shadow"
                        title="Desfazer esta ação (marcar como enviado por chip ou excluir)"
                      >
                        <RefreshCw className="w-3 h-3 text-emerald-400" />
                        <span>Desfazer</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-[#1F2229] flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                className="bg-[#1A1D23] hover:bg-[#252830] text-gray-300 hover:text-white px-5 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all border border-[#1F2229]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Undo Prompt Modal */}
      {undoPromptItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#15181E] border border-[#1F2229] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setUndoPromptItem(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 border-b border-[#1F2229] pb-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Desfazer Ação</h3>
                <p className="text-xs text-gray-400">Contato: <strong className="text-white">{undoPromptItem.contactName || undoPromptItem.phone}</strong></p>
              </div>
            </div>

            <div className="space-y-4 pt-1">
              <p className="text-xs text-gray-300 font-medium">Como deseja proceder com este registro?</p>
              
              <div className="space-y-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">1. Informar que a mensagem foi enviada e por qual chip:</span>
                <div className="grid grid-cols-1 gap-2">
                  {(settings.chips && settings.chips.length > 0 ? settings.chips : [
                    { id: 'chip_1', name: 'Business' },
                    { id: 'chip_2', name: 'Chip 2' }
                  ]).map(chip => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => {
                        onUpdateLog(undoPromptItem.id, { 
                          status: 'enviado', 
                          chipId: chip.id, 
                          chipName: cleanChipName(chip.name),
                          sentAt: new Date().toISOString(),
                          notes: `Enviado por ${cleanChipName(chip.name)} (Desfeito / Marcado manualmente)` 
                        });
                        setDetailModal(prev => prev ? {
                          ...prev,
                          logs: prev.logs.filter(l => l.id !== undoPromptItem.id)
                        } : null);
                        setUndoPromptItem(null);
                      }}
                      className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-200 font-bold py-2.5 px-3 rounded-lg text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer shadow"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>ENVIADO ({cleanChipName(chip.name)})</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-[#1F2229]">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-2">2. Ou remover / excluir apenas da lista:</span>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteLog(undoPromptItem.id);
                    setDetailModal(prev => prev ? {
                      ...prev,
                      logs: prev.logs.filter(l => l.id !== undoPromptItem.id)
                    } : null);
                    setUndoPromptItem(null);
                  }}
                  className="w-full bg-[#1A1D23] hover:bg-red-950/40 border border-red-500/30 text-red-400 hover:text-red-300 font-bold py-2.5 px-3 rounded-lg text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir apenas da lista</span>
                </button>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setUndoPromptItem(null)}
                  className="bg-[#1A1D23] hover:bg-[#252830] text-gray-400 hover:text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all border border-[#1F2229]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal View for Selected Archived Project */}
      {selectedArchivedProject && (() => {
        const filteredProjectLogs = selectedArchivedProject.logs.filter((item) => {
          if (projectLogFilter !== 'all' && item.status !== projectLogFilter) {
            return false;
          }
          if (projectLogSearch.trim()) {
            const query = projectLogSearch.toLowerCase().trim();
            const nameMatch = (item.contactName || '').toLowerCase().includes(query);
            const phoneMatch = (item.phone || '').includes(query);
            const campMatch = (item.campaignTitle || '').toLowerCase().includes(query);
            const msgMatch = (item.messageText || '').toLowerCase().includes(query);
            return nameMatch || phoneMatch || campMatch || msgMatch;
          }
          return true;
        });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#15181E] border border-[#A88B4B]/40 rounded-2xl max-w-4xl w-full p-6 space-y-5 shadow-2xl relative max-h-[92vh] flex flex-col">
              <button
                onClick={() => setSelectedArchivedProject(null)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-[#1F2229]"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3 border-b border-[#1F2229] pb-4 shrink-0">
                <div className="p-3 bg-[#A88B4B]/10 border border-[#A88B4B]/30 rounded-xl text-[#A88B4B]">
                  <FolderArchive className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                    <span>{selectedArchivedProject.name}</span>
                  </h3>
                  <p className="text-xs text-gray-400 font-mono">
                    Período: {selectedArchivedProject.startDate} até {selectedArchivedProject.endDate} • Fechado e Arquivado em {new Date(selectedArchivedProject.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              {/* Quick Metrics Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                <div className="bg-[#0A0C10] border border-[#1F2229] p-3 rounded-lg space-y-0.5">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Envios</span>
                  <span className="text-lg font-mono font-extrabold text-emerald-400">{selectedArchivedProject.totalSent}</span>
                </div>

                <div className="bg-[#0A0C10] border border-[#1F2229] p-3 rounded-lg space-y-0.5">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Taxa Sucesso</span>
                  <span className="text-lg font-mono font-extrabold text-[#A88B4B]">
                    {selectedArchivedProject.totalSent + selectedArchivedProject.totalFailed + selectedArchivedProject.totalSkipped > 0
                      ? Math.round((selectedArchivedProject.totalSent / (selectedArchivedProject.totalSent + selectedArchivedProject.totalFailed + selectedArchivedProject.totalSkipped)) * 100)
                      : 0}%
                  </span>
                </div>

                <div className="bg-[#0A0C10] border border-[#1F2229] p-3 rounded-lg space-y-0.5">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Contatos Atingidos</span>
                  <span className="text-lg font-mono font-extrabold text-indigo-400">{selectedArchivedProject.totalContacts}</span>
                </div>

                <div className="bg-[#0A0C10] border border-[#1F2229] p-3 rounded-lg space-y-0.5">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Falhas / Pulados</span>
                  <span className="text-lg font-mono font-extrabold text-red-400">{selectedArchivedProject.totalFailed + selectedArchivedProject.totalSkipped}</span>
                </div>
              </div>

              {/* Chip Breakdown if present */}
              {selectedArchivedProject.chipStats && Object.keys(selectedArchivedProject.chipStats).length > 0 && (
                <div className="bg-[#0A0C10] border border-[#1F2229] p-3 rounded-lg space-y-1.5 shrink-0">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Chips Utilizados no Fechamento:</span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedArchivedProject.chipStats).map(([chip, count]) => (
                      <span key={chip} className="text-xs bg-[#15181E] border border-[#1F2229] text-gray-300 px-2 py-0.5 rounded font-mono">
                        📱 <strong className="text-emerald-400">{cleanChipName(chip)}:</strong> {count} msgs
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Search and Filters inside Archive */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={projectLogSearch}
                    onChange={(e) => setProjectLogSearch(e.target.value)}
                    placeholder="Filtrar por nome, telefone, campanha..."
                    className="w-full bg-[#0A0C10] border border-[#1F2229] text-white text-xs rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:border-[#A88B4B]"
                  />
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setProjectLogFilter('all')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      projectLogFilter === 'all'
                        ? 'bg-[#A88B4B] text-slate-950 font-extrabold'
                        : 'bg-[#0A0C10] text-gray-400 border border-[#1F2229]'
                    }`}
                  >
                    Todos ({selectedArchivedProject.logs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setProjectLogFilter('enviado')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      projectLogFilter === 'enviado'
                        ? 'bg-emerald-600 text-white font-extrabold'
                        : 'bg-[#0A0C10] text-emerald-400 border border-[#1F2229]'
                    }`}
                  >
                    Enviados ({selectedArchivedProject.totalSent})
                  </button>
                  <button
                    type="button"
                    onClick={() => setProjectLogFilter('falha')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      projectLogFilter === 'falha'
                        ? 'bg-red-600 text-white font-extrabold'
                        : 'bg-[#0A0C10] text-red-400 border border-[#1F2229]'
                    }`}
                  >
                    Falhas ({selectedArchivedProject.totalFailed})
                  </button>
                  <button
                    type="button"
                    onClick={() => setProjectLogFilter('pulado')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      projectLogFilter === 'pulado'
                        ? 'bg-amber-600 text-white font-extrabold'
                        : 'bg-[#0A0C10] text-amber-400 border border-[#1F2229]'
                    }`}
                  >
                    Pulados ({selectedArchivedProject.totalSkipped})
                  </button>
                </div>
              </div>

              {/* Dispatches Table inside Archive */}
              <div className="flex-1 overflow-y-auto custom-scrollbar border border-[#1F2229] rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0A0C10] border-b border-[#1F2229] sticky top-0 z-10 text-[10px] uppercase font-mono text-gray-400">
                    <tr>
                      <th className="py-2.5 px-3">Contato</th>
                      <th className="py-2.5 px-3">Telefone</th>
                      <th className="py-2.5 px-3">Campanha</th>
                      <th className="py-2.5 px-3 text-right">Data/Hora</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2229] bg-[#15181E]">
                    {filteredProjectLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500 italic">
                          Nenhum registro encontrado com os filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      filteredProjectLogs.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-[#1F2229]/50">
                          <td className="py-2.5 px-3 font-bold text-white">
                            {item.contactName || 'Contato sem nome'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#A88B4B]">
                            {formatPhoneDisplay(item.phone)}
                          </td>
                          <td className="py-2.5 px-3 text-gray-300 max-w-[180px] truncate">
                            {item.campaignTitle}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-gray-400 text-right">
                            {item.sentAt ? new Date(item.sentAt).toLocaleString('pt-BR') : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              item.status === 'enviado'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : item.status === 'pulado'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'bg-red-500/10 text-red-400 border border-red-500/30'
                            }`}>
                              {item.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-[#1F2229] flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      const total = selectedArchivedProject.totalSent + selectedArchivedProject.totalFailed + selectedArchivedProject.totalSkipped;
                      const successPct = total > 0 ? Math.round((selectedArchivedProject.totalSent / total) * 100) : 0;
                      const chipRows = Object.entries(selectedArchivedProject.chipStats || {})
                        .map(([chip, count]) => `<li><strong>${chip}:</strong> ${count} disparos</li>`)
                        .join('');

                      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${selectedArchivedProject.name} - Relatório de Fechamento</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; margin: 30px; font-size: 12px; background: #fff; }
    .header { border-bottom: 3px solid #A88B4B; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    h1 { font-size: 20px; color: #A88B4B; margin: 0; }
    .badge { background: #A88B4B; color: #000; font-weight: bold; padding: 4px 10px; border-radius: 4px; font-size: 11px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .card { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 12px; }
    .card-label { font-size: 10px; text-transform: uppercase; color: #6c757d; font-weight: bold; }
    .card-value { font-size: 18px; font-weight: bold; color: #212529; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
    th, td { border: 1px solid #dee2e6; padding: 8px; text-align: left; }
    th { background-color: #f1f3f5; color: #495057; font-weight: bold; }
    tr:nth-child(even) { background-color: #fafbfc; }
    .status-enviado { color: #2b8a3e; font-weight: bold; }
    .status-falha { color: #c92a2a; font-weight: bold; }
    .status-pulado { color: #e67700; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${selectedArchivedProject.name}</h1>
      <p style="margin: 5px 0 0 0; color: #666;">Período: ${selectedArchivedProject.startDate} a ${selectedArchivedProject.endDate} • Fechado em: ${new Date(selectedArchivedProject.createdAt).toLocaleString('pt-BR')}</p>
    </div>
    <div class="badge">PROJETO CONCLUÍDO</div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-label">Envios Efetuados</div>
      <div class="card-value" style="color: #2b8a3e;">${selectedArchivedProject.totalSent}</div>
    </div>
    <div class="card">
      <div class="card-label">Taxa de Sucesso</div>
      <div class="card-value" style="color: #A88B4B;">${successPct}%</div>
    </div>
    <div class="card">
      <div class="card-label">Contatos Atingidos</div>
      <div class="card-value" style="color: #3b5bdb;">${selectedArchivedProject.totalContacts}</div>
    </div>
    <div class="card">
      <div class="card-label">Falhas / Pulados</div>
      <div class="card-value" style="color: #c92a2a;">${selectedArchivedProject.totalFailed + selectedArchivedProject.totalSkipped}</div>
    </div>
  </div>

  ${chipRows ? `<div style="margin-bottom: 20px; background: #f8f9fa; padding: 10px 15px; border-radius: 6px;"><strong>Distribuição por Chip:</strong> <ul style="margin: 5px 0 0 0; padding-left: 20px;">${chipRows}</ul></div>` : ''}

  <h3>Auditoria de Disparos (${selectedArchivedProject.logs.length} registros)</h3>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Contato</th>
        <th>Telefone</th>
        <th>Campanha</th>
        <th>Data/Hora Envio</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${selectedArchivedProject.logs.map((l, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${l.contactName || 'Sem nome'}</strong></td>
          <td>${formatPhoneDisplay(l.phone)}</td>
          <td>${l.campaignTitle}</td>
          <td>${l.sentAt ? new Date(l.sentAt).toLocaleString('pt-BR') : '—'}</td>
          <td class="status-${l.status}">${l.status.toUpperCase()}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`;
                      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                      downloadFileSafely(blob, `relatorio_${selectedArchivedProject.name.replace(/\s+/g, '_')}.html`);
                    }}
                    className="bg-[#1A1D23] hover:bg-[#252830] text-gray-200 border border-[#2A2E39] font-bold text-xs uppercase px-4 py-2.5 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#A88B4B]" />
                    <span>Relatório HTML / PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const headers = ['Campanha', 'Contato', 'Telefone', 'Status', 'Data Envio', 'Mensagem'];
                      const rows = selectedArchivedProject.logs.map((l) => [
                        `"${l.campaignTitle}"`,
                        `"${l.contactName}"`,
                        `"${l.phone}"`,
                        `"${l.status}"`,
                        `"${l.sentAt ? new Date(l.sentAt).toLocaleString('pt-BR') : '—'}"`,
                        `"${l.messageText.replace(/"/g, '""')}"`,
                      ]);
                      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
                      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8' });
                      downloadFileSafely(blob, `projeto_${selectedArchivedProject.name.replace(/\s+/g, '_')}_logs.csv`);
                    }}
                    className="bg-[#A88B4B] hover:bg-[#C5A968] text-slate-950 font-extrabold text-xs uppercase px-4 py-2.5 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer shadow-md"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar CSV</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedArchivedProject(null)}
                  className="bg-[#1A1D23] hover:bg-[#252830] text-gray-300 hover:text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border border-[#1F2229]"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
});


