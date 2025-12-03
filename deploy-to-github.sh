#!/bin/bash

# 🚀 GitHub Pages Deployment Script
# Ovaj script automatski postavlja GitHub repository i pokreće deployment

echo "🎯 GitHub Pages Deployment Setup"
echo "=================================="
echo ""

# Boje za output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Provera da li je Git instaliran
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git nije instaliran. Molimo instalirajte Git prvo.${NC}"
    exit 1
fi

echo -e "${BLUE}📝 Molimo unesite sledeće informacije:${NC}"
echo ""

# Unos GitHub username
read -p "GitHub username: " GITHUB_USERNAME
if [ -z "$GITHUB_USERNAME" ]; then
    echo -e "${RED}❌ GitHub username je obavezan!${NC}"
    exit 1
fi

# Unos repository name
read -p "Repository name (npr. radio-website): " REPO_NAME
if [ -z "$REPO_NAME" ]; then
    echo -e "${RED}❌ Repository name je obavezan!${NC}"
    exit 1
fi

# Provera da li već postoji remote
if git remote get-url origin &> /dev/null; then
    echo -e "${YELLOW}⚠️  Remote 'origin' već postoji. Želite li da ga zamenite? (y/n)${NC}"
    read -p "" REPLACE_REMOTE
    if [ "$REPLACE_REMOTE" = "y" ]; then
        git remote remove origin
        echo -e "${GREEN}✅ Stari remote uklonjen${NC}"
    else
        echo -e "${YELLOW}⚠️  Zadržavam postojeći remote${NC}"
    fi
fi

# Provera da li je Git repository inicijalizovan
if [ ! -d ".git" ]; then
    echo -e "${BLUE}📦 Inicijalizujem Git repository...${NC}"
    git init
    echo -e "${GREEN}✅ Git repository inicijalizovan${NC}"
fi

# Dodavanje remote
REPO_URL="https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"
echo -e "${BLUE}🔗 Dodajem remote: ${REPO_URL}${NC}"
git remote add origin "$REPO_URL" 2>/dev/null || git remote set-url origin "$REPO_URL"
echo -e "${GREEN}✅ Remote dodat${NC}"

# Provera da li postoje uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${BLUE}📝 Dodajem sve fajlove...${NC}"
    git add .
    
    echo -e "${BLUE}💾 Pravim commit...${NC}"
    git commit -m "Initial commit - Radio website with GitHub Pages deployment"
    echo -e "${GREEN}✅ Commit kreiran${NC}"
else
    echo -e "${YELLOW}⚠️  Nema novih izmena za commit${NC}"
fi

# Push na GitHub
echo -e "${BLUE}🚀 Push-ujem na GitHub...${NC}"
git branch -M main

# Provera da li je push uspešan
if git push -u origin main; then
    echo -e "${GREEN}✅ Kod uspešno push-ovan na GitHub!${NC}"
else
    echo -e "${RED}❌ Push nije uspeo. Molimo proverite:${NC}"
    echo -e "${YELLOW}   1. Da li ste kreirali repository na GitHub-u?${NC}"
    echo -e "${YELLOW}   2. Da li ste ulogovani u Git?${NC}"
    echo -e "${YELLOW}   3. Da li imate pristup repository-ju?${NC}"
    echo ""
    echo -e "${BLUE}💡 Pokušajte ručno:${NC}"
    echo "   git push -u origin main"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Uspešno!${NC}"
echo ""
echo -e "${BLUE}📋 Sledeći koraci:${NC}"
echo ""
echo "1. Idite na: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}/settings/secrets/actions"
echo "   Dodajte sledeće secrets:"
echo ""
echo "   ${YELLOW}VITE_SUPABASE_URL${NC}"
echo "   Value: https://huyiaierkscuhxlvvtit.supabase.co"
echo ""
echo "   ${YELLOW}VITE_SUPABASE_ANON_KEY${NC}"
echo "   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1eWlhaWVya3NjdWh4bHZ2dGl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMTU3MzUsImV4cCI6MjA3ODc5MTczNX0.4oVlCI8aiLRoM8tLGldVl9vRoYr_Mb4-Kk7SIPhJuPA"
echo ""
echo "2. Idite na: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}/settings/pages"
echo "   - Source: Deploy from a branch"
echo "   - Branch: gh-pages / (root)"
echo ""
echo "3. Sačekajte 2-3 minuta da se deployment završi"
echo ""
echo "4. Vaš sajt će biti dostupan na:"
echo "   ${GREEN}https://${GITHUB_USERNAME}.github.io/${REPO_NAME}/${NC}"
echo ""
echo -e "${BLUE}🔄 Za buduća ažuriranja, samo:${NC}"
echo "   git add ."
echo "   git commit -m 'Opis izmena'"
echo "   git push"
echo ""
echo -e "${GREEN}✨ Sajt će se automatski ažurirati za 2-3 minuta!${NC}"
echo ""
