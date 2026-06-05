#!/bin/bash

# E-Logbook Mobile Development Setup Script
# This script helps setup the backend for Flutter mobile app development

echo "🚀 E-Logbook Mobile Development Setup"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

print_status "Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_status "npm found: $(npm --version)"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_info "Installing dependencies..."
    npm install
    print_status "Dependencies installed"
else
    print_status "Dependencies already installed"
fi

# Copy mobile environment configuration
if [ ! -f ".env" ]; then
    if [ -f ".env.mobile.example" ]; then
        cp .env.mobile.example .env
        print_status "Mobile environment configuration copied to .env"
    else
        print_warning ".env.mobile.example not found, using default .env.example"
        if [ -f ".env.example" ]; then
            cp .env.example .env
        fi
    fi
else
    print_info ".env file already exists"
fi

# Get local IP addresses
print_info "Detecting network interfaces..."
if command -v ip &> /dev/null; then
    # Linux
    LOCAL_IPS=$(ip route get 1.1.1.1 | grep -oP 'src \K\S+')
elif command -v ifconfig &> /dev/null; then
    # macOS/BSD
    LOCAL_IPS=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}')
else
    # Windows (if running in Git Bash or WSL)
    LOCAL_IPS=$(ipconfig | grep "IPv4" | awk '{print $NF}' | tr -d '\r')
fi

echo ""
print_info "📱 Mobile App Configuration"
echo "=========================="
echo "Use these IP addresses in your Flutter app:"
echo ""

if [ -n "$LOCAL_IPS" ]; then
    for ip in $LOCAL_IPS; do
        echo "  📍 http://$ip:5000/api (Public WiFi Access)"
    done
else
    echo "  📍 http://0.0.0.0:5000/api (All interfaces)"
    echo "  📍 http://192.168.1.100:5000/api (replace with your public WiFi IP)"
fi

echo ""
print_info "🔧 Update your Flutter app configuration:"
echo "class ApiConfig {"
echo "  static const String baseUrl = 'http://YOUR_PUBLIC_WIFI_IP:5000/api';"
echo "  static const String mobileBaseUrl = '\$baseUrl/mobile';"
echo "}"

echo ""
print_info "📚 Documentation URLs:"
echo "  🌐 Swagger UI: http://localhost:5000/api-docs"
echo "  📄 Mobile API Guide: ./MOBILE_API_GUIDE.md"
echo "  🏥 Health Check: http://localhost:5000/health"

echo ""
print_info "👥 Default Mobile Test Users:"
echo "  📧 Email: nahkoda@test.com | Password: password123 | Role: nahkoda"
echo "  📧 Email: abk@test.com | Password: password123 | Role: abk"

echo ""
print_warning "🔐 Security Notes for Mobile Development:"
echo "  • CORS is configured for development (allows all origins)"
echo "  • Rate limiting is relaxed for mobile endpoints"
echo "  • JWT tokens are valid for 7 days"
echo "  • Only 'nahkoda' and 'abk' roles can access mobile endpoints"

echo ""
print_info "🚀 Starting development server..."
echo "Run: npm run dev"
echo ""

# Check if MySQL is running (optional)
if command -v mysql &> /dev/null; then
    if mysql -u root -e "SELECT 1;" &> /dev/null; then
        print_status "MySQL is running"
    else
        print_warning "MySQL might not be running. Make sure your database is accessible."
    fi
fi

echo ""
print_status "Mobile development setup complete!"
print_info "Next steps:"
echo "  1. Start the server: npm run dev"
echo "  2. Open Swagger UI: http://localhost:5000/api-docs"
echo "  3. Test mobile endpoints with your Flutter app"
echo "  4. Check MOBILE_API_GUIDE.md for detailed integration guide"
echo ""