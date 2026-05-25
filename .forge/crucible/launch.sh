#!/bin/bash
FORGE_PATH=$(python3 -c "import json; print(json.load(open('.forge/config.json'))['forge_path'])")
(cd "$FORGE_PATH/crucible-agent" && \
  CRUCIBLE_TARGET_REPO="/Users/jeffreese/Code/human-markdown" \
  CRUCIBLE_GH_REPO="purecontext-dev/human-markdown" \
  claude -p "/crucible:review $1" \
    --allowedTools "Bash(gh *),Bash(git *),Read,Grep,Glob,Write,Edit,Agent" \
    --print)
