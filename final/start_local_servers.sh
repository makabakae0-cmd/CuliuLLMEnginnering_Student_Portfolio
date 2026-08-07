#!/bin/zsh

set -e

project_dir="${0:A:h}"
frontend_pid=""

# Limit embedding/BLAS worker threads so local model loading cannot exhaust macOS resources.
export OMP_NUM_THREADS=2
export OPENBLAS_NUM_THREADS=2
export MKL_NUM_THREADS=2
export NUMEXPR_NUM_THREADS=2
export TOKENIZERS_PARALLELISM=false

cleanup() {
    if [[ -n "$frontend_pid" ]]; then
        kill "$frontend_pid" 2>/dev/null || true
    fi
}

trap cleanup EXIT INT TERM

cd "$project_dir"
python3 -m http.server 8080 &
frontend_pid=$!

cd "$project_dir/backend"
./.venv/bin/python flask_glm5_server.py
