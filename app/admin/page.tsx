'use client';
import { useEffect, useState } from 'react';
import { StatsCard } from '@/components/admin/stats-card';
import { StatusBadge } from '@/components/admin/status-badge';
import { Plane, Ticket, DollarSign, CheckSquare } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency, formatDateTime } from '@/lib/bipair-utils';

const COLORS = ['#FF6600', '#3b82f6', '#22c55e'];

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(d => {
      if (d.success) setStats(d.data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-400 text-sm">Welcome back, {stats?.username || 'admin'}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Flights Today"
          value={stats?.flightsToday ?? 0}
          subtitle="Departing today"
          icon={<Plane className="h-5 w-5" />}
          color="#FF6600"
        />
        <StatsCard
          title="Total Bookings"
          value={stats?.totalBookings ?? 0}
          subtitle="All time"
          icon={<Ticket className="h-5 w-5" />}
          color="#3b82f6"
        />
        <StatsCard
          title="Revenue Today"
          value={formatCurrency(stats?.revenueToday ?? 0)}
          subtitle="Paid bookings today"
          icon={<DollarSign className="h-5 w-5" />}
          color="#22c55e"
        />
        <StatsCard
          title="Check-in Rate"
          value={`${stats?.checkinRate ?? 0}%`}
          subtitle="Of confirmed bookings"
          icon={<CheckSquare className="h-5 w-5" />}
          color="#8b5cf6"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Bookings Last 14 Days</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats?.bookingsPerDay || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
              <Line type="monotone" dataKey="count" stroke="#FF6600" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Bookings by Source</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={stats?.bookingsBySource || []}
                cx="50%" cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {(stats?.bookingsBySource || []).map((_: any, index: number) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
              <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-gray-800">
          <h2 className="text-white font-semibold">Recent Bookings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-800">
                {['PNR','Passenger','Flight','Route','Status','Payment','Amount','Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-gray-400 text-xs font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(stats?.recentBookings || []).map((b: any) => (
                <tr key={b.pnr} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 text-orange-400 font-mono font-bold text-sm">{b.pnr}</td>
                  <td className="px-4 py-3 text-white text-sm">{b.passenger_name}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{b.flight_number}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{b.route}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3"><StatusBadge status={b.payment_status} /></td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{formatCurrency(b.total_amount || 0)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDateTime(b.created_at)}</td>
                </tr>
              ))}
              {(!stats?.recentBookings?.length) && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No bookings yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
