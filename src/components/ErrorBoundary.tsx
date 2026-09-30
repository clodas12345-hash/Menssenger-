import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public props: Props;
  public state: State = {
    hasError: false,
  };

  constructor(props: Props) {
    super(props);
    this.props = props;
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0C10] text-gray-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#15181E] border border-[#A88B4B]/40 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 bg-[#A88B4B]/20 border border-[#A88B4B]/40 rounded-full flex items-center justify-center mx-auto text-[#A88B4B]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-serif italic text-white">
              Ocorreu uma instabilidade no aplicativo
            </h2>
            <p className="text-xs text-gray-400">
              Seus dados estão gravados com segurança. Clique no botão abaixo para restaurar a tela principal.
            </p>
            {this.state.error && (
              <div className="p-3 bg-[#0A0C10] border border-[#1F2229] rounded-lg text-left text-[11px] text-gray-400 font-mono overflow-x-auto max-h-28">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="w-full bg-[#A88B4B] hover:bg-[#8A713B] text-black font-bold py-3 px-4 rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Restaurar e Recarregar</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
