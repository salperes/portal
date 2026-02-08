import { Settings as SettingsIcon, Construction } from 'lucide-react';

export default function Settings() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Hesap Ayarları</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Construction className="w-16 h-16 mx-auto mb-4 text-yellow-500 opacity-60" />
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Yapım Aşamasında</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Hesap ayarları sayfası yakında kullanıma sunulacaktır.
        </p>
      </div>
    </div>
  );
}
