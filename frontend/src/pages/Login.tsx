import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(username, password);
      navigate('/');
    } catch {
      setError('Geçersiz kullanıcı adı veya şifre');
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2] dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Microsoft Style Login Card */}
        <div className="bg-white dark:bg-gray-800 shadow-lg p-11">
          {/* Company Logo */}
          <div className="mb-6">
            <img
              src="/logo.svg"
              alt="MSS Logo"
              className="h-12 w-auto"
            />
          </div>

          <h1 className="text-2xl font-light text-gray-900 dark:text-white mb-2">Oturum açın</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">MSS Portal hesabınız</p>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-[#fde7e9] border-l-4 border-[#a80000] text-[#a80000] text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Oturum açılamıyor</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border-b-2 border-gray-300 dark:border-gray-600 bg-[#f2f2f2] dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-[#0078d4] focus:bg-white dark:focus:bg-gray-600 transition-colors"
                placeholder="Kullanıcı adı"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                john.doe, mss\john.doe veya john.doe@msspektral.com
              </p>
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border-b-2 border-gray-300 dark:border-gray-600 bg-[#f2f2f2] dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-[#0078d4] focus:bg-white dark:focus:bg-gray-600 transition-colors"
                placeholder="Şifre"
                required
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-[#0078d4] hover:bg-[#106ebe] text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Oturum açılıyor...
                  </>
                ) : (
                  'Oturum aç'
                )}
              </button>
            </div>
          </form>

          {/* Footer Links - Microsoft Style */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Active Directory hesabınızla giriş yapın
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} MSS. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </div>
  );
}
