#!/usr/bin/env bash
# Activa el entorno Python. Si .venv no existe (sandbox), usa el venv temporal.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [ -x "$ROOT/.venv/bin/activate" ]; then
  # shellcheck disable=SC1091
  source "$ROOT/.venv/bin/activate"
elif [ -x /tmp/injoe-mechanics-venv/bin/activate ]; then
  # shellcheck disable=SC1091
  source /tmp/injoe-mechanics-venv/bin/activate
else
  echo "No se encontró un entorno virtual. Crea uno con: python3 -m venv .venv"
  exit 1
fi
