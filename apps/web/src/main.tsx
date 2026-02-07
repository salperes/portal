/**
 * @portal/web - Web Shell Entry Point
 *
 * Ana React uygulaması giriş noktası.
 * Modüller lazy loading ile yüklenir.
 *
 * NOT: Şu anda frontend/ klasörü ana uygulama olarak kullanılıyor.
 * Bu dosya, gelecekte tam modüler geçiş için hazırlanmıştır.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
