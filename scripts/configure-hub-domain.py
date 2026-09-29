"""Update only domain switches in /opt/fond/.env; preserve keys and the DB volume."""
import os
import re
import shutil
import socket
import sys
import time
import urllib.request
from pathlib import Path

mode = sys.argv[1]
if mode not in {"inspect", "prepare", "cutover", "rollback"}:
    raise SystemExit("Invalid mode")
root = Path.cwd().resolve()
if str(root) != "/opt/fond":
    raise SystemExit("Run only from the production FOND checkout")
path = root / ".env"
source = path.read_text()
names = {"FOND_HOST", "FOND_ALIAS_HOST", "FOND_WWW_HOST", "FOND_PUBLIC_URL", "FOND_CALLBACK_URL", "MIDPOINT_HUB_ENABLED", "MIDPOINT_HUB_EMAIL_ENABLED", "TRAEFIK_NETWORK", "TRAEFIK_ENTRYPOINT", "TRAEFIK_CERTRESOLVER"}
values = {}
for line in source.splitlines():
    match = re.match(r"^([A-Z0-9_]+)=(.*)$", line)
    if match and match[1] in names:
        if match[1] in values:
            raise SystemExit("Duplicate routing setting; review configuration first")
        values[match[1]] = match[2].strip().strip("\"'")
if values.get("FOND_HOST") not in {"fond.mid-point.co.za", "midpointhub.com"}:
    raise SystemExit("Unexpected current production hostname")
if mode == "inspect":
    for key in sorted(values):
        print(f"{key}={values[key]}")
    raise SystemExit(0)
if mode == "cutover":
    for host in ("midpointhub.com", "www.midpointhub.com"):
        addresses = {r[4][0] for r in socket.getaddrinfo(host,443,type=socket.SOCK_STREAM)}
        if addresses != {"93.127.186.194"}:
            raise SystemExit(f"DNS is not ready for {host}")
        with urllib.request.urlopen(f"https://{host}/api/health",timeout=15) as response:
            if response.status != 200:
                raise SystemExit("Secure new-domain health check failed")
    changes = {"FOND_HOST":"midpointhub.com","FOND_ALIAS_HOST":"fond.mid-point.co.za","FOND_WWW_HOST":"www.midpointhub.com","FOND_PUBLIC_URL":"https://midpointhub.com","FOND_CALLBACK_URL":"https://fond.mid-point.co.za","MIDPOINT_HUB_ENABLED":"true","MIDPOINT_HUB_EMAIL_ENABLED":"true"}
elif mode == "prepare":
    if values.get("MIDPOINT_HUB_ENABLED") == "true":
        raise SystemExit("Hub is already enabled; do not prepare over a completed cutover")
    changes = {"FOND_ALIAS_HOST":"midpointhub.com","FOND_WWW_HOST":"www.midpointhub.com"}
else:
    changes = {"FOND_HOST":"fond.mid-point.co.za","FOND_ALIAS_HOST":"midpointhub.com","FOND_WWW_HOST":"www.midpointhub.com","FOND_PUBLIC_URL":"https://fond.mid-point.co.za","FOND_CALLBACK_URL":"https://fond.mid-point.co.za","MIDPOINT_HUB_ENABLED":"false","MIDPOINT_HUB_EMAIL_ENABLED":"false"}
backup = root / f".env.before-hub-{mode}-{time.time_ns()}"
shutil.copyfile(path,backup)
os.chmod(backup,0o600)
lines = source.splitlines()
for key,value in changes.items():
    pattern = re.compile(rf"^{key}=")
    if any(pattern.match(line) for line in lines):
        lines = [f"{key}={value}" if pattern.match(line) else line for line in lines]
    else:
        lines.append(f"{key}={value}")
temporary = root / ".env.hub-next"
temporary.write_text("\n".join(lines)+"\n")
os.chmod(temporary,0o600)
os.replace(temporary,path)
print(f"Updated {mode} routing settings; private backup retained on server.")
for key,value in sorted(changes.items()):
    print(f"{key}={value}")
