import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, ConfirmButton } from '../ui';
import { Archive, RotateCcw, Plus, Loader2, Trash2, X, Clock, Download, Upload } from 'lucide-react';

interface Snapshot {
  id: string;
  label: string;
  settings_json: Record<string, any>;
  pages_json: Record<string, any>[];
  created_at: string;
}

const BACKUP_TABLES = [
  'site_settings', 'pages', 'events', 'venues', 'gallery_photos',
  'story_milestones', 'entourage_members', 'rsvp_questions',
  'email_settings', 'collaborators',
] as const;

const GUEST_TABLES = [
  'parties', 'guests', 'rsvp_answers', 'guest_event_rsvps',
  'seating_tables', 'seat_assignments', 'invitations',
] as const;

const ALL_TABLES = [...BACKUP_TABLES, ...GUEST_TABLES] as const;

export default function BackupRestore({ onRestored }: { onRestored: () => void }) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState('');
  const [error, setError] = useState('');
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPct, setProgressPct] = useState(0);

  const isBusy = downloading || uploading || creating || restoringId !== null;

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('backup_snapshots').select('*').order('created_at', { ascending: false });
    setSnapshots((data as Snapshot[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const collectAllData = async (onProgress?: (msg: string, pct: number) => void) => {
    const backup: Record<string, any> = { _meta: { version: 2, exported_at: new Date().toISOString() } };
    const totalTables = ALL_TABLES.length;
    for (let i = 0; i < totalTables; i++) {
      const table = ALL_TABLES[i];
      onProgress?.(`Reading ${table}...`, Math.round((i / (totalTables + 1)) * 80));
      const { data, error } = await supabase.from(table).select('*');
      if (error) console.warn(`Backup: could not read ${table}:`, error.message);
      backup[table] = data || [];
    }

    onProgress?.('Collecting uploaded images...', 80);
    backup._storage = await collectStorageFiles((msg, pct) => onProgress?.(msg, 80 + Math.round(pct * 0.2)));
    return backup;
  };

  const collectStorageFiles = async (onProgress?: (msg: string, pct: number) => void): Promise<Record<string, { path: string; mime: string; data: string }>> => {
    const files: Record<string, { path: string; mime: string; data: string }> = {};
    const { data: folders, error } = await supabase.storage.from('wedding-images').list('');
    if (error || !folders) { console.warn('Storage list error:', error?.message); return files; }

    const allPaths: { folder: string; name: string; path: string }[] = [];
    for (const folder of folders) {
      if (!folder.id) continue;
      const { data: items } = await supabase.storage.from('wedding-images').list(folder.name, { limit: 1000 });
      if (!items) continue;
      for (const item of items) {
        if (!item.id) continue;
        allPaths.push({ folder: folder.name, name: item.name, path: `${folder.name}/${item.name}` });
      }
    }

    const total = allPaths.length;
    for (let i = 0; i < total; i++) {
      const { path } = allPaths[i];
      onProgress?.(`Downloading image ${i + 1}/${total}`, Math.round((i / total) * 100));
      const { data: blob, error: dlErr } = await supabase.storage.from('wedding-images').download(path);
      if (dlErr || !blob) { console.warn(`Could not download ${path}:`, dlErr?.message); continue; }
      const buf = await blob.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      files[path] = { path, mime: blob.type || 'application/octet-stream', data: b64 };
    }
    return files;
  };

  const createBackup = async () => {
    setCreating(true);
    setError('');
    setProgressPct(0);
    setProgressMsg('Starting...');
    try {
      const allData = await collectAllData((msg, pct) => { setProgressMsg(msg); setProgressPct(pct); });
      setProgressMsg('Saving snapshot...');
      setProgressPct(95);
      const { error: insertError } = await supabase.from('backup_snapshots').insert({
        label: label.trim() || `Backup ${new Date().toLocaleDateString()}`,
        settings_json: allData,
        pages_json: [],
      });
      if (insertError) throw insertError;
      setLabel('');
      setShowCreate(false);
      setProgressPct(100);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create backup.');
    }
    setProgressMsg('');
    setProgressPct(0);
    setCreating(false);
  };

  const downloadBackup = async () => {
    setDownloading(true);
    setError('');
    setProgressPct(0);
    setProgressMsg('Starting...');
    try {
      const allData = await collectAllData((msg, pct) => { setProgressMsg(msg); setProgressPct(pct); });
      setProgressMsg('Building download file...');
      setProgressPct(95);
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wedding-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setProgressPct(100);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to download backup.');
    }
    setProgressMsg('');
    setProgressPct(0);
    setDownloading(false);
  };

  const uploadBackup = async (file: File) => {
    setUploading(true);
    setUploadResult('');
    setError('');
    setProgressPct(0);
    setProgressMsg('Reading backup file...');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data._meta || !data._meta.version) {
        throw new Error('Invalid backup file: missing metadata.');
      }

      setProgressMsg('Saving uploaded backup as snapshot...');
      setProgressPct(90);

      const fileLabel = `manual_upload_${file.name}`;
      const { error: insertError } = await supabase.from('backup_snapshots').insert({
        label: fileLabel,
        settings_json: data,
        pages_json: [],
      });
      if (insertError) throw insertError;

      setProgressPct(100);
      setUploadResult(`Backup file "${file.name}" saved as a snapshot. Use the Restore button to restore it.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save uploaded backup.');
    }
    setProgressMsg('');
    setProgressPct(0);
    setUploading(false);
  };

  const restore = async (snapshot: Snapshot) => {
    setRestoringId(snapshot.id);
    setError('');
    setUploadResult('');
    setProgressPct(0);
    setProgressMsg('Restoring from snapshot...');
    try {
      const allData = snapshot.settings_json as Record<string, any>;
      let restoredCount = 0;
      const totalTables = ALL_TABLES.length;

      for (let t = 0; t < totalTables; t++) {
        const table = ALL_TABLES[t];
        const rows = allData[table];
        if (!rows || !Array.isArray(rows) || rows.length === 0) continue;
        const tablePct = Math.round((t / totalTables) * 70);
        setProgressMsg(`Restoring ${table}...`);
        setProgressPct(tablePct);
        for (const row of rows) {
          const rowCopy = { ...row };
          delete rowCopy.id;
          const { data: existing } = await supabase.from(table).select('id').eq('id', row.id).maybeSingle();
          if (existing) {
            await supabase.from(table).update(rowCopy).eq('id', row.id);
          } else {
            await supabase.from(table).insert({ ...rowCopy, id: row.id });
          }
          restoredCount++;
        }
      }

      let imgCount = 0;
      if (allData._storage && typeof allData._storage === 'object') {
        const storageEntries = Object.entries(allData._storage) as [string, { path: string; mime: string; data: string }][];
        const totalImgs = storageEntries.length;
        for (let i = 0; i < totalImgs; i++) {
          const [key, file] = storageEntries[i];
          setProgressMsg(`Uploading images... ${i + 1}/${totalImgs}`);
          setProgressPct(70 + Math.round((i / totalImgs) * 30));
          try {
            const bin = atob(file.data);
            const buf = new Uint8Array(bin.length);
            for (let j = 0; j < bin.length; j++) buf[j] = bin.charCodeAt(j);
            const blob = new Blob([buf], { type: file.mime });
            const { error: upErr } = await supabase.storage.from('wedding-images').upload(file.path, blob, { contentType: file.mime, upsert: true });
            if (upErr) console.warn(`Storage upload ${file.path}:`, upErr.message);
            else imgCount++;
          } catch (e) {
            console.warn(`Could not restore image ${key}:`, e);
          }
        }
        setUploadResult(`Restored ${restoredCount} record${restoredCount !== 1 ? 's' : ''} and ${imgCount} image${imgCount !== 1 ? 's' : ''}.`);
      }

      setProgressPct(100);
      onRestored();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to restore backup.');
    }
    setProgressMsg('');
    setProgressPct(0);
    setRestoringId(null);
  };

  const remove = async (id: string) => {
    if (isBusy) return;
    await supabase.from('backup_snapshots').delete().eq('id', id);
    await load();
  };

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + ' · ' +
      d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <Card className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[#3a2e22] flex items-center gap-2"><Archive size={16} className="text-[#8a6d3b]" /> Backup &amp; Restore</h3>
        <div className="flex gap-2">
          <button onClick={downloadBackup} disabled={isBusy} className="btn-ghost flex items-center gap-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed">
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download
          </button>
          <label className={`btn-ghost flex items-center gap-1.5 text-xs cursor-pointer ${isBusy ? 'opacity-50 pointer-events-none' : ''}`}>
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload
            <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBackup(f); e.target.value = ''; }} />
          </label>
          <button onClick={() => setShowCreate(true)} disabled={isBusy} className="btn-ghost flex items-center gap-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed">
            <Plus size={14} /> Snapshot
          </button>
        </div>
      </div>
      <p className="text-xs text-[#8a7a66] mb-3">Download a complete backup to your computer — all database tables (settings, fonts, colors, pages, guests, RSVPs, events, venues, gallery, seating, invitations) plus all uploaded images (hero photos, gallery, monogram, venue photos, entourage). Upload a backup file to save it as a snapshot here, then use the Restore button to restore it anytime.</p>

      {isBusy && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1.5 text-xs text-[#8a6d3b]">
            <Loader2 size={12} className="animate-spin shrink-0" />
            <span className="truncate">{progressMsg}</span>
            <span className="ml-auto shrink-0 font-semibold">{progressPct}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#e6ddcd' }}>
            <div className="h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${progressPct}%`, background: '#8a6d3b' }} />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-[#b03a3a] mb-3">{error}</p>}
      {uploadResult && !isBusy && <p className="text-sm text-[#5a7a4a] mb-3">{uploadResult}</p>}

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-[#8a6d3b]" /></div>
      ) : snapshots.length === 0 ? (
        <div className="text-center py-8 rounded-lg border-2 border-dashed" style={{ borderColor: '#e6ddcd' }}>
          <Archive size={28} className="mx-auto text-[#c9b896] mb-2" />
          <p className="text-sm text-[#8a7a66]">No saved snapshots yet. Use Download for a full backup file, or Snapshot to save one here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {snapshots.map((snap) => (
            <div key={snap.id} className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: '#e6ddcd', background: '#faf6ee' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#f0e8d8' }}>
                <Archive size={16} className="text-[#8a6d3b]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#3a2e22] truncate">{snap.label}</p>
                <p className="text-[10px] text-[#8a7a66] flex items-center gap-1"><Clock size={9} /> {fmtDate(snap.created_at)}</p>
              </div>
              <button
                onClick={() => restore(snap)}
                disabled={isBusy}
                className="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#e8f0e4', color: '#5a7a4a' }}
              >
                {restoringId === snap.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                Restore
              </button>
              <ConfirmButton onConfirm={() => remove(snap.id)}><Trash2 size={14} className={`text-[#c9b896] hover:text-[#b03a3a] ${isBusy ? 'pointer-events-none opacity-30' : ''}`} /></ConfirmButton>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.4)' }} onClick={() => !creating && setShowCreate(false)}>
          <div className="admin-card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#3a2e22]">Create Snapshot</h3>
              <button onClick={() => setShowCreate(false)} disabled={creating} className="disabled:opacity-40"><X size={18} className="text-[#8a7a66]" /></button>
            </div>
            <p className="text-xs text-[#8a7a66] mb-3">Saves all database tables and uploaded images to this dashboard. Download a file for off-system backup.</p>
            <input className="admin-input mb-4" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Before redesign, Final v2…" autoFocus onKeyDown={(e) => e.key === 'Enter' && createBackup()} />
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(false)} disabled={creating} className="btn-ghost flex-1">Cancel</button>
              <button onClick={createBackup} disabled={creating} className="btn-primary flex-1 flex items-center justify-center gap-1.5">
                {creating ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Archive size={14} /> Save Snapshot</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
