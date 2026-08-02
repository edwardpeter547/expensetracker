# Makefile for Expense Tracker Monorepo (with npm workspaces)

PACKAGE_MANAGER = npm
BACKEND = backend
MOBILE = mobile

.PHONY: help
help:
	@echo "Expense Tracker Monorepo Commands:"
	@echo "  make install        		- Install all dependencies (uses workspaces)"
	@echo "  make start-backend-dev  	- Start backend server"
	@echo "  make start-mobile   		- Start mobile app"
	@echo "  make test           		- Test all projects"
	@echo "  make test-backend   		- Test backend only"
	@echo "  make test-mobile    		- Test mobile only"
	@echo "  make build          		- Build all projects"
	@echo "  make build-backend  		- Build backend only"
	@echo "  make build-mobile   		- Build mobile only"
	@echo "  make clean          		- Clean everything"
	@echo "  make add-pkg PKG=express WORKSPACE=backend - Install package"

# Install all dependencies using workspaces
install:
	$(PACKAGE_MANAGER) install

# Start backend
start-backend-dev:
	$(PACKAGE_MANAGER) run dev --workspace=$(BACKEND)

# Start mobile
start-mobile:
	$(PACKAGE_MANAGER) run start --workspace=$(MOBILE)

# Test all
test:
	$(PACKAGE_MANAGER) test --workspaces

# Test specific workspace
test-backend:
	$(PACKAGE_MANAGER) test --workspace=$(BACKEND)

test-mobile:
	$(PACKAGE_MANAGER) test --workspace=$(MOBILE)

# Build all
build:
	$(PACKAGE_MANAGER) run build --workspaces

build-backend:
	$(PACKAGE_MANAGER) run build --workspace=$(BACKEND)

build-mobile:
	$(PACKAGE_MANAGER) run build --workspace=$(MOBILE)

# Clean
clean:
	rm -rf node_modules
	rm -rf $(BACKEND)/node_modules
	rm -rf $(MOBILE)/node_modules
	rm -rf $(BACKEND)/dist
	rm -rf $(MOBILE)/dist

# Install package in specific workspace
add-pkg:
	$(PACKAGE_MANAGER) install $(PKG) --workspace=$(WORKSPACE)

# Git helpers
status:
	git status

commit:
	git add .
	git commit -m "$(MSG)"