'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Trash2, ChevronDown, ChevronRight, Search, Activity, AlertCircle, Clock, Key } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ApiLog {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  query_params: Record<string, string> | null;
  request_body: any;
  response_status: number;
  response_time_ms: number;
  ip_address: string | null;
  user_agent: string | null;
  error_message: string | null;
  api_key_present: boolean;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  POST: 'bg-green-500/20 text-green-400 border-green-500/30',
  PATCH: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  PUT: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function getStatusBg(status: number): string {
  if (status >= 200 && status < 300) return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (status >= 400 && status < 500) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  if (status >= 500) return 'bg-red-500/20 text-red-400 border-red-500/30';
  return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function LogsPage() {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [page, setPage] = useState(1);
  const [clearing, setClearing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [filterMethod, setFilterMethod] = useState('');
  const [filterPath, setFilterPath] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchLogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (filterMethod) params.set('method', filterMethod);
      if (filterPath) params.set('path', filterPath);
      if (filterStatus) params.set('status', filterStatus);

      const res = await fetch(`/api/admin/logs?${params}`);
      const data = await res.json();

      if (data.setupRequired) {
        setSetupRequired(true);
        return;
      }
      if (!data.success) throw new Error(data.error);
      setLogs(data.data);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, filterMethod, filterPath, filterStatus]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchLogs(true), 10000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchLogs]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearLogs = async () => {
    if (!confirm('Clear all API logs? This cannot be undone.')) return;
    setClearing(true);
    try {
      const res = await fetch('/api/admin/logs', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { setLogs([]); setTotal(0); }
    } finally {
      setClearing(false);
    }
  };

  const totalPages = Math.ceil(total / 50);

  if (setupRequired) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto bg-gray-900 border border-yellow-500/30 rounded-xl p-8 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Setup Required</h2>
          <p className="text-gray-400 mb-6">
            The <code className="text-orange-400 bg-gray-800 px-1.5 py-0.5 rounded">api_logs</code> table needs to be created in your Supabase database.
          </p>
          <div className="bg-gray-950 rounded-lg p-4 text-left text-xs font-mono text-gray-300 mb-6 overflow-auto border border-gray-800">
            <span className="text-green-400">CREATE TABLE</span> IF NOT EXISTS api_logs (<br />
            &nbsp;&nbsp;id UUID <span className="text-blue-400">PRIMARY KEY</span> DEFAULT gen_random_uuid(),<br />
            &nbsp;&nbsp;timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),<br />
            &nbsp;&nbsp;method TEXT NOT NULL,<br />
            &nbsp;&nbsp;path TEXT NOT NULL,<br />
            &nbsp;&nbsp;query_params JSONB,<br />
            &nbsp;&nbsp;request_body JSONB,<br />
            &nbsp;&nbsp;response_status INTEGER NOT NULL,<br />
            &nbsp;&nbsp;response_time_ms INTEGER NOT NULL,<br />
            &nbsp;&nbsp;ip_address TEXT,<br />
            &nbsp;&nbsp;user_agent TEXT,<br />
            &nbsp;&nbsp;error_message TEXT,<br />
            &nbsp;&nbsp;api_key_present BOOLEAN DEFAULT FALSE<br />
            );<br /><br />
            <span className="text-green-400">CREATE INDEX</span> IF NOT EXISTS api_logs_timestamp_idx<br />
            &nbsp;&nbsp;ON api_logs(timestamp DESC);
          </div>
          <Button onClick={() => { setSetupRequired(false); fetchLogs(); }} style={{ backgroundColor: '#FF6600' }} className="text-white">
            Check Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="h-6 w-6" style={{ color: '#FF6600' }} />
            API Request Logs
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time log of all chatbot API requests &mdash; {total.toLocaleString()} total entries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              'border-gray-700 text-gray-300 gap-2',
              autoRefresh && 'border-green-500/50 text-green-400 bg-green-500/10'
            )}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', autoRefresh && 'animate-spin')} />
            {autoRefresh ? 'Live (10s)' : 'Auto-refresh'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchLogs()}
            className="border-gray-700 text-gray-300 gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={clearLogs} disabled={clearing}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-2">
            <Trash2 className="h-3.5 w-3.5" /> Clear All
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-gray-500 mb-1 block">Search endpoint</label>
            <div className="flex gap-2">
              <Input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (setFilterPath(searchInput), setPage(1))}
                placeholder="/api/bookings..."
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 h-9 text-sm"
              />
              <Button size="sm" onClick={() => { setFilterPath(searchInput); setPage(1); }}
                className="h-9 px-3 bg-gray-700 hover:bg-gray-600 text-white border-0">
                <Search className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="w-36">
            <label className="text-xs text-gray-500 mb-1 block">Method</label>
            <Select value={filterMethod || 'all'} onValueChange={v => { setFilterMethod(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-9 text-sm">
                <SelectValue placeholder="All methods" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all" className="text-gray-300">All methods</SelectItem>
                <SelectItem value="GET" className="text-blue-400">GET</SelectItem>
                <SelectItem value="POST" className="text-green-400">POST</SelectItem>
                <SelectItem value="PATCH" className="text-yellow-400">PATCH</SelectItem>
                <SelectItem value="DELETE" className="text-red-400">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-36">
            <label className="text-xs text-gray-500 mb-1 block">Status</label>
            <Select value={filterStatus || 'all'} onValueChange={v => { setFilterStatus(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-9 text-sm">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all" className="text-gray-300">All statuses</SelectItem>
                <SelectItem value="2xx" className="text-green-400">2xx Success</SelectItem>
                <SelectItem value="4xx" className="text-yellow-400">4xx Client Error</SelectItem>
                <SelectItem value="5xx" className="text-red-400">5xx Server Error</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(filterMethod || filterPath || filterStatus) && (
            <Button variant="ghost" size="sm"
              onClick={() => { setFilterMethod(''); setFilterPath(''); setFilterStatus(''); setSearchInput(''); setPage(1); }}
              className="text-gray-400 hover:text-white h-9">
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[80px_1fr_70px_90px_110px_70px] gap-3 px-4 py-2.5 border-b border-gray-800 bg-gray-950 text-xs text-gray-500 font-semibold uppercase tracking-wider">
          <span>Method</span>
          <span>Endpoint</span>
          <span>Status</span>
          <span>Duration</span>
          <span>Time</span>
          <span>Auth</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-500">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-gray-600" />
            <span className="text-sm">Loading logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <Activity className="h-8 w-8 mx-auto mb-3 text-gray-700" />
            <p className="font-medium text-gray-400">No logs yet</p>
            <p className="text-sm mt-1 text-gray-500">Chatbot API requests will appear here automatically</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {logs.map(log => {
              const isExpanded = expandedRows.has(log.id);
              return (
                <div key={log.id}>
                  <button
                    onClick={() => toggleRow(log.id)}
                    className="w-full grid grid-cols-[80px_1fr_70px_90px_110px_70px] gap-3 px-4 py-3 text-left hover:bg-gray-800/40 transition-colors group"
                  >
                    <span className={cn(
                      'inline-flex items-center justify-center px-1.5 py-0.5 rounded text-xs font-bold border self-center',
                      METHOD_COLORS[log.method] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                    )}>
                      {log.method}
                    </span>

                    <div className="min-w-0 self-center">
                      <div className="flex items-center gap-1.5">
                        {isExpanded
                          ? <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          : <ChevronRight className="h-3.5 w-3.5 text-gray-600 flex-shrink-0 group-hover:text-gray-400" />
                        }
                        <span className="text-gray-200 text-sm font-mono truncate">{log.path}</span>
                      </div>
                      {log.query_params && Object.keys(log.query_params).length > 0 && (
                        <div className="pl-5 text-xs text-gray-500 font-mono truncate mt-0.5">
                          ?{Object.entries(log.query_params).map(([k, v]) => `${k}=${v}`).join('&')}
                        </div>
                      )}
                      {log.error_message && (
                        <div className="pl-5 text-xs text-red-400 truncate mt-0.5">
                          {log.error_message}
                        </div>
                      )}
                    </div>

                    <span className={cn(
                      'inline-flex items-center justify-center px-1.5 py-0.5 rounded text-xs font-bold border self-center',
                      getStatusBg(log.response_status)
                    )}>
                      {log.response_status}
                    </span>

                    <div className="self-center flex items-center gap-1 text-gray-400 text-sm">
                      <Clock className="h-3 w-3 text-gray-600" />
                      {formatTime(log.response_time_ms)}
                    </div>

                    <span className="text-gray-400 text-xs self-center" title={new Date(log.timestamp).toLocaleString()}>
                      {timeAgo(log.timestamp)}
                    </span>

                    <span className={cn('text-xs self-center flex items-center gap-1',
                      log.api_key_present ? 'text-green-400' : 'text-red-400'
                    )}>
                      <Key className="h-3 w-3" />
                      {log.api_key_present ? 'OK' : 'None'}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-5 bg-gray-800/20 border-t border-gray-800">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4">
                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Request Info</h4>
                          <dl className="space-y-2 text-sm">
                            <div className="flex gap-2">
                              <dt className="text-gray-500 w-28 flex-shrink-0">Timestamp</dt>
                              <dd className="text-gray-200 font-mono text-xs">{new Date(log.timestamp).toLocaleString()}</dd>
                            </div>
                            {log.ip_address && (
                              <div className="flex gap-2">
                                <dt className="text-gray-500 w-28 flex-shrink-0">IP Address</dt>
                                <dd className="text-gray-200 font-mono text-xs">{log.ip_address}</dd>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <dt className="text-gray-500 w-28 flex-shrink-0">API Key</dt>
                              <dd className={log.api_key_present ? 'text-green-400 text-xs' : 'text-red-400 text-xs'}>
                                {log.api_key_present ? 'Present' : 'Missing'}
                              </dd>
                            </div>
                            {log.error_message && (
                              <div className="flex gap-2">
                                <dt className="text-gray-500 w-28 flex-shrink-0">Error</dt>
                                <dd className="text-red-400 text-xs">{log.error_message}</dd>
                              </div>
                            )}
                            {log.user_agent && (
                              <div className="flex gap-2">
                                <dt className="text-gray-500 w-28 flex-shrink-0">User Agent</dt>
                                <dd className="text-gray-400 text-xs truncate max-w-xs">{log.user_agent}</dd>
                              </div>
                            )}
                          </dl>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Request Body</h4>
                          {log.request_body && Object.keys(log.request_body).length > 0 ? (
                            <pre className="text-xs text-gray-300 bg-gray-950 rounded-lg p-3 overflow-auto max-h-52 font-mono border border-gray-700 leading-relaxed">
                              {JSON.stringify(log.request_body, null, 2)}
                            </pre>
                          ) : (
                            <span className="text-gray-600 text-xs italic">No request body</span>
                          )}
                        </div>

                        {log.query_params && Object.keys(log.query_params).length > 0 && (
                          <div className="md:col-span-2 space-y-2">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Query Parameters</h4>
                            <pre className="text-xs text-gray-300 bg-gray-950 rounded-lg p-3 font-mono border border-gray-700">
                              {JSON.stringify(log.query_params, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>Showing {((page - 1) * 50) + 1}&ndash;{Math.min(page * 50, total)} of {total.toLocaleString()} logs</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1} className="border-gray-700 text-gray-300 disabled:opacity-40">Previous</Button>
            <span className="flex items-center px-3 text-gray-300">Page {page} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages} className="border-gray-700 text-gray-300 disabled:opacity-40">Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
