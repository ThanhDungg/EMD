export default function configuration() {
  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  database: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev_secret',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev_refresh_secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  security: {
    // Pepper trộn vào mật khẩu trước khi hash (chuẩn: salt tự sinh trong bcrypt + pepper trong env)
    passwordPepper: process.env.PASSWORD_PEPPER ?? 'dev_pepper',
    bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10),
  },
  upload: {
    // Thư mục lưu ảnh trên disk (ngoài public, chỉ đọc được qua API có token).
    dir: process.env.UPLOAD_DIR ?? 'uploads',
    // Đường dẫn tương đối từ origin API tới thư mục trên (dùng cho static).
    basePath: process.env.UPLOAD_BASE_PATH ?? 'uploads',
    maxFileSize: Number(process.env.UPLOAD_MAX_FILE_SIZE ?? 10 * 1024 * 1024),
    maxFiles: Number(process.env.UPLOAD_MAX_FILES ?? 10),
  },
  };
}

export type AppConfig = ReturnType<typeof configuration>;
