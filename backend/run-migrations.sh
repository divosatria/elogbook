#!/bin/bash
echo "🚀 Menjalankan semua migration..."

# Load env
export $(grep -v '^#' .env | xargs)

# JS Migrations
echo "📦 Running JS migrations..."
node src/migrations/create_fishing_points.js
node src/migrations/add_gt_to_catch_polygons.js

# SQL Migrations
echo "🗄️ Running SQL migrations..."
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME << EOF
source migrations/add-fishing-point-fields.sql;
source migrations/add-net-tonnage-to-kapals.sql;
source migrations/add-pelabuhan-asal-id-to-kapals.sql;
source migrations/add-pelabuhan-asal-to-kapals.sql;
EOF

echo "✅ Semua migration selesai!"
