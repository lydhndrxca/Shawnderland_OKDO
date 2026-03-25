"""
OKDO Auto-Import Watcher for Unreal Engine 5.

Polls {ProjectDir}/Saved/StagedImports/ for manifest.json files written by
the OKDO application.  When one is found the script:

  1. Imports the mesh (GLB/FBX) as a Static Mesh.
  2. Imports each PBR texture (base_color, normal, metallic, roughness).
  3. Sets correct texture compression (Normal → TC_Normalmap).
  4. Creates (or reuses) a parent Material with TextureSampleParameter2D nodes.
  5. Creates a MaterialInstanceConstant and sets the texture parameters.
  6. Assigns the material to the imported Static Mesh.
  7. Saves everything and renames the manifest so it is not re-processed.

Install
-------
Copy this file to ``{YourProject}/Content/Python/init_unreal.py``
(or import it from an existing init_unreal.py).  UE5 auto-runs
``init_unreal.py`` on editor startup when the Python Editor Script Plugin
is enabled.
"""

import unreal
import json
import os
import time

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

POLL_INTERVAL_SECONDS = 2.0
BASE_MATERIAL_PATH = "/Game/OKDO/M_OKDO_PBR"
STAGING_SUBDIR = "Saved/StagedImports"

TEXTURE_PARAM_MAP = {
    "base_color": "BaseColor",
    "normal":     "Normal",
    "metallic":   "Metallic",
    "roughness":  "Roughness",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
_editor_lib  = unreal.EditorAssetLibrary
_mat_lib     = unreal.MaterialEditingLibrary


def _staging_root():
    return os.path.join(unreal.Paths.project_dir(), STAGING_SUBDIR)


def _import_asset(source_path, dest_path):
    """Import a single file into the Content Browser and return the asset."""
    task = unreal.AssetImportTask()
    task.set_editor_property("filename", source_path)
    task.set_editor_property("destination_path", dest_path)
    task.set_editor_property("automated", True)
    task.set_editor_property("save", True)
    task.set_editor_property("replace_existing", True)
    _asset_tools.import_asset_tasks([task])

    imported = task.get_editor_property("imported_object_paths")
    if imported and len(imported) > 0:
        return unreal.load_asset(imported[0])

    stem = os.path.splitext(os.path.basename(source_path))[0]
    guessed_path = "{}/{}".format(dest_path, stem)
    return unreal.load_asset(guessed_path)


def _set_texture_compression(tex_asset, channel):
    """Set the correct compression for a texture channel."""
    if tex_asset is None:
        return
    if channel == "normal":
        tex_asset.set_editor_property("compression_settings",
                                      unreal.TextureCompressionSettings.TC_NORMALMAP)
        tex_asset.set_editor_property("srgb", False)
    elif channel in ("metallic", "roughness"):
        tex_asset.set_editor_property("compression_settings",
                                      unreal.TextureCompressionSettings.TC_MASKS)
        tex_asset.set_editor_property("srgb", False)


# ---------------------------------------------------------------------------
# Base PBR Material (created once, reused for every import)
# ---------------------------------------------------------------------------

def _ensure_base_material():
    """Return the base PBR Material, creating it if it does not exist."""
    existing = unreal.load_asset(BASE_MATERIAL_PATH)
    if existing is not None:
        return existing

    dest_folder = os.path.dirname(BASE_MATERIAL_PATH)
    mat_name = os.path.basename(BASE_MATERIAL_PATH)

    mat = _asset_tools.create_asset(mat_name, dest_folder,
                                    unreal.Material,
                                    unreal.MaterialFactoryNew())
    if mat is None:
        unreal.log_error("OKDO: Failed to create base material")
        return None

    # BaseColor texture param → Material output
    bc_node = _mat_lib.create_material_expression(
        mat, unreal.MaterialExpressionTextureSampleParameter2D, -600, -200)
    bc_node.set_editor_property("parameter_name", "BaseColor")
    _mat_lib.connect_material_property(bc_node, "RGB",
                                       unreal.MaterialProperty.MP_BASE_COLOR)

    # Normal texture param
    n_node = _mat_lib.create_material_expression(
        mat, unreal.MaterialExpressionTextureSampleParameter2D, -600, 0)
    n_node.set_editor_property("parameter_name", "Normal")
    n_node.set_editor_property("sampler_type", unreal.MaterialSamplerType.SAMPLERTYPE_NORMAL)
    _mat_lib.connect_material_property(n_node, "RGB",
                                       unreal.MaterialProperty.MP_NORMAL)

    # Metallic texture param
    m_node = _mat_lib.create_material_expression(
        mat, unreal.MaterialExpressionTextureSampleParameter2D, -600, 200)
    m_node.set_editor_property("parameter_name", "Metallic")
    m_node.set_editor_property("sampler_type", unreal.MaterialSamplerType.SAMPLERTYPE_LINEAR_COLOR)
    _mat_lib.connect_material_property(m_node, "R",
                                       unreal.MaterialProperty.MP_METALLIC)

    # Roughness texture param
    r_node = _mat_lib.create_material_expression(
        mat, unreal.MaterialExpressionTextureSampleParameter2D, -600, 400)
    r_node.set_editor_property("parameter_name", "Roughness")
    r_node.set_editor_property("sampler_type", unreal.MaterialSamplerType.SAMPLERTYPE_LINEAR_COLOR)
    _mat_lib.connect_material_property(r_node, "R",
                                       unreal.MaterialProperty.MP_ROUGHNESS)

    _mat_lib.recompile_material(mat)
    _editor_lib.save_asset(BASE_MATERIAL_PATH)

    unreal.log("OKDO: Created base PBR material at {}".format(BASE_MATERIAL_PATH))
    return mat


# ---------------------------------------------------------------------------
# Manifest processor
# ---------------------------------------------------------------------------

def _process_manifest(manifest_path):
    """Read a manifest.json, import everything, wire up materials."""
    with open(manifest_path, "r") as f:
        data = json.load(f)

    name        = data.get("name", "unnamed")
    mesh_file   = data.get("mesh")
    textures    = data.get("textures", {})
    dest_folder = data.get("destFolder", "/Game/OKDO")
    asset_dir   = "{}/{}".format(dest_folder, name)
    staging_dir = os.path.dirname(manifest_path)

    unreal.log("OKDO: Processing import '{}'".format(name))

    # ── Import mesh ────────────────────────────────────────────────
    mesh_asset = None
    if mesh_file:
        mesh_path = os.path.join(staging_dir, mesh_file)
        if os.path.isfile(mesh_path):
            mesh_asset = _import_asset(mesh_path, asset_dir)
            if mesh_asset:
                unreal.log("OKDO:   Mesh imported → {}/{}".format(
                    asset_dir, os.path.splitext(mesh_file)[0]))
            else:
                unreal.log_warning("OKDO:   Mesh import returned None")
        else:
            unreal.log_warning("OKDO:   Mesh file not found: {}".format(mesh_path))

    # ── Import textures ────────────────────────────────────────────
    tex_assets = {}
    for channel, tex_filename in textures.items():
        tex_path = os.path.join(staging_dir, tex_filename)
        if not os.path.isfile(tex_path):
            continue
        tex_asset = _import_asset(tex_path, asset_dir)
        if tex_asset:
            _set_texture_compression(tex_asset, channel)
            _editor_lib.save_asset("{}/{}".format(
                asset_dir, os.path.splitext(tex_filename)[0]))
            tex_assets[channel] = tex_asset
            unreal.log("OKDO:   Texture '{}' imported".format(channel))

    # ── Create Material Instance ───────────────────────────────────
    if tex_assets:
        base_mat = _ensure_base_material()
        if base_mat:
            mi_name = "MI_{}".format(name)
            mi = _asset_tools.create_asset(
                mi_name, asset_dir,
                unreal.MaterialInstanceConstant,
                unreal.MaterialInstanceConstantFactoryNew())

            if mi:
                mi.set_editor_property("parent", base_mat)

                for channel, tex in tex_assets.items():
                    param_name = TEXTURE_PARAM_MAP.get(channel)
                    if param_name and tex:
                        unreal.MaterialEditingLibrary.set_material_instance_texture_parameter_value(
                            mi, param_name, tex)

                mi_asset_path = "{}/{}".format(asset_dir, mi_name)
                _editor_lib.save_asset(mi_asset_path)
                unreal.log("OKDO:   Material Instance created → {}".format(mi_asset_path))

                # Assign material to mesh
                if mesh_asset and isinstance(mesh_asset, unreal.StaticMesh):
                    mats = mesh_asset.get_editor_property("static_materials")
                    if mats and len(mats) > 0:
                        for i in range(len(mats)):
                            mesh_asset.set_material(i, mi)
                        mesh_stem = os.path.splitext(mesh_file)[0] if mesh_file else name
                        _editor_lib.save_asset("{}/{}".format(asset_dir, mesh_stem))
                        unreal.log("OKDO:   Material assigned to mesh ({} slots)".format(len(mats)))

    # ── Mark processed ─────────────────────────────────────────────
    processed_path = manifest_path.replace("manifest.json", "manifest.processed")
    try:
        os.rename(manifest_path, processed_path)
    except OSError:
        pass

    unreal.log("OKDO: Import of '{}' complete".format(name))


# ---------------------------------------------------------------------------
# Tick-based poller
# ---------------------------------------------------------------------------

_last_poll = [0.0]


def _tick(delta_seconds):
    """Called every editor tick; polls at POLL_INTERVAL_SECONDS."""
    now = time.time()
    if now - _last_poll[0] < POLL_INTERVAL_SECONDS:
        return
    _last_poll[0] = now

    root = _staging_root()
    if not os.path.isdir(root):
        return

    for entry in os.listdir(root):
        entry_path = os.path.join(root, entry)
        if not os.path.isdir(entry_path):
            continue
        manifest = os.path.join(entry_path, "manifest.json")
        if os.path.isfile(manifest):
            try:
                _process_manifest(manifest)
            except Exception as e:
                unreal.log_error("OKDO: Error processing {}: {}".format(manifest, e))


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def start():
    """Register the tick callback.  Safe to call multiple times."""
    unreal.register_slate_post_tick_callback(_tick)
    unreal.log("OKDO: Auto-import watcher started — polling {}/".format(STAGING_SUBDIR))


# Auto-start when loaded as init_unreal.py or imported
start()
