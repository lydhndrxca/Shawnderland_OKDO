"use client";

import { useCallback, useEffect, useState } from 'react';
import { useGlobalSettings, setGlobalSettings, type ProjectKnowledgeDoc } from '@/lib/globalSettings';
import { setupUE5Watcher } from '@/lib/ideation/engine/meshyApi';
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
  const [showBrowserUE5, setShowBrowserUE5] = useState(false);
  const [showBrowserBlender, setShowBrowserBlender] = useState(false);
  const [ue5TestStatus, setUe5TestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [ue5TestError, setUe5TestError] = useState('');
  const [ue5SetupStatus, setUe5SetupStatus] = useState<'idle' | 'working' | 'ok' | 'fail'>('idle');
  const [ue5SetupMsg, setUe5SetupMsg] = useState('');
  const [keyVisible, setKeyVisible] = useState(false);
  const [blenderDetecting, setBlenderDetecting] = useState(false);
  const [keyTestStatus, setKeyTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [meshyTestStatus, setMeshyTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [meshyTestError, setMeshyTestError] = useState('');
  const [hitemTestStatus, setHitemTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [hitemTestError, setHitemTestError] = useState('');
  const [elTestStatus, setElTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [elTestError, setElTestError] = useState('');

  const handleApiKeyChange = useCallback((val: string) => {
    setGlobalSettings({ geminiApiKey: val.trim() });
    setKeyTestStatus('idle');
  }, []);

  const handleTestKey = useCallback(async () => {
    const key = settings.geminiApiKey;
    if (!key) return;
    setKeyTestStatus('testing');
    try {
      const res = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key },
        body: JSON.stringify({ model: 'gemini-2.0-flash', method: 'generateContent', body: { contents: [{ parts: [{ text: 'Say OK' }] }] } }),
      });
      setKeyTestStatus(res.ok ? 'ok' : 'fail');
    } catch {
      setKeyTestStatus('fail');
    }
  }, [settings.geminiApiKey]);

  const handleTestMeshy = useCallback(async () => {
    if (!settings.meshyApiKey) return;
    setMeshyTestStatus('testing');
    setMeshyTestError('');
    try {
      const res = await fetch('/api/meshy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-meshy-key': settings.meshyApiKey },
        body: JSON.stringify({ action: 'test-connection' }),
      });
      if (res.ok) {
        setMeshyTestStatus('ok');
      } else {
        const data = await res.json().catch(() => ({}));
        setMeshyTestError(data.error || `Failed (${res.status})`);
        setMeshyTestStatus('fail');
      }
    } catch {
      setMeshyTestError('Network error');
      setMeshyTestStatus('fail');
    }
  }, [settings.meshyApiKey]);

  const handleTestHitem = useCallback(async () => {
    if (!settings.hitem3dAccessKey || !settings.hitem3dSecretKey) return;
    setHitemTestStatus('testing');
    setHitemTestError('');
    try {
      const res = await fetch('/api/hitem3d', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hitem3d-access': settings.hitem3dAccessKey,
          'x-hitem3d-secret': settings.hitem3dSecretKey,
        },
        body: JSON.stringify({ action: 'test-connection' }),
      });
      if (res.ok) {
        setHitemTestStatus('ok');
      } else {
        const data = await res.json().catch(() => ({}));
        setHitemTestError(data.error || `Failed (${res.status})`);
        setHitemTestStatus('fail');
      }
    } catch {
      setHitemTestError('Network error');
      setHitemTestStatus('fail');
    }
  }, [settings.hitem3dAccessKey, settings.hitem3dSecretKey]);

  const handleTestElevenLabs = useCallback(async () => {
    if (!settings.elevenLabsApiKey) return;
    setElTestStatus('testing');
    setElTestError('');
    try {
      const res = await fetch('/api/elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-elevenlabs-key': settings.elevenLabsApiKey },
        body: JSON.stringify({ action: 'test-connection' }),
      });
      if (res.ok) {
        setElTestStatus('ok');
      } else {
        const data = await res.json().catch(() => ({}));
        setElTestError(data.error || `Failed (${res.status})`);
        setElTestStatus('fail');
      }
    } catch {
      setElTestError('Network error');
      setElTestStatus('fail');
    }
  }, [settings.elevenLabsApiKey]);

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

  const handleBlenderPathChange = useCallback((val: string) => {
    setGlobalSettings({ blenderPath: val });
  }, []);

  const handleBrowseBlenderSelect = useCallback((selectedPath: string) => {
    setGlobalSettings({ blenderPath: selectedPath });
    setShowBrowserBlender(false);
  }, []);

  const handleDetectBlender = useCallback(async () => {
    setBlenderDetecting(true);
    const candidates = [
      'C:\\Program Files\\Blender Foundation\\Blender 5.1\\blender.exe',
      'C:\\Program Files\\Blender Foundation\\Blender 5.0\\blender.exe',
      'C:\\Program Files\\Blender Foundation\\Blender 4.4\\blender.exe',
      'C:\\Program Files\\Blender Foundation\\Blender 4.3\\blender.exe',
      'C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe',
      'C:\\Program Files\\Blender Foundation\\Blender 4.1\\blender.exe',
      'C:\\Program Files\\Blender Foundation\\Blender 4.0\\blender.exe',
      'C:\\Program Files\\Blender Foundation\\Blender 3.6\\blender.exe',
    ];
    for (const p of candidates) {
      try {
        const res = await fetch(`/api/list-dirs?path=${encodeURIComponent(p.replace(/\\blender\.exe$/, ''))}`);
        if (res.ok) {
          setGlobalSettings({ blenderPath: p });
          break;
        }
      } catch { /* skip */ }
    }
    setBlenderDetecting(false);
  }, []);

  const handleUE5ProjectPathChange = useCallback((val: string) => {
    setGlobalSettings({ ue5ProjectPath: val });
    setUe5TestStatus('idle');
  }, []);

  const handleBrowseUE5Select = useCallback((selectedPath: string) => {
    setGlobalSettings({ ue5ProjectPath: selectedPath });
    setShowBrowserUE5(false);
  }, []);

  const handleTestUE5 = useCallback(async () => {
    setUe5TestStatus('testing');
    setUe5TestError('');
    try {
      const res = await fetch('/api/ue5-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-connection' }),
      });
      if (res.ok) {
        setUe5TestStatus('ok');
      } else {
        const data = await res.json().catch(() => ({}));
        setUe5TestError(data.error || `UE5 not reachable (${res.status})`);
        setUe5TestStatus('fail');
      }
    } catch {
      setUe5TestError('Network error');
      setUe5TestStatus('fail');
    }
  }, []);

  const handleSetupUE5 = useCallback(async () => {
    if (!settings.ue5ProjectPath) return;
    setUe5SetupStatus('working');
    setUe5SetupMsg('');
    try {
      const result = await setupUE5Watcher(settings.ue5ProjectPath);
      setUe5SetupMsg(result.message);
      setUe5SetupStatus('ok');
    } catch (e) {
      setUe5SetupMsg(e instanceof Error ? e.message : 'Setup failed');
      setUe5SetupStatus('fail');
    }
  }, [settings.ue5ProjectPath]);

  const dirPreview = settings.outputDir || 'Not set';

  const knowledgeDocs = settings.projectKnowledgeDocs ?? [];
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docDraftName, setDocDraftName] = useState('');
  const [docDraftContent, setDocDraftContent] = useState('');

  const handleAddDoc = useCallback(() => {
    const id = `pkd_${Date.now()}`;
    setEditingDocId(id);
    setDocDraftName('');
    setDocDraftContent('');
  }, []);

  const handleEditDoc = useCallback((doc: ProjectKnowledgeDoc) => {
    setEditingDocId(doc.id);
    setDocDraftName(doc.name);
    setDocDraftContent(doc.content);
  }, []);

  const handleSaveDoc = useCallback(() => {
    if (!editingDocId || !docDraftName.trim() || !docDraftContent.trim()) return;
    const existing = knowledgeDocs.filter((d) => d.id !== editingDocId);
    const updated = [...existing, { id: editingDocId, name: docDraftName.trim(), content: docDraftContent.trim() }];
    setGlobalSettings({ projectKnowledgeDocs: updated });
    setEditingDocId(null);
    setDocDraftName('');
    setDocDraftContent('');
  }, [editingDocId, docDraftName, docDraftContent, knowledgeDocs]);

  const handleDeleteDoc = useCallback((id: string) => {
    setGlobalSettings({ projectKnowledgeDocs: knowledgeDocs.filter((d) => d.id !== id) });
    if (editingDocId === id) setEditingDocId(null);
  }, [knowledgeDocs, editingDocId]);

  const handleCancelDoc = useCallback(() => {
    setEditingDocId(null);
    setDocDraftName('');
    setDocDraftContent('');
  }, []);

  return (
    <div className="gsp-root">
      <div className="gsp-container">
        <h1 className="gsp-title">Global Settings</h1>
        <p className="gsp-subtitle">
          Settings that apply across all applications.
        </p>

        <section className="gsp-section">
          <h2 className="gsp-section-title">Gemini API Key</h2>
          <p className="gsp-section-desc">
            Required for all AI features. Get a free key from{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="gsp-link">
              Google AI Studio
            </a>. Stored locally in your browser — never sent anywhere except Google.
          </p>

          <div className="gsp-field-row">
            <input
              className="gsp-input gsp-input-key"
              type={keyVisible ? 'text' : 'password'}
              value={settings.geminiApiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder="AIzaSy..."
              spellCheck={false}
              autoComplete="off"
            />
            <button type="button" className="gsp-btn gsp-btn-sm" onClick={() => setKeyVisible((v) => !v)}>
              {keyVisible ? 'Hide' : 'Show'}
            </button>
            <button
              type="button"
              className="gsp-btn gsp-btn-primary gsp-btn-sm"
              onClick={handleTestKey}
              disabled={!settings.geminiApiKey || keyTestStatus === 'testing'}
            >
              {keyTestStatus === 'testing' ? 'Testing...' : 'Test Key'}
            </button>
          </div>

          {keyTestStatus === 'ok' && (
            <div className="gsp-key-status gsp-key-ok">Key is valid and working.</div>
          )}
          {keyTestStatus === 'fail' && (
            <div className="gsp-key-status gsp-key-fail">Key test failed. Check your key and try again.</div>
          )}
          {!settings.geminiApiKey && (
            <div className="gsp-key-status gsp-key-warn">No API key set — AI features will not work.</div>
          )}
        </section>

        <section className="gsp-section">
          <h2 className="gsp-section-title">Meshy API Key</h2>
          <p className="gsp-section-desc">
            Required for 3D model generation. Get a key from{' '}
            <a href="https://www.meshy.ai" target="_blank" rel="noopener noreferrer" className="gsp-link">
              meshy.ai
            </a>.
          </p>
          <div className="gsp-field-row">
            <input
              className="gsp-input gsp-input-key"
              type="password"
              value={settings.meshyApiKey}
              onChange={(e) => { setGlobalSettings({ meshyApiKey: e.target.value.trim() }); setMeshyTestStatus('idle'); }}
              placeholder="msy_..."
              spellCheck={false}
              autoComplete="off"
            />
            <button
              type="button"
              className="gsp-btn gsp-btn-primary gsp-btn-sm"
              onClick={handleTestMeshy}
              disabled={!settings.meshyApiKey || meshyTestStatus === 'testing'}
            >
              {meshyTestStatus === 'testing' ? 'Testing...' : 'Test Key'}
            </button>
          </div>
          {meshyTestStatus === 'ok' && <div className="gsp-key-status gsp-key-ok">Meshy API key is valid.</div>}
          {meshyTestStatus === 'fail' && <div className="gsp-key-status gsp-key-fail">{meshyTestError || 'Key test failed.'}</div>}
        </section>

        <section className="gsp-section">
          <h2 className="gsp-section-title">Hitem 3D Keys</h2>
          <p className="gsp-section-desc">
            Access key (client_id) and secret key (client_secret) for Hitem 3D API. Both are required.
          </p>
          <div className="gsp-field-row">
            <input
              className="gsp-input gsp-input-key"
              type="password"
              value={settings.hitem3dAccessKey}
              onChange={(e) => { setGlobalSettings({ hitem3dAccessKey: e.target.value.trim() }); setHitemTestStatus('idle'); }}
              placeholder="Access Key (ak_...)"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <div className="gsp-field-row" style={{ marginTop: 8 }}>
            <input
              className="gsp-input gsp-input-key"
              type="password"
              value={settings.hitem3dSecretKey}
              onChange={(e) => { setGlobalSettings({ hitem3dSecretKey: e.target.value.trim() }); setHitemTestStatus('idle'); }}
              placeholder="Secret Key"
              spellCheck={false}
              autoComplete="off"
            />
            <button
              type="button"
              className="gsp-btn gsp-btn-primary gsp-btn-sm"
              onClick={handleTestHitem}
              disabled={!settings.hitem3dAccessKey || !settings.hitem3dSecretKey || hitemTestStatus === 'testing'}
            >
              {hitemTestStatus === 'testing' ? 'Testing...' : 'Test Keys'}
            </button>
          </div>
          {hitemTestStatus === 'ok' && <div className="gsp-key-status gsp-key-ok">Hitem3D credentials are valid.</div>}
          {hitemTestStatus === 'fail' && <div className="gsp-key-status gsp-key-fail">{hitemTestError || 'Key test failed.'}</div>}
        </section>

        <section className="gsp-section">
          <h2 className="gsp-section-title">ElevenLabs API Key</h2>
          <p className="gsp-section-desc">
            Required for AI voice generation. Get a key from{' '}
            <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="gsp-link">
              elevenlabs.io
            </a>.
          </p>
          <div className="gsp-field-row">
            <input
              className="gsp-input gsp-input-key"
              type="password"
              value={settings.elevenLabsApiKey}
              onChange={(e) => { setGlobalSettings({ elevenLabsApiKey: e.target.value.trim() }); setElTestStatus('idle'); }}
              placeholder="sk_..."
              spellCheck={false}
              autoComplete="off"
            />
            <button
              type="button"
              className="gsp-btn gsp-btn-primary gsp-btn-sm"
              onClick={handleTestElevenLabs}
              disabled={!settings.elevenLabsApiKey || elTestStatus === 'testing'}
            >
              {elTestStatus === 'testing' ? 'Testing...' : 'Test Key'}
            </button>
          </div>
          {elTestStatus === 'ok' && <div className="gsp-key-status gsp-key-ok">ElevenLabs API key is valid.</div>}
          {elTestStatus === 'fail' && <div className="gsp-key-status gsp-key-fail">{elTestError || 'Key test failed.'}</div>}
        </section>

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

        <section className="gsp-section">
          <h2 className="gsp-section-title">Blender Executable</h2>
          <p className="gsp-section-desc">
            Path to the Blender executable for headless model processing (scaling, collision generation).
            Required for the UE5 3D Viewer node in PropLab.
          </p>

          <div className="gsp-field-row">
            <input
              className="gsp-input"
              value={settings.blenderPath}
              onChange={(e) => handleBlenderPathChange(e.target.value)}
              placeholder="e.g., C:\Program Files\Blender Foundation\Blender 4.3\blender.exe"
            />
            <button
              type="button"
              className="gsp-btn"
              onClick={() => setShowBrowserBlender(true)}
            >
              Browse
            </button>
            <button
              type="button"
              className="gsp-btn"
              onClick={handleDetectBlender}
              disabled={blenderDetecting}
            >
              {blenderDetecting ? 'Detecting...' : 'Detect'}
            </button>
          </div>

          {settings.blenderPath && (
            <div className="gsp-preview">
              <div className="gsp-preview-title">Blender path</div>
              <pre className="gsp-tree">{settings.blenderPath}</pre>
            </div>
          )}
        </section>

        <section className="gsp-section">
          <h2 className="gsp-section-title">UE5 Project Path</h2>
          <p className="gsp-section-desc">
            Root folder of your Unreal Engine 5 project. Used by the &ldquo;Send to UE5&rdquo; button
            in the 3D viewer nodes to auto-import meshes into the editor.
            Requires the <strong>Web Remote Control</strong> and <strong>Python Editor Script</strong> plugins
            enabled in UE5 (port 30010).
          </p>

          <div className="gsp-field-row">
            <input
              className="gsp-input"
              value={settings.ue5ProjectPath}
              onChange={(e) => handleUE5ProjectPathChange(e.target.value)}
              placeholder="e.g., C:\Users\me\Unreal Projects\MyGame"
            />
            <button
              type="button"
              className="gsp-btn"
              onClick={() => setShowBrowserUE5(true)}
            >
              Browse
            </button>
            <button
              type="button"
              className="gsp-btn gsp-btn-primary gsp-btn-sm"
              onClick={handleTestUE5}
              disabled={ue5TestStatus === 'testing'}
            >
              {ue5TestStatus === 'testing' ? 'Testing...' : 'Test UE5'}
            </button>
          </div>
          {ue5TestStatus === 'ok' && <div className="gsp-key-status gsp-key-ok">UE5 Remote Control API is reachable.</div>}
          {ue5TestStatus === 'fail' && <div className="gsp-key-status gsp-key-fail">{ue5TestError || 'Cannot reach UE5.'}</div>}

          {settings.ue5ProjectPath && (
            <>
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="gsp-btn gsp-btn-primary"
                  onClick={handleSetupUE5}
                  disabled={ue5SetupStatus === 'working'}
                >
                  {ue5SetupStatus === 'working' ? 'Installing...' : 'Setup UE5 Auto-Import'}
                </button>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 10 }}>
                  Installs a Python watcher script into the UE5 project. One-time setup.
                </span>
              </div>
              {ue5SetupStatus === 'ok' && <div className="gsp-key-status gsp-key-ok">{ue5SetupMsg}</div>}
              {ue5SetupStatus === 'fail' && <div className="gsp-key-status gsp-key-fail">{ue5SetupMsg}</div>}

              <div className="gsp-preview">
                <div className="gsp-preview-title">How it works</div>
                <pre className="gsp-tree">{`${settings.ue5ProjectPath}\\
  Saved\\StagedImports\\
    {asset_name}\\
      {asset_name}.glb          ← mesh
      T_{asset_name}_BaseColor.png  ← PBR textures
      T_{asset_name}_Normal.png
      T_{asset_name}_Metallic.png
      T_{asset_name}_Roughness.png
      manifest.json             ← picked up by watcher

  Content\\OKDO\\
    {asset_name}\\
      SM_{asset_name}           ← Static Mesh
      MI_{asset_name}           ← Material Instance
      T_{asset_name}_*          ← Textures`}</pre>
              </div>
            </>
          )}
        </section>

        <section className="gsp-section">
          <h2 className="gsp-section-title">Project Knowledge Documents</h2>
          <p className="gsp-section-desc">
            Add project documents that personas can reference. When enabled on a persona,
            they will have deep knowledge of the document as if they&apos;ve been working on the project.
          </p>

          {knowledgeDocs.length > 0 && !editingDocId && (
            <div className="gsp-kb-list">
              {knowledgeDocs.map((doc) => (
                <div key={doc.id} className="gsp-kb-item">
                  <span className="gsp-kb-item-icon">📋</span>
                  <span className="gsp-kb-item-name">{doc.name}</span>
                  <span className="gsp-kb-item-size">{(doc.content.length / 1024).toFixed(1)}KB</span>
                  <button type="button" className="gsp-btn gsp-btn-sm" onClick={() => handleEditDoc(doc)}>Edit</button>
                  <button
                    type="button"
                    className="gsp-btn gsp-btn-sm"
                    style={{ color: '#ef4444' }}
                    onClick={() => handleDeleteDoc(doc.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          {editingDocId && (
            <div className="gsp-kb-editor">
              <input
                className="gsp-input"
                value={docDraftName}
                onChange={(e) => setDocDraftName(e.target.value)}
                placeholder="Document name (e.g., Valor Master Overview)"
                spellCheck={false}
              />
              <textarea
                className="gsp-input gsp-kb-content"
                value={docDraftContent}
                onChange={(e) => setDocDraftContent(e.target.value)}
                placeholder="Paste the full document content here..."
                spellCheck={false}
                rows={12}
              />
              <div className="gsp-field-row" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="gsp-btn gsp-btn-primary"
                  onClick={handleSaveDoc}
                  disabled={!docDraftName.trim() || !docDraftContent.trim()}
                >
                  Save Document
                </button>
                <button type="button" className="gsp-btn" onClick={handleCancelDoc}>Cancel</button>
                {docDraftContent && (
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {(docDraftContent.length / 1024).toFixed(1)}KB
                  </span>
                )}
              </div>
            </div>
          )}

          {!editingDocId && (
            <button type="button" className="gsp-btn gsp-btn-primary" onClick={handleAddDoc}>
              + Add Document
            </button>
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

      {showBrowserBlender && (
        <FolderBrowser
          onSelect={handleBrowseBlenderSelect}
          onCancel={() => setShowBrowserBlender(false)}
        />
      )}

      {showBrowserUE5 && (
        <FolderBrowser
          onSelect={handleBrowseUE5Select}
          onCancel={() => setShowBrowserUE5(false)}
        />
      )}
    </div>
  );
}
