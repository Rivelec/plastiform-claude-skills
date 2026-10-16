#!/bin/bash
# chemins.sh — conversion des chemins entre le Mac (Affinity) et la VM (device_bash).
#   bin/chemins.sh mac "$HOME/mnt/Cowork/Plastiform/x.af"   → /Users/…/Desktop/Cowork/Plastiform/x.af
#   bin/chemins.sh vm  "/Users/…/Desktop/Cowork/Plastiform/x.af" → $HOME/mnt/Cowork/Plastiform/x.af
# Les scripts Affinity attendent des chemins Mac ; les outils Python de la VM, des chemins VM.
OUTILS_VM="$(cd "$(dirname "$0")/.." && pwd)"; . "$OUTILS_VM/config/chemins.env"
sens="$1"; shift
for p in "$@"; do
  case "$sens" in
    mac) case "$p" in "$RACINE_VM"*) printf '%s\n' "$RACINE_MAC${p#$RACINE_VM}";; *) printf '%s\n' "$p";; esac ;;
    vm)  case "$p" in "$RACINE_MAC"*) printf '%s\n' "$RACINE_VM${p#$RACINE_MAC}";; *) printf '%s\n' "$p";; esac ;;
    *) echo "usage : chemins.sh mac|vm CHEMIN…" >&2; exit 2 ;;
  esac
done
