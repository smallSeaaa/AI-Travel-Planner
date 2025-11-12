# 使用 Node 构建前端项目
FROM node:18 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# 构建时可以通过ARG传入环境变量，也可以在运行时通过Docker环境变量覆盖
RUN npm run build

# 使用 Nginx 提供静态资源服务
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# 添加Nginx配置以支持环境变量注入
COPY <<'EOF' /etc/nginx/templates/default.conf.template
server {
    listen       80;
    server_name  localhost;

    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
        try_files $uri $uri/ /index.html;
    }
}
EOF

# 设置默认环境变量（示例值，运行时应覆盖）
ENV VITE_SUPABASE_URL=https://dbbjwzpilhzxidrttyur.supabase.co
ENV VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiYmp3enBpbGh6eGlkcnR0eXVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTU0ODksImV4cCI6MjA3NzEzMTQ4OX0.UGnQ7ftOd_SRqnEo0aMSqovIIhcj92qeFBYlbz0sq2c

# 添加启动脚本以注入环境变量到静态文件
COPY <<'EOF' /docker-entrypoint.d/20-inject-env.sh
#!/bin/sh
set -e

# 创建环境变量配置文件
cat > /usr/share/nginx/html/env-config.js << 'EOL'
window.env = {
  VITE_SUPABASE_URL: "$VITE_SUPABASE_URL",
  VITE_SUPABASE_ANON_KEY: "$VITE_SUPABASE_ANON_KEY",
  VITE_LLM_API_KEY: "$VITE_LLM_API_KEY",
  VITE_LLM_API_BASE_URL: "$VITE_LLM_API_BASE_URL",
  VITE_BAIDU_MAP_API_KEY: "$VITE_BAIDU_MAP_API_KEY"
};
EOL
chmod +x /docker-entrypoint.d/20-inject-env.sh
EOF

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]