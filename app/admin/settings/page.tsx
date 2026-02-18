'use client';
import { useState } from 'react';
import { Eye, EyeOff, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://bipair-checkout.preview.emergentagent.com';

const ENDPOINTS = [
  { method:'GET', path:'/api/flights/search' },
  { method:'GET', path:'/api/flights/[id]' },
  { method:'GET', path:'/api/flights/[id]/seats' },
  { method:'GET', path:'/api/flights/[id]/seat-map-image' },
  { method:'POST', path:'/api/bookings' },
  { method:'GET', path:'/api/bookings/[pnr]' },
  { method:'PATCH', path:'/api/bookings/[pnr]' },
  { method:'DELETE', path:'/api/bookings/[pnr]' },
  { method:'GET', path:'/api/checkin/[pnr]' },
  { method:'POST', path:'/api/checkin/[pnr]' },
  { method:'GET', path:'/api/checkin/[pnr]/seat-map-image' },
  { method:'POST', path:'/api/payments/initiate' },
  { method:'GET', path:'/api/payments/[id]/status' },
  { method:'POST', path:'/api/passengers' },
  { method:'GET', path:'/api/passengers/[phone]' },
  { method:'POST', path:'/api/notifications/send' },
  { method:'GET', path:'/api/ticket/[pnr]' },
  { method:'GET', path:'/api/boarding-pass/[pnr]' },
];

const METHOD_COLORS: Record<string,string> = {
  GET: '#22c55e', POST: '#3b82f6', PATCH: '#eab308', DELETE: '#ef4444'
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  return (
    <button onClick={copy} className="text-gray-400 hover:text-white transition-colors">
      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [showKey, setShowKey] = useState(false);
  const apiKey = 'bipair-demo-key-2026';

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-white text-2xl font-bold">Settings</h1>

      {/* API Config */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-white font-semibold">API Configuration</h2>
        {[
          { label: 'Chatbot API Key', value: showKey ? apiKey : '•'.repeat(apiKey.length), extra: (
            <button onClick={()=>setShowKey(v=>!v)} className="text-gray-400 hover:text-white">
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )},
          { label: 'Base URL', value: BASE_URL },
          { label: 'Webhook URL', value: `${BASE_URL}/api/webhook` },
        ].map(({label, value, extra})=>(
          <div key={label} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
            <div>
              <div className="text-gray-400 text-xs mb-1">{label}</div>
              <div className="text-white font-mono text-sm">{value}</div>
            </div>
            <div className="flex items-center gap-2">
              {extra}
              <CopyButton text={label === 'Chatbot API Key' ? apiKey : value} />
            </div>
          </div>
        ))}
      </div>

      {/* Request Headers */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <h2 className="text-white font-semibold">Required Request Headers</h2>
        {[
          { key: 'x-api-key', value: 'bipair-demo-key-2026' },
          { key: 'Content-Type', value: 'application/json' },
        ].map(h=>(
          <div key={h.key} className="bg-gray-800 rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="font-mono text-sm">
              <span className="text-blue-400">{h.key}</span>
              <span className="text-gray-400">: </span>
              <span className="text-green-400">{h.value}</span>
            </div>
            <CopyButton text={`${h.key}: ${h.value}`} />
          </div>
        ))}
      </div>

      {/* Endpoints Reference */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">API Endpoints Reference</h2>
        <div className="space-y-2">
          {ENDPOINTS.map((ep, i)=>(
            <div key={i} className="flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2">
              <span className="text-xs font-bold w-14 text-center rounded px-1 py-0.5" style={{color: METHOD_COLORS[ep.method], backgroundColor: `${METHOD_COLORS[ep.method]}20`}}>
                {ep.method}
              </span>
              <span className="text-gray-300 font-mono text-sm flex-1">{ep.path}</span>
              <CopyButton text={`${BASE_URL}${ep.path}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
