# Conquest Game - Development Makefile

# Default target
.DEFAULT_GOAL := help

# Variables
NODE_BIN := ./node_modules/.bin
PORT := 3000

# Colors for output
BLUE := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
NC := \033[0m # No Color

.PHONY: help install build dev start test clean lint format check-deps serve-client stop logs

help: ## Show this help message
	@echo "$(BLUE)Conquest Game - Available Commands:$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ { printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

install: ## Install all dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	npm install

build: ## Build TypeScript to JavaScript
	@echo "$(BLUE)Building TypeScript...$(NC)"
	npm run build

dev: ## Start development server with auto-reload
	@echo "$(BLUE)Starting development server on port $(PORT)...$(NC)"
	@echo "$(YELLOW)Game will be available at: http://localhost:$(PORT)$(NC)"
	npm run dev

start: build ## Build and start production server
	@echo "$(BLUE)Starting production server on port $(PORT)...$(NC)"
	@echo "$(YELLOW)Game will be available at: http://localhost:$(PORT)$(NC)"
	npm start

serve-client: ## Serve only the client files (for frontend development)
	@echo "$(BLUE)Starting client development server on port 3001...$(NC)"
	@echo "$(YELLOW)Client will be available at: http://localhost:3001$(NC)"
	npm run client

test: ## Run tests (placeholder for future implementation)
	@echo "$(YELLOW)Tests not yet implemented$(NC)"
	@echo "$(BLUE)You can add test scripts here when ready$(NC)"

lint: ## Run linting (placeholder for future implementation)
	@echo "$(YELLOW)Linting not yet configured$(NC)"
	@echo "$(BLUE)Consider adding ESLint: npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin$(NC)"

format: ## Format code (placeholder for future implementation)
	@echo "$(YELLOW)Code formatting not yet configured$(NC)"
	@echo "$(BLUE)Consider adding Prettier: npm install --save-dev prettier$(NC)"

clean: ## Clean build artifacts and dependencies
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	rm -rf dist/
	rm -rf node_modules/
	rm -f package-lock.json

rebuild: clean install build ## Clean, install, and rebuild everything
	@echo "$(GREEN)Rebuild complete!$(NC)"

check-deps: ## Check for outdated dependencies
	@echo "$(BLUE)Checking for outdated dependencies...$(NC)"
	npm outdated || true

update-deps: ## Update all dependencies to latest versions
	@echo "$(BLUE)Updating dependencies...$(NC)"
	npm update

stop: ## Stop any running Node.js processes on the default port
	@echo "$(BLUE)Stopping processes on port $(PORT)...$(NC)"
	-lsof -ti:$(PORT) | xargs kill -9 2>/dev/null || echo "$(YELLOW)No processes found on port $(PORT)$(NC)"

logs: ## Show logs from running processes (if using PM2 or similar)
	@echo "$(YELLOW)Log viewing not configured - processes run in foreground$(NC)"
	@echo "$(BLUE)For production, consider using PM2: npm install -g pm2$(NC)"

setup: install build ## Initial project setup
	@echo "$(GREEN)Project setup complete!$(NC)"
	@echo "$(BLUE)Run 'make dev' to start development server$(NC)"

docker-build: ## Build Docker image (placeholder)
	@echo "$(YELLOW)Docker not yet configured$(NC)"
	@echo "$(BLUE)Consider adding Dockerfile for containerized deployment$(NC)"

docker-run: ## Run Docker container (placeholder)
	@echo "$(YELLOW)Docker not yet configured$(NC)"

deploy: ## Deploy to production (placeholder)
	@echo "$(YELLOW)Deployment not yet configured$(NC)"
	@echo "$(BLUE)Consider adding deployment scripts for your target platform$(NC)"

# Development workflow shortcuts
quick-start: install dev ## Quick setup and start development

restart: stop dev ## Restart development server

status: ## Show project status
	@echo "$(BLUE)Project Status:$(NC)"
	@echo "Node version: $(shell node --version 2>/dev/null || echo 'Not installed')"
	@echo "NPM version: $(shell npm --version 2>/dev/null || echo 'Not installed')"
	@echo "Dependencies installed: $(shell [ -d node_modules ] && echo 'Yes' || echo 'No')"
	@echo "TypeScript compiled: $(shell [ -d dist ] && echo 'Yes' || echo 'No')"
	@echo "Port $(PORT) in use: $(shell lsof -ti:$(PORT) >/dev/null 2>&1 && echo 'Yes' || echo 'No')"

# Maintenance commands
backup: ## Create backup of source code
	@echo "$(BLUE)Creating backup...$(NC)"
	tar -czf conquest-backup-$(shell date +%Y%m%d-%H%M%S).tar.gz src/ public/ package.json tsconfig.json README.md Makefile

restore: ## Instructions for restoring from backup
	@echo "$(BLUE)To restore from backup:$(NC)"
	@echo "tar -xzf conquest-backup-YYYYMMDD-HHMMSS.tar.gz"

# Help for common development tasks
dev-help: ## Show development workflow help
	@echo "$(BLUE)Common Development Workflow:$(NC)"
	@echo ""
	@echo "$(GREEN)Initial Setup:$(NC)"
	@echo "  make setup              # Install deps and build"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make dev               # Start dev server with hot reload"
	@echo "  make serve-client      # Start client-only server"
	@echo ""
	@echo "$(GREEN)Testing & Building:$(NC)"
	@echo "  make build             # Compile TypeScript"
	@echo "  make start             # Start production server"
	@echo ""
	@echo "$(GREEN)Maintenance:$(NC)"
	@echo "  make clean             # Remove build files and deps"
	@echo "  make rebuild           # Full clean rebuild"
	@echo "  make status            # Check project status"