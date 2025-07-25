#!/bin/bash
# cleanup-docs.sh - Script tự động dọn dẹp documentation

echo "🧹 Bắt đầu dọn dẹp documentation..."

# Tạo cấu trúc thư mục
echo "📁 Tạo cấu trúc thư mục..."
mkdir -p docs/{setup,development,reports}
mkdir -p archive/$(date +%Y-%m-%d)

# Di chuyển files theo category
echo "📂 Tổ chức files theo category..."

# Setup files
echo "  → Setup files..."
[ -f "OKX_SETUP_GUIDE.md" ] && mv OKX_SETUP_GUIDE.md docs/setup/okx-setup.md && echo "    ✅ OKX_SETUP_GUIDE.md → docs/setup/okx-setup.md"
[ -f "HUONG_DAN_CHAY_BOT.md" ] && mv HUONG_DAN_CHAY_BOT.md docs/setup/bot-guide.md && echo "    ✅ HUONG_DAN_CHAY_BOT.md → docs/setup/bot-guide.md"
[ -f "QUICK_START.md" ] && mv QUICK_START.md docs/setup/quick-start.md && echo "    ✅ QUICK_START.md → docs/setup/quick-start.md"
[ -f "SECURITY.md" ] && mv SECURITY.md docs/setup/security.md && echo "    ✅ SECURITY.md → docs/setup/security.md"

# Development files
echo "  → Development files..."
[ -f "UPGRADE_GUIDE.md" ] && mv UPGRADE_GUIDE.md docs/development/upgrade-guide.md && echo "    ✅ UPGRADE_GUIDE.md → docs/development/upgrade-guide.md"
[ -f "HEALTH_CHECK_FIX.md" ] && mv HEALTH_CHECK_FIX.md docs/development/health-check.md && echo "    ✅ HEALTH_CHECK_FIX.md → docs/development/health-check.md"

# Gộp AI training files
echo "  → Gộp AI training files..."
if [ -f "AI_TRAINING_ISSUES_REPORT.md" ] || [ -f "AI_TRAINING_FIX_SUMMARY.md" ] || [ -f "AI_TRAINING_ANALYSIS.md" ]; then
    echo "# 🤖 AI Training Documentation" > docs/development/ai-training.md
    echo "" >> docs/development/ai-training.md
    echo "Tài liệu tổng hợp về AI Training, bao gồm phân tích vấn đề, giải pháp và kết quả." >> docs/development/ai-training.md
    echo "" >> docs/development/ai-training.md
    
    if [ -f "AI_TRAINING_ISSUES_REPORT.md" ]; then
        echo "---" >> docs/development/ai-training.md
        echo "" >> docs/development/ai-training.md
        cat AI_TRAINING_ISSUES_REPORT.md >> docs/development/ai-training.md
        echo "" >> docs/development/ai-training.md
        rm AI_TRAINING_ISSUES_REPORT.md
        echo "    ✅ AI_TRAINING_ISSUES_REPORT.md → gộp vào ai-training.md"
    fi
    
    if [ -f "AI_TRAINING_FIX_SUMMARY.md" ]; then
        echo "---" >> docs/development/ai-training.md
        echo "" >> docs/development/ai-training.md
        cat AI_TRAINING_FIX_SUMMARY.md >> docs/development/ai-training.md
        echo "" >> docs/development/ai-training.md
        rm AI_TRAINING_FIX_SUMMARY.md
        echo "    ✅ AI_TRAINING_FIX_SUMMARY.md → gộp vào ai-training.md"
    fi
    
    if [ -f "AI_TRAINING_ANALYSIS.md" ]; then
        echo "---" >> docs/development/ai-training.md
        echo "" >> docs/development/ai-training.md
        cat AI_TRAINING_ANALYSIS.md >> docs/development/ai-training.md
        rm AI_TRAINING_ANALYSIS.md
        echo "    ✅ AI_TRAINING_ANALYSIS.md → gộp vào ai-training.md"
    fi
fi

# Reports
echo "  → Reports files..."
[ -f "SCRIPTS_STATUS.md" ] && mv SCRIPTS_STATUS.md docs/reports/scripts-status.md && echo "    ✅ SCRIPTS_STATUS.md → docs/reports/scripts-status.md"
[ -f "SCRIPT_CHECK_REPORT.md" ] && mv SCRIPT_CHECK_REPORT.md docs/reports/script-check.md && echo "    ✅ SCRIPT_CHECK_REPORT.md → docs/reports/script-check.md"
[ -f "SANDBOX_UPDATE_REPORT.md" ] && mv SANDBOX_UPDATE_REPORT.md docs/reports/sandbox-update.md && echo "    ✅ SANDBOX_UPDATE_REPORT.md → docs/reports/sandbox-update.md"

# Project files
echo "  → Project files..."
[ -f "PROJECT_SUMMARY.md" ] && mv PROJECT_SUMMARY.md docs/project-summary.md && echo "    ✅ PROJECT_SUMMARY.md → docs/project-summary.md"
[ -f "CHANGELOG.md" ] && mv CHANGELOG.md docs/changelog.md && echo "    ✅ CHANGELOG.md → docs/changelog.md"

# Archive old files
echo "🗂️ Archive files cũ..."
[ -f "OKX_INTEGRATION_COMPLETE.md" ] && mv OKX_INTEGRATION_COMPLETE.md archive/$(date +%Y-%m-%d)/ && echo "    📦 OKX_INTEGRATION_COMPLETE.md → archive/"

# Xóa file cleanup solution vì đã hoàn thành
[ -f "CLEANUP_SOLUTION.md" ] && rm CLEANUP_SOLUTION.md && echo "    🗑️ Xóa CLEANUP_SOLUTION.md (đã hoàn thành)"

# Tạo index file cho docs
echo "📝 Tạo docs index..."
cat > docs/README.md << 'EOF'
# 📚 Documentation Index

## 🚀 Setup & Configuration
- [Quick Start Guide](setup/quick-start.md) - Hướng dẫn khởi động nhanh
- [OKX Setup](setup/okx-setup.md) - Cấu hình sàn OKX
- [Bot Usage Guide](setup/bot-guide.md) - Hướng dẫn sử dụng bot
- [Security Guidelines](setup/security.md) - Bảo mật và an toàn

## 🔧 Development
- [AI Training](development/ai-training.md) - Huấn luyện và tối ưu AI
- [Health Check](development/health-check.md) - Kiểm tra sức khỏe hệ thống
- [Upgrade Guide](development/upgrade-guide.md) - Hướng dẫn nâng cấp

## 📊 Reports & Status
- [Scripts Status](reports/scripts-status.md) - Trạng thái các scripts
- [Script Check Report](reports/script-check.md) - Báo cáo kiểm tra scripts
- [Sandbox Update](reports/sandbox-update.md) - Cập nhật sandbox

## 📋 Project Info
- [Project Summary](project-summary.md) - Tổng quan dự án
- [Changelog](changelog.md) - Lịch sử thay đổi

---

**📅 Cập nhật**: $(date +"%d/%m/%Y")
EOF

# Cập nhật README chính
echo "📝 Cập nhật README chính..."
if ! grep -q "## 📚 Documentation" README.md; then
    echo "" >> README.md
    echo "## 📚 Documentation" >> README.md
    echo "" >> README.md
    echo "Xem [docs/README.md](docs/README.md) để có danh sách đầy đủ tài liệu." >> README.md
    echo "" >> README.md
    echo "### 🚀 Quick Links:" >> README.md
    echo "- [Quick Start](docs/setup/quick-start.md) - Bắt đầu nhanh" >> README.md
    echo "- [OKX Setup](docs/setup/okx-setup.md) - Cấu hình sàn" >> README.md
    echo "- [Bot Guide](docs/setup/bot-guide.md) - Hướng dẫn bot" >> README.md
    echo "- [AI Training](docs/development/ai-training.md) - Huấn luyện AI" >> README.md
    echo "    ✅ Cập nhật README với links documentation"
fi

# Thống kê kết quả
echo "" 
echo "📊 === KẾT QUẢ CLEANUP ==="
echo "📁 Cấu trúc mới:"
echo "   docs/"
echo "   ├── setup/ ($(ls docs/setup/ 2>/dev/null | wc -l | tr -d ' ') files)"
echo "   ├── development/ ($(ls docs/development/ 2>/dev/null | wc -l | tr -d ' ') files)"
echo "   ├── reports/ ($(ls docs/reports/ 2>/dev/null | wc -l | tr -d ' ') files)"
echo "   └── project files ($(ls docs/*.md 2>/dev/null | wc -l | tr -d ' ') files)"
echo ""
echo "🗂️ Archive: archive/$(date +%Y-%m-%d)/ ($(ls archive/$(date +%Y-%m-%d)/ 2>/dev/null | wc -l | tr -d ' ') files)"
echo ""
echo "✅ Hoàn thành! Documentation đã được tổ chức lại."
echo "📖 Xem docs/README.md để có danh sách đầy đủ tài liệu."
echo "🚀 Root directory giờ đã gọn gàng hơn!"