# FreeForge
Free, private Roblox asset toolkit: UI kits, parametric 3D models, animation presets, thumbnails and icons. Open index.html.
Exports: .rbxmx (UI + Parts), Luau scripts, GLB (glTF 2.0), PNG.
Credits: file-format references (documentation only, no code bundled): rojo-rbx/rbx-dom (MIT), MaximumADHD/Roblox-File-Format (MIT), glTF 2.0 spec (Khronos). Inspired by the feature set of ForgeGUI; no ForgeGUI code or assets used.
Limits: not tested in Roblox Studio; models are low-poly parametric.

## Research notes (public sources)
- ForgeGUI (public site/docs, third-party review at nilo.io): raster image generation (PNG/ZIP/GLB) from prompts and style references via third-party AI image models, plus a Studio plugin/MCP. It does not output native Roblox UI objects or scripts. FreeForge's angle: native editable UI objects, scripts, animations, GLB, thumbnails, all free and local.
- Roblox DevForum "Designing UI - Tips and Best Practices" (devforum.roblox.com/t/designing-ui-tips-and-best-practices/3074034): design mobile-first, anchor to edges, scale to the viewport. FreeForge exports AnchorPoints and a ResponsiveScale LocalScript driving a UIScale per panel.
