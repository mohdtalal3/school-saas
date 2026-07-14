#!/usr/bin/env python3
import subprocess
import sys

COMMIT_MESSAGE = "add student id card module"

def run(cmd):
    print(f"▶ {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=".")
    if result.returncode != 0:
        print(f"✗ Command failed: {cmd}")
        sys.exit(1)

run("git add .")
run(f'git commit -m "{COMMIT_MESSAGE}"')
run("git push")

print("✓ Done!")
