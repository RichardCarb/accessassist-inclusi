# Deployment Guide

This guide covers different deployment options for AccessAssist, from local development to production hosting.

## 🏠 Local Development

### Quick Start
```bash
# Clone repository
git clone <your-repo-url>
cd spark-template

# Install dependencies
npm install

# Start development server
npm run dev

# Open in browser
open http://localhost:5173
```

### Development with HTTPS (Recommended)
Many browser features (camera, microphone) require HTTPS. For local testing:

```bash
# Install mkcert for local SSL certificates
# macOS
brew install mkcert
mkcert -install

# Windows (using Chocolatey)
choco install mkcert
mkcert -install

# Linux
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
sudo cp mkcert-v*-linux-amd64 /usr/local/bin/mkcert

# Generate certificates
mkcert localhost 127.0.0.1 ::1

# Update vite.config.ts to use HTTPS
```

Then add to `vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync('localhost-key.pem'),
      cert: fs.readFileSync('localhost.pem'),
    },
    host: '0.0.0.0',
    port: 5173
  }
})
```

## 🌐 Static Hosting (Recommended)

AccessAssist is a client-side application that can be deployed to any static hosting service.

### Netlify
```bash
# Build for production
npm run build

# Deploy to Netlify
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

Or connect your GitHub repository to Netlify for automatic deployments.

**Build settings:**
- Build command: `npm run build`
- Publish directory: `dist`
- Node version: `18` or `20`

### Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**vercel.json:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### GitHub Pages
```bash
# Install gh-pages
npm install --save-dev gh-pages

# Add to package.json scripts
"deploy": "gh-pages -d dist"

# Build and deploy
npm run build
npm run deploy
```

**GitHub Actions (`.github/workflows/deploy.yml`):**
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build
      run: npm run build
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

### Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Initialize Firebase
firebase init hosting

# Build and deploy
npm run build
firebase deploy
```

**firebase.json:**
```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

## 🐳 Docker Deployment

### Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf
```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Gzip compression
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";

        # SPA routing
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### Docker Commands
```bash
# Build image
docker build -t accessassist .

# Run container
docker run -p 80:80 accessassist

# With docker-compose
docker-compose up -d
```

### docker-compose.yml
```yaml
version: '3.8'
services:
  accessassist:
    build: .
    ports:
      - "80:80"
    restart: unless-stopped
```

## ☁️ Cloud Platforms

### AWS S3 + CloudFront
```bash
# Build application
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

### Azure Static Web Apps
```bash
# Install Azure CLI
npm install -g @azure/static-web-apps-cli

# Deploy
swa build --app-location . --output-location dist
swa deploy
```

### Google Cloud Storage
```bash
# Build application
npm run build

# Upload to GCS
gsutil -m cp -r dist/* gs://your-bucket-name/

# Set up load balancer and CDN as needed
```

## 🔧 Environment Configuration

### Production Environment Variables
Create `.env.production` for production-specific settings:

```bash
VITE_NODE_ENV=production
VITE_LOG_LEVEL=error
VITE_ENABLE_DEBUG_MODE=false
VITE_API_BASE_URL=https://your-api-domain.com
```

### Security Headers
Ensure your hosting provider sets these security headers:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; connect-src 'self' https://api.openai.com
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## 📊 Performance Optimization

### Build Optimization
```bash
# Analyze bundle size
npm install -g webpack-bundle-analyzer
npm run build
npx webpack-bundle-analyzer dist/assets/*.js
```

### Lighthouse Audit
```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse http://localhost:5173 --view
```

### Service Worker (Optional)
For offline functionality, add a service worker:

```javascript
// public/sw.js
const CACHE_NAME = 'accessassist-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});
```

## 🔍 Monitoring & Analytics

### Error Monitoring
Consider adding error monitoring:

```bash
# Sentry
npm install @sentry/react

# LogRocket
npm install logrocket
```

### Analytics
```bash
# Google Analytics 4
npm install gtag

# Plausible (privacy-focused)
# Add script tag to index.html
```

## 🚨 Troubleshooting

### Common Issues

**Build Failures:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Permission Issues:**
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

**Memory Issues:**
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

**HTTPS Certificate Issues:**
```bash
# Regenerate certificates
mkcert -uninstall
mkcert -install
mkcert localhost
```

### Health Checks
Create health check endpoints:

```typescript
// src/health.ts
export const healthCheck = () => ({
  status: 'healthy',
  timestamp: new Date().toISOString(),
  version: process.env.npm_package_version
});
```

---

Choose the deployment method that best fits your needs. For most use cases, static hosting (Netlify, Vercel) is recommended for simplicity and performance.