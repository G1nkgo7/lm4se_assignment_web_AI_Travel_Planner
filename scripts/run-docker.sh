#!/usr/bin/env bash
set -euo pipefail

REGISTRY_BASE="crpi-8n6ouezn0x90lnq5.cn-hangzhou.personal.cr.aliyuncs.com/g1nkgo7"
BACKEND_NAME="travel-planner-backend"
FRONTEND_NAME="travel-planner-frontend"

TAG="${1:-latest}"
BACKEND_IMAGE="${REGISTRY_BASE}/${BACKEND_NAME}:${TAG}"
FRONTEND_IMAGE="${REGISTRY_BASE}/${FRONTEND_NAME}:${TAG}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_ENV="${ROOT_DIR}/.env"

if [[ ! -f "${ROOT_ENV}" ]]; then
  echo "[run-docker] 错误：${ROOT_ENV} 不存在，请先创建并填写环境变量。" >&2
  echo "            可参考 .env.example 并避免将真实密钥提交到仓库。" >&2
  exit 1
fi

BACKEND_ENV_FILE="$(mktemp)"
FRONTEND_ENV_FILE="$(mktemp)"

cleanup() {
  rm -f "${BACKEND_ENV_FILE}" "${FRONTEND_ENV_FILE}"
}

trap cleanup EXIT

echo "[run-docker] 根据根目录 .env 生成临时环境文件..."

while IFS= read -r line || [[ -n "${line}" ]]; do
  if [[ -z "${line}" || "${line}" == \#* ]]; then
    continue
  fi

  case "${line}" in
    PORT=*|SUPABASE_*|LLM_*|MAP_API_KEY=*|SPEECH_API_KEY=*|CACHE_REDIS_URL=*)
      printf '%s\n' "${line}" >> "${BACKEND_ENV_FILE}"
      ;;
    NEXT_PUBLIC_*|API_PROXY_TARGET=*)
      printf '%s\n' "${line}" >> "${FRONTEND_ENV_FILE}"
      ;;
  esac
done < "${ROOT_ENV}"

# 覆盖前端代理目标，使其在容器网络内访问后端
grep -v '^API_PROXY_TARGET=' "${FRONTEND_ENV_FILE}" > "${FRONTEND_ENV_FILE}.tmp" || true
mv "${FRONTEND_ENV_FILE}.tmp" "${FRONTEND_ENV_FILE}"
printf '%s\n' "API_PROXY_TARGET=http://travel-backend:8080" >> "${FRONTEND_ENV_FILE}"

if [[ ! -s "${BACKEND_ENV_FILE}" ]]; then
  echo "[run-docker] 提示：临时 backend env 文件为空，请确认 .env 中包含所需后端变量。" >&2
fi

if [[ ! -s "${FRONTEND_ENV_FILE}" ]]; then
  echo "[run-docker] 提示：临时 frontend env 文件为空，请确认 .env 中包含 NEXT_PUBLIC_* 变量。" >&2
fi

echo "[run-docker] 拉取镜像：${BACKEND_IMAGE} 与 ${FRONTEND_IMAGE}"
docker pull "${BACKEND_IMAGE}"
docker pull "${FRONTEND_IMAGE}"

echo "[run-docker] 准备 docker 网络 travel-net"
if ! docker network inspect travel-net >/dev/null 2>&1; then
  docker network create travel-net >/dev/null
fi

for container in travel-backend travel-frontend; do
  if docker ps -aq -f "name=${container}" >/dev/null 2>&1 && [[ -n "$(docker ps -aq -f name=${container})" ]]; then
    echo "[run-docker] 停止并移除已存在的容器 ${container}"
    docker rm -f "${container}" >/dev/null 2>&1 || true
  fi
done

echo "[run-docker] 启动后端容器 travel-backend"
docker run -d \
  --name travel-backend \
  --network travel-net \
  --env-file "${BACKEND_ENV_FILE}" \
  -p 8080:8080 \
  "${BACKEND_IMAGE}" \
  sh -c "npm run build && npm run start:prod"

if ! docker ps --format '{{.Names}}' | grep -q '^travel-backend$'; then
  echo "[run-docker] 警告：travel-backend 容器未正常启动，请执行 docker logs travel-backend 查看原因。" >&2
else
  BACKEND_IP="$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' travel-backend || true)"
  if [[ -z "${BACKEND_IP}" ]]; then
    echo "[run-docker] 提示：无法解析 travel-backend 的容器 IP，将依靠 docker 网络 DNS。" >&2
  else
    echo "[run-docker] 检测到 travel-backend IP: ${BACKEND_IP}"
  fi
fi

echo "[run-docker] 启动前端容器 travel-frontend"
FRONTEND_RUN_ARGS=(
  docker run -d
  --name travel-frontend
  --network travel-net
  --env-file "${FRONTEND_ENV_FILE}"
  -e NEXT_PUBLIC_API_BASE_URL=/api
  -p 3000:3000
)

if [[ -n "${BACKEND_IP:-}" ]]; then
  FRONTEND_RUN_ARGS+=(--add-host "travel-backend:${BACKEND_IP}")
fi

FRONTEND_RUN_ARGS+=("${FRONTEND_IMAGE}")

"${FRONTEND_RUN_ARGS[@]}"

echo "[run-docker] 已启动容器。访问 http://localhost:3000 即可使用前端界面。"
echo "[run-docker] 可通过 docker logs travel-backend 或 travel-frontend 查看日志。"
echo "[run-docker] 可通过 docker stop travel-frontend travel-backend 停止容器。"
echo "[run-docker] 可通过 docker rm travel-frontend travel-backend 删除容器。"