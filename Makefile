.PHONY: build up down logs restart clean config deploy deploy-volcano

# 从统一配置生成环境变量
config:
	@echo "📝 生成环境变量文件..."
	@chmod +x scripts/generate-env.sh
	@./scripts/generate-env.sh

# 构建所有镜像
build: config
	@echo "🔨 构建 Docker 镜像..."
	docker-compose build

# 启动服务（不包含代理）
up: config
	@echo "🚀 启动服务..."
	docker-compose up -d

# 启动服务（包含火山引擎代理）
up-volcano: config
	@echo "🚀 启动服务（包含火山引擎代理）..."
	docker-compose --profile volcano up -d

# 停止服务
down:
	@echo "🛑 停止服务..."
	docker-compose down

# 查看日志
logs:
	docker-compose logs -f

# 重启服务
restart:
	@echo "🔄 重启服务..."
	docker-compose restart

# 清理（包括数据）
clean:
	@echo "🧹 清理资源..."
	docker-compose down -v
	docker system prune -f

# 快速部署（构建+启动）
deploy: build up
	@echo "✅ 部署完成！"
	@echo "前端: http://localhost"
	@echo "后端: http://localhost:3002"

# 快速部署（包含代理）
deploy-volcano: build up-volcano
	@echo "✅ 部署完成（包含火山引擎代理）！"
	@echo "前端: http://localhost"
	@echo "后端: http://localhost:3002"
	@echo "代理: http://localhost:3001"

# 推送镜像到 DockerHub
push-images:
	@if [ -z "$(DOCKERHUB_USERNAME)" ]; then \
		echo "❌ 错误: 请设置 DOCKERHUB_USERNAME 环境变量"; \
		echo "使用方式: export DOCKERHUB_USERNAME=your-username && make push-images"; \
		exit 1; \
	fi
	@chmod +x scripts/push-to-dockerhub.sh
	@./scripts/push-to-dockerhub.sh $(DOCKERHUB_USERNAME)

# 从 DockerHub 拉取并部署（生产环境）
deploy-prod:
	@if [ ! -f "config.env" ]; then \
		echo "❌ 错误: 未找到 config.env 文件"; \
		echo "请先复制 config.env.example 为 config.env 并填入配置"; \
		exit 1; \
	fi
	@echo "📦 从 DockerHub 拉取镜像..."
	@source config.env && docker-compose -f docker-compose.prod.yml pull
	@echo "🚀 启动服务..."
	@source config.env && docker-compose -f docker-compose.prod.yml up -d
	@echo "✅ 部署完成！"

# 检查配置
check-config:
	@if [ ! -f "config.env" ]; then \
		echo "❌ 错误: 找不到 config.env 文件"; \
		echo "请先复制 config.env.example 为 config.env 并填入配置"; \
		exit 1; \
	fi
	@echo "✅ 配置文件存在"
	@echo ""
	@echo "当前配置:"
	@grep -v "^#" config.env | grep -v "^$$" | sed 's/=.*/=***/' || true