export type DialogVariant = 'info' | 'success' | 'warning' | 'danger';
export type DialogMode = 'alert' | 'confirm';

export interface DialogOptions {
  title?: string;
  variant?: DialogVariant;
  confirmText?: string;
  cancelText?: string;
}

export interface DialogRequest {
  id: string;
  mode: DialogMode;
  title: string;
  message: string;
  variant: DialogVariant;
  confirmText: string;
  cancelText: string;
  resolve: (result: boolean) => void;
}

const LEADING_EMOJI_REGEX = /^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F\u200D\s]+/u;

function inferVariant(message: string, mode: DialogMode): DialogVariant {
  const lower = message.toLowerCase();

  if (
    message.includes('✅') ||
    lower.includes('com sucesso') ||
    lower.includes('sucesso!') ||
    lower.includes('agendada com sucesso') ||
    lower.includes('restaurado')
  ) {
    return 'success';
  }

  if (
    message.includes('🛑') ||
    message.includes('🚨') ||
    lower.includes('bloqueado') ||
    lower.includes('excluir') ||
    lower.includes('apagar') ||
    lower.includes('zerar') ||
    lower.includes('remover') ||
    lower.includes('erro') ||
    lower.includes('inválido') ||
    lower.includes('inválida') ||
    lower.includes('não foi possível') ||
    lower.includes('negada') ||
    lower.includes('descartar')
  ) {
    return 'danger';
  }

  if (
    message.includes('⚠️') ||
    lower.includes('atenção') ||
    lower.includes('cuidado') ||
    lower.includes('cancelar') ||
    lower.includes('pausa') ||
    lower.includes('por favor') ||
    lower.includes('nenhum') ||
    lower.includes('nenhuma') ||
    lower.includes('informe') ||
    lower.includes('selecione') ||
    lower.includes('não suporta') ||
    lower.includes('não há') ||
    lower.includes('não é segunda')
  ) {
    return 'warning';
  }

  return mode === 'confirm' ? 'warning' : 'info';
}

function inferTitle(message: string, variant: DialogVariant, mode: DialogMode): string {
  const lower = message.toLowerCase();

  if (lower.includes('agendada com sucesso')) return 'Campanha Agendada';
  if (lower.includes('aplicativo zerado')) return 'Aplicativo Reiniciado';
  if (lower.includes('envio bloqueado')) return 'Envio Bloqueado';
  if (lower.includes('zerar dados para novo projeto')) return 'Novo Projeto';
  if (lower.includes('zerar')) return 'Confirmar Reinicialização';
  if (lower.includes('excluir') || lower.includes('apagar') || lower.includes('remover')) {
    return 'Confirmar Exclusão';
  }
  if (lower.includes('cancelar') || lower.includes('descartar')) {
    return 'Confirmar Cancelamento';
  }
  if (lower.includes('bloqueado')) return 'Atenção • Proteção';
  if (lower.includes('erro') || lower.includes('inválid')) return 'Erro';

  if (variant === 'success') return 'Sucesso';
  if (variant === 'danger') return mode === 'confirm' ? 'Atenção Crítica' : 'Ação Bloqueada';
  if (variant === 'warning') return mode === 'confirm' ? 'Confirmação' : 'Atenção';
  return mode === 'confirm' ? 'Confirmar Ação' : 'Aviso';
}

function sanitizeMessage(message: string): string {
  return message.replace(LEADING_EMOJI_REGEX, '').trim() || message.trim();
}

type DialogListener = (current: DialogRequest | null) => void;

const queue: DialogRequest[] = [];
const listeners = new Set<DialogListener>();

function notifyListeners() {
  const current = queue[0] ?? null;
  listeners.forEach((listener) => listener(current));
}

export function subscribeDialog(listener: DialogListener): () => void {
  listeners.add(listener);
  listener(queue[0] ?? null);
  return () => {
    listeners.delete(listener);
  };
}

export function resolveActiveDialog(result: boolean): void {
  const current = queue.shift();
  if (current) {
    current.resolve(result);
  }
  notifyListeners();
}

export function showAlert(message: string, options?: DialogOptions): Promise<void> {
  return new Promise((resolve) => {
    const variant = options?.variant ?? inferVariant(message, 'alert');
    const title = options?.title ?? inferTitle(message, variant, 'alert');
    const cleaned = sanitizeMessage(message);

    queue.push({
      id: `dlg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      mode: 'alert',
      title,
      message: cleaned,
      variant,
      confirmText: options?.confirmText ?? 'OK',
      cancelText: options?.cancelText ?? 'Cancelar',
      resolve: () => resolve(),
    });
    notifyListeners();
  });
}

export function showConfirm(message: string, options?: DialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const variant = options?.variant ?? inferVariant(message, 'confirm');
    const title = options?.title ?? inferTitle(message, variant, 'confirm');
    const cleaned = sanitizeMessage(message);

    queue.push({
      id: `dlg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      mode: 'confirm',
      title,
      message: cleaned,
      variant,
      confirmText: options?.confirmText ?? 'Confirmar',
      cancelText: options?.cancelText ?? 'Cancelar',
      resolve,
    });
    notifyListeners();
  });
}
