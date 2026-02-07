export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    username: process.env.DB_USERNAME || 'portal',
    password: process.env.DB_PASSWORD || 'portal123',
    database: process.env.DB_DATABASE || 'portal',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  ldap: {
    url: process.env.LDAP_URL || 'ldap://localhost:389',
    baseDN: process.env.LDAP_BASE_DN || 'DC=sirket,DC=local',
    bindDN: process.env.LDAP_BIND_DN || '',
    bindPassword: process.env.LDAP_BIND_PASSWORD || '',
    searchFilter: process.env.LDAP_SEARCH_FILTER || '(sAMAccountName={{username}})',
  },

  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
    bucket: process.env.MINIO_BUCKET || 'portal-documents',
  },

  rms: {
    url: process.env.RMS_URL || 'http://localhost:8080',
    ssoSecretKey: process.env.RMS_SSO_SECRET_KEY || '',
  },

  fileServer: {
    host: process.env.FILE_SERVER_HOST || 'dosya.mss.local',
    domain: process.env.FILE_SERVER_DOMAIN || 'MSS',
    encryptionKey: process.env.FILE_SERVER_ENCRYPTION_KEY || 'dev-encryption-key-32-characters!',
    shares: process.env.FILE_SERVER_SHARES || '',
  },

  onlyoffice: {
    serverUrl: process.env.ONLYOFFICE_SERVER_URL || 'http://portal-test-onlyoffice',
    jwtSecret: process.env.ONLYOFFICE_JWT_SECRET || 'portal-onlyoffice-secret-key-2024',
    // Internal API URL that ONLYOFFICE container can reach through Docker network
    internalApiUrl: process.env.ONLYOFFICE_INTERNAL_API_URL || 'http://portal-test-api:3000',
  },
});
