# MCP for Blender (computer only)

Connects Claude to the Blender running on your computer (MIT, github.com/ahujasid/mcp-for-blender; not affiliated with the Blender Foundation). It does not work in Claude on the web or phone, because the server has to talk to Blender on your machine. Works in Claude Code and in the desktop app when the session runs on your computer.

Setup on the computer:
1. Install uv: https://docs.astral.sh/uv/getting-started/installation/
2. Install the Blender addon: in Blender, Edit > Preferences > Add-ons > Install..., pick `blender-addon/addon.py` from this plugin (or run `uvx mcp-for-blender==2.2.9 install-addon`).
3. Enable "Interface: MCP for Blender", open the MCP for Blender tab in the 3D viewport sidebar (press N) and click Connect to Claude.
4. Ask Claude to build something.

Changes from the original plugin: the server runs from PyPI (`uvx mcp-for-blender==2.2.9`) instead of a bundled wheel, usage telemetry is turned off, and the addon file is included.
