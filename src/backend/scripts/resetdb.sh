#!/bin/bash

echo "🔄 Resetting test database..."
NODE_ENV=testing npx prisma migrate reset --force

if [ $? -eq 0 ]; then
    echo "✅ Test database reset complete"
else
    echo "❌ Database reset failed"
    exit 1
fi