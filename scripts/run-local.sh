#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
FRONTEND_DIR="${ROOT_DIR}/frontend"
ROOT_ENV="${ROOT_DIR}/.env"
BACKEND_ENV="${BACKEND_DIR}/.env"
FRONTEND_ENV="${FRONTEND_DIR}/.env.local"

if [[ ! -f "${ROOT_ENV}" ]]; then
  echo "[run-local] 错误：未找到 ${ROOT_ENV}，请先创建并填写所需环境变量。" >&2
  exit 1
fi

sync_env_files() {
  declare -A backend_values=()
  declare -a backend_order=()
  declare -A frontend_values=()
  declare -a frontend_order=()

  record_var() {
    local scope=$1
    local var_key=$2
    local var_value=$3

    if [[ "${scope}" == "backend" ]]; then
      local current_value="${backend_values[$var_key]-}"
      if [[ -z "${backend_values[$var_key]+x}" ]]; then
        backend_order+=("${var_key}")
      fi
      if [[ -n "${var_value}" || -z "${current_value}" ]]; then
        backend_values["${var_key}"]="${var_value}"
      fi
    else
      local current_front_value="${frontend_values[$var_key]-}"
      if [[ -z "${frontend_values[$var_key]+x}" ]]; then
        frontend_order+=("${var_key}")
      fi
      if [[ -n "${var_value}" || -z "${current_front_value}" ]]; then
        frontend_values["${var_key}"]="${var_value}"
      fi
    fi
  }

  while IFS= read -r line || [[ -n "${line}" ]]; do
    # 保留注释和空行，后续统一写入
    if [[ -z "${line}" ]]; then
      continue
    fi

    if [[ "${line}" == \#* ]]; then
      continue
    fi

    if [[ "${line}" != *=* ]]; then
      continue
    fi

    key=${line%%=*}
    value=${line#*=}

    # 去除左右空白
    key="$(printf "%s" "${key}" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    value="$(printf "%s" "${value}" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"

    target="backend"

    if [[ ${key} == NEXT_PUBLIC_* || ${key} == API_PROXY_TARGET ]]; then
      target="frontend"
    fi

    record_var "${target}" "${key}" "${value}"
  done < "${ROOT_ENV}"

  {
    echo "# 此文件由 scripts/run-local.sh 自动从项目根目录 .env 生成"
    echo "# 请勿直接修改，变化请写入 ../.env 后重新运行脚本"
    echo
    for key in "${backend_order[@]}"; do
      echo "${key}=${backend_values[$key]}"
    done
  } > "${BACKEND_ENV}"

  {
    echo "# 此文件由 scripts/run-local.sh 自动从项目根目录 .env 生成"
    echo "# 请勿直接修改，变化请写入 ../.env 后重新运行脚本"
    echo
    for key in "${frontend_order[@]}"; do
      echo "${key}=${frontend_values[$key]}"
    done
  } > "${FRONTEND_ENV}"
}

sync_env_files

echo "[run-local] 已同步环境变量到 backend/.env 与 frontend/.env.local"

install_if_needed() {
  local target_dir="$1"
  if [[ ! -d "${target_dir}/node_modules" ]]; then
    echo "[run-local] 首次安装依赖：${target_dir}"
    (cd "${target_dir}" && npm install)
  fi
}

install_if_needed "${BACKEND_DIR}"
install_if_needed "${FRONTEND_DIR}"

echo "[run-local] 启动后端与前端开发服务器..."

cleanup() {
  echo "[run-local] 收到退出信号，正在停止子进程..."
  pkill -P $$ || true
}

trap cleanup EXIT

(cd "${BACKEND_DIR}" && npm run dev) &
BACK_PID=$!

# 给后端预留一点启动时间，避免前端代理请求失败
sleep 2

(cd "${FRONTEND_DIR}" && npm run dev) &
FRONT_PID=$!

wait ${BACK_PID} ${FRONT_PID}
  