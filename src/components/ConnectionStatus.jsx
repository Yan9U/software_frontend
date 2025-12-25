/**
 * Connection Status Indicator Component
 * Shows real-time backend connection status
 */

import React from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useBackendConnection } from '../hooks/useApi';

const ConnectionStatus = ({ pollInterval = 30000 }) => {
  const { connected, checking, error, checkConnection } = useBackendConnection(pollInterval);

  return (
    <div
      onClick={checkConnection}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
        checking
          ? 'bg-slate-800 text-slate-400'
          : connected
          ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
          : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
      }`}
      title={connected ? 'Backend connected' : error || 'Backend disconnected'}
    >
      {checking ? (
        <Loader2 size={14} className="animate-spin" />
      ) : connected ? (
        <Wifi size={14} />
      ) : (
        <WifiOff size={14} />
      )}
      <span className="text-xs font-medium">
        {checking ? 'Checking...' : connected ? 'Connected' : 'Offline'}
      </span>
    </div>
  );
};

export default ConnectionStatus;