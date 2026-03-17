"use client";

import { useCallback, useEffect, useState } from 'react';
import { useGlobalSettings, setGlobalSettings } from '@/lib/globalSettings';
import './GlobalSettingsPage.css';

interface DirEntry {
  name: string;
  path: string;
}

interface DirListing {
  current: string;
  parent: string | null;
  home?: string;
  dirs: DirEntry[];
  error?: string;
}

function FolderBrowser({ onSelect, onCancel }: { onSelect: (p: string) => void; onCancel: () => void }) {
  const [listing, setListing] = useState<DirListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const navigate = useCallback(async (dirPath: string) => {
    setLoading(true);
    setError('');
    try {
      const url = dirPath
        ? `/api/list-dirs?path=${encodeURIComponent(dirPath)}`
        : '/api/list-dirs';
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to list directory');
        setLoading(false);
        return;
      }
      const data: DirListing = await res.json();
      setListing(data);
    } catch {
      setError('Network error');
    }
    setLoading(false);
  }, []);

  useEffect(() => { navigate(''); }, [navigate]);

  return (
    <div className="gsp-browser-overlay" onClick={onCancel}>
      <div className="gsp-browser" onClick={(e) => e.stopPropagation()}>
        <div className="gsp-browser-header">
          <span className="gsp-browser-title">Select Folder</span>
          <button type="button" className="gsp-browser-close" onClick={onCancel}>x</button>
        </div>

        <div className="gsp-browser-path">
          {listing?.current || 'Drives'}
        </div>

        {error && <div className="gsp-browser-error">{error}</div>}

        <div className="gsp-browser-list">
          {loading && <div className="gsp-browser-loading">Loading...</div>}

          {!loading && listing && (
            <>
              {listing.parent !== undefined && listing.parent !== null && (
                <button
                  type="button"
                  className="gsp-browser-item gsp-browser-parent"
                  onClick={() => navigate(listing.parent!)}
                >
                  ..
                </button>
              )}

              {!listing.current && listing.home && (
                <button
                  type="button"
                  className="gsp-browser-item gsp-browser-home"
                  onClick={() => navigate(listing.home!)}
                >
                  Home ({listing.home})
                </button>
              )}

              {listing.dirs.map((d) => (
                <button
                  key={d.path}
                  type="button"
                  className="gsp-browser-item"
                  onClick={() => navigate(d.path)}
                >
                  {d.name}
                </button>
              ))}

              {listing.dirs.length === 0 && listing.current && (
                <div className="gsp-browser-empty">No subfolders</div>
              )}
            </>
          )}
        </div>

        <div className="gsp-browser-actions">
          <button type="button" className="gsp-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="gsp-btn gsp-btn-primary"
            disabled={!listing?.current}
            onClick={() => listing?.current && onSelect(listing.current)}
          >
            Select This Folder
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GlobalSettingsPage() {
  const settings = useGlobalSettings();
  const [showBrowser, setShowBrowser] = useState(false);
  const [showBrowser3D, setShowBrowser3D] = useState(false);

  const handleOutputDirChange = useCallback((val: string) => {
    setGlobalSettings({ outputDir: val });
  }, []);

  const handleBrowseSelect = useCallback((selectedPath: string) => {
    setGlobalSettings({ outputDir: selectedPath });
    setShowBrowser(false);
  }, []);

  const handle3DExportDirChange = useCallback((val: string) => {
    setGlobalSettings({ threeDExportDir: val });
  }, []);

  const handleBrowse3DSelect = useCallback((selectedPath: string) => {
    setGlobalSettings({ threeDExportDir: selectedPath });
    setShowBrowser3D(false);
  }, []);

  const dirPreview = settings.outputDir || 'Not set';

  return (
    <div className="gsp-root">
      <div className="gsp-container">
        <h1 className="gsp-title">Global Settings</h1>
        <p className="gsp-subtitle">
          Settings that apply across all applications.
        </p>

        <section className="gsp-section">
          <h2 className="gsp-section-title">Output Directory</h2>
          <p className="gsp-section-desc">
            Root folder where all generated files are saved. Each application creates its own subfolder automatically.
          </p>

          <div className="gsp-field-row">
            <input
              className="gsp-input"
              value={settings.outputDir}
              onChange={(e) => handleOutputDirChange(e.target.value)}
              placeholder="e.g., D:\ShawnderlandOutput"
            />
            <button
              type="button"
              className="gsp-btn"
              onClick={() => setShowBrowser(true)}
            >
              Browse
            </button>
          </div>

          {settings.outputDir && (
            <div className="gsp-preview">
              <div className="gsp-preview-title">Folder structure preview</div>
              <pre className="gsp-tree">{`${dirPreview}\\
  concept-lab\\
    characters\\
      {CharacterName}\\
        {YYYY-MM-DD}\\
          main_stage.png / .json
          front.png / .json
          back.png / .json
          ...
    weapons\\
      {WeaponName}\\
        {YYYY-MM-DD}\\
          ...
  shawndermind\\
    {ProjectName}\\
      {YYYY-MM-DD}\\
        ...
  gemini-studio\\
    {SessionName}\\
      {YYYY-MM-DD}\\
        ...
  generated-images\\
    {YYYY-MM-DD}\\
      image_001.png / .json`}</pre>
            </div>
          )}
        </section>

        <section className="gsp-section">
          <h2 className="gsp-section-title">3D Export Directory</h2>
          <p className="gsp-section-desc">
            Folder where 3D models (OBJ, GLB, FBX, USDZ) from the Meshy 3D Gen AI pipeline are exported.
          </p>

          <div className="gsp-field-row">
            <input
              className="gsp-input"
              value={settings.threeDExportDir}
              onChange={(e) => handle3DExportDirChange(e.target.value)}
              placeholder="e.g., D:\ShawnderlandOutput\3d-exports"
            />
            <button
              type="button"
              className="gsp-btn"
              onClick={() => setShowBrowser3D(true)}
            >
              Browse
            </button>
          </div>

          {settings.threeDExportDir && (
            <div className="gsp-preview">
              <div className="gsp-preview-title">3D exports will save to</div>
              <pre className="gsp-tree">{`${settings.threeDExportDir}\\
  model_name.obj
  model_name.glb
  ...`}</pre>
            </div>
          )}
        </section>
      </div>

      {showBrowser && (
        <FolderBrowser
          onSelect={handleBrowseSelect}
          onCancel={() => setShowBrowser(false)}
        />
      )}

      {showBrowser3D && (
        <FolderBrowser
          onSelect={handleBrowse3DSelect}
          onCancel={() => setShowBrowser3D(false)}
        />
      )}
    </div>
  );
}
