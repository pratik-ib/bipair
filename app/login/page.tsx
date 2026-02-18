'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Plane } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || success) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        // Hard redirect ensures the session cookie is sent with the full HTTP request
        // so middleware and server components can read it correctly.
        // router.push() is a soft nav and can miss the cookie timing.
        window.location.href = '/admin';
      } else {
        setError(data.error || 'Invalid credentials');
        setLoading(false);
      }
    } catch {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  const isWorking = loading || success;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Plane className="h-8 w-8" style={{ color: '#FF6600' }} />
            <span className="text-5xl font-black tracking-tight" style={{ color: '#FF6600' }}>BipAir</span>
          </div>
          <p className="text-gray-400 mt-1 text-sm">Airline Management System</p>
        </div>

        <Card className="bg-gray-900 border-gray-800 shadow-2xl">
          <CardHeader className="pb-2 pt-6">
            <h2 className="text-white text-xl font-semibold text-center">Admin Sign In</h2>
            <p className="text-gray-500 text-xs text-center mt-1">Enter your credentials to continue</p>
          </CardHeader>
          <CardContent className="pt-4 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-300 text-sm">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="admin"
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 h-11"
                  disabled={isWorking}
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300 text-sm">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 h-11"
                  disabled={isWorking}
                  autoComplete="current-password"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-900/40 border border-red-700/60 text-red-300 text-sm px-3 py-2.5 rounded-lg flex items-center gap-2">
                  <span className="text-red-400 font-bold">✕</span>
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-900/40 border border-green-700/60 text-green-300 text-sm px-3 py-2.5 rounded-lg flex items-center gap-2">
                  <span className="font-bold">✓</span>
                  Login successful! Redirecting...
                </div>
              )}

              <Button
                type="submit"
                disabled={isWorking}
                className="w-full text-white font-semibold h-11 text-base transition-all duration-200"
                style={{ backgroundColor: '#FF6600', opacity: isWorking ? 0.85 : 1 }}
              >
                {success ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Redirecting to dashboard...
                  </span>
                ) : loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-gray-600 text-xs mt-6">
          BipAir Demo System &copy; 2026
        </p>
      </div>
    </div>
  );
}
