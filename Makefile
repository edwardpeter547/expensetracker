# Makefile for Expense Tracker Monorepo

PACKAGE_MANAGER = npm
BACKEND = backend
MOBILE = mobile

.PHONY: help
help:
	@echo "Expense Tracker Monorepo Commands:"
	@echo "  make install        			- Install all dependencies in mobile and backend"
	@echo "  make install-mobile 			- Install mobile dependencies only"
	@echo "  make install-backend 			- Install backend dependencies only"
	@echo "  make start-backend-dev  		- Start backend development server"
	@echo "  make start-backend  			- Start backend production server"
	@echo "  make start-mobile   			- Start mobile app"
	@echo "  make start-mobile-web   		- Start mobile app in web mode"
	@echo "  make start-mobile-tunnel   	- Start mobile app in tunnel mode"
	@echo "  make start-mobile-lan    		- Start mobile app in LAN mode"
	@echo "  make test-all           		- Test all projects backend and mobile"
	@echo "  make test-backend   			- Test backend only"
	@echo "  make test-mobile    			- Test mobile only"
	@echo "  make clean-all          		- Clean everything both mobile and backend"
	@echo "  make clean-mobile          	- Clean everything in mobile"
	@echo "  make clean-backend         	- Clean everything in backend"
	@echo "  make add-pkg-backend			- Install a package in the backend" 
	@echo "  make add-pkg-backend-dev		- Install a development only package in the backend"
	@echo "  make add-pkg-mobile			- Install a package in the mobile"
	@echo "  make add-pkg-mobile-dev		- Install a development only package in the mobile"

# Install all dependencies
install:
	cd $(BACKEND) && $(PACKAGE_MANAGER) install
	cd $(MOBILE) && $(PACKAGE_MANAGER) install

install-mobile:
	cd $(MOBILE) && $(PACKAGE_MANAGER) install

install-backend:
	cd $(BACKEND) && $(PACKAGE_MANAGER) install

clean-all:
	cd $(BACKEND) && $(PACKAGE_MANAGER) run clean
	cd $(MOBILE) &&  $(PACKAGE_MANAGER) run clean

clean-mobile:
	cd $(MOBILE) &&  $(PACKAGE_MANAGER) run clean

clean-backend: 
	cd $(BACKEND) && $(PACKAGE_MANAGER) run clean

# Start backend development
start-backend-dev:
	cd $(BACKEND) && $(PACKAGE_MANAGER) run start:dev

# Start backend production
start-backend-prod:
	cd $(BACKEND) && $(PACKAGE_MANAGER) run start

# Start mobile
start-mobile:
	cd $(MOBILE) && $(PACKAGE_MANAGER) run start

start-mobile-web:
	cd $(MOBILE) && $(PACKAGE_MANAGER) run start:web

start-mobile-tunnel:
	cd $(MOBILE) && $(PACKAGE_MANAGER) run start:tunnel

start-mobile-lan:
	cd $(MOBILE) && $(PACKAGE_MANAGER) run start:lan

# Run All Test Suites Backend and Frontend (Unittest/Integration)
test-all:
	cd $(BACKEND) && $(PACKAGE_MANAGER) run test
	cd $(MOBILE) && $(PACKAGE_MANAGER) run test

# Run backend test (Unitest/Integration)
test-backend:
	cd $(BACKEND) && $(PACKAGE_MANAGER) run test

# Run backend test with watch (Unitest/Integration)
test-backend-watch:
	cd $(BACKEND) && $(PACKAGE_MANAGER) run test:watch

# Run mobile test (Unitest/Integration)
test-mobile:
	cd $(MOBILE) && $(PACKAGE_MANAGER) run test

# Install package in Backend
add-pkg-backend:
	cd $(BACKEND) && $(PACKAGE_MANAGER) install $(PKG) 

# Install development only package in backend
add-pkg-backend-dev:
	cd $(BACKEND) && $(PACKAGE_MANAGER) install $(PKG) --save-dev

# Install package in backend
add-pkg-backend:
	cd $(BACKEND) && $(PACKAGE_MANAGER) install $(PKG)

# Install development package in mobile
add-pkg-mobile-dev:
	cd $(MOBILE) && $(PACKAGE_MANAGER) install $(PKG) --save-dev

# Install package in mobile
add-pkg-mobile:
	cd $(MOBILE) && $(PACKAGE_MANAGER) install $(PKG)

# Git helpers
status:
	git status

commit-changes:
	git add .
	git commit -m "$(MSG)"