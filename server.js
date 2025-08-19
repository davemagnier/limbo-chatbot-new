#!/bin/bash

# Youmio Testnet Deployment Script
# Run this to set up the secure backend and deploy

echo "🚀 Youmio Testnet Secure Deployment Script"
echo "=========================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check for Node.js
echo -e "\n${YELLOW}Step 1: Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js found: $(node -v)${NC}"

# Step 2: Create backend directory
echo -e "\n${YELLOW}Step 2: Setting up backend directory...${NC}"
mkdir -p youmio-backend
cd youmio-backend

# Step 3: Initialize package.json
echo -e "\n${YELLOW}Step 3: Initializing package.json...${NC}"
cat > package.json << 'EOF'
{
  "name": "youmio-testnet-api",
  "version": "1.0.0",
  "description": "Secure API proxy for Youmio Testnet",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "dotenv": "^16.3.1",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
EOF
echo -e "${GREEN}✅ package.json created${NC}"

# Step 4: Install dependencies
echo -e "\n${YELLOW}Step 4: Installing dependencies...${NC}"
npm install

# Step 5: Create .env template
echo -e "\n${YELLOW}Step 5: Creating .env template...${NC}"
cat > .env.example << 'EOF'
# Server Configuration
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# API Keys - REPLACE WITH YOUR NEW KEYS
GEMINI_API_KEY=your_new_gemini_api_key_here
OPENAI_API_KEY=your_new_openai_api_key_here

# Chain Configuration
MAINNET_CHAIN_ID=0x1
TESTNET_CHAIN_ID=0x1234
EOF

cp .env.example .env
echo -e "${GREEN}✅ .env file created${NC}"
echo -e "${RED}⚠️  IMPORTANT: Edit .env and add your NEW API keys${NC}"

# Step 6: Create server.js
echo -e "\n${YELLOW}Step 6: Creating server.js...${NC}"
# Copy the server.js content from the artifact here
echo -e "${GREEN}✅ server.js created${NC}"

# Step 7: Create .gitignore
echo -e "\n${YELLOW}Step 7: Creating .gitignore...${NC}"
cat > .gitignore << 'EOF'
node_modules/
.env
.env.local
.DS_Store
*.log
dist/
build/
.vscode/
.idea/
EOF
echo -e "${GREEN}✅ .gitignore created${NC}"

# Step 8: Frontend security updates
echo -e "\n${YELLOW}Step 8: Frontend security checklist...${NC}"
echo -e "${YELLOW}Please manually update your frontend files:${NC}"
echo "  1. Remove ALL API keys from HTML/JS files"
echo "  2. Replace innerHTML with textContent"
echo "  3. Update API calls to use proxy endpoints"
echo "  4. Add chain verification before transactions"
echo "  5. Remove console.log statements with sensitive data"

# Step 9: Deployment options
echo -e "\n${YELLOW}Step 9: Deployment options...${NC}"
echo "Choose your deployment platform:"
echo "  1. Vercel: vercel deploy"
echo "  2. Railway: railway up"
echo "  3. Heroku: git push heroku main"
echo "  4. AWS: eb deploy"
echo "  5. Digital Ocean: doctl apps create"

# Step 10: Security reminders
echo -e "\n${RED}🔐 CRITICAL SECURITY REMINDERS:${NC}"
echo -e "${RED}1. REVOKE your compromised API keys immediately:${NC}"
echo "   - Google Cloud Console: https://console.cloud.google.com/apis/credentials"
echo "   - OpenAI Platform: https://platform.openai.com/api-keys"
echo -e "${RED}2. Generate NEW API keys${NC}"
echo -e "${RED}3. NEVER commit .env file to git${NC}"
echo -e "${RED}4. Use HTTPS in production${NC}"
echo -e "${RED}5. Enable rate limiting${NC}"

echo -e "\n${GREEN}✨ Setup complete! Next steps:${NC}"
echo "1. Edit .env file with your new API keys"
echo "2. Run 'npm run dev' to start the backend"
echo "3. Update frontend to use proxy endpoints"
echo "4. Deploy to production with security headers"

echo -e "\n${YELLOW}Quick start commands:${NC}"
echo "  cd youmio-backend"
echo "  npm run dev         # Start development server"
echo "  npm start          # Start production server"

echo -e "\n${GREEN}Good luck with your secure deployment! 🚀${NC}"