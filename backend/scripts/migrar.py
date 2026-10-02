"""Aplica migraciones Alembic pendientes. Si ya están aplicadas, no las repite."""

from pathlib import Path
import subprocess
import sys


def main() -> int:
    backend_dir = Path(__file__).resolve().parents[1]
    comando = [sys.executable, "-m", "alembic", "upgrade", "head"]
    resultado = subprocess.run(comando, cwd=backend_dir, check=False)
    return resultado.returncode


if __name__ == "__main__":
    raise SystemExit(main())
