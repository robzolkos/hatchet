#!/bin/bash
# Wrapper script for hatchet protocol handler
# Runs hatchet with the URL, then drops to a shell so the terminal stays open

/usr/local/bin/hatchet --url "$1"
exec bash
