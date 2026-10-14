'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Type,
  Square,
  BarChart3,
  ImagePlus,
  Undo2,
  Redo2,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Play,
  Download,
  Save,
  RefreshCw,
  Bookmark,
  Share2,
  X,
  PanelRight,
} from 'lucide-react';
import type { Survey } from '@/lib/types';
import {
  makeElement,
  themes,
  SLIDE_WIDTH,
  SLIDE_HEIGHT,
  type PresentationDocument,
  type Slide,
  type SlideElement,
  type PresentationTheme,
} from '@/lib/presentation-model';
import { ElementContent, SlideRenderer, SlideThumbnail } from './slide-renderer';
import { Button, Badge, FullscreenDialog, Modal } from './ui';
import { ShareDialog } from './share-dialog';

const uid = () => crypto.randomUUID();
type Gesture = {
  pointer: number;
  kind: 'move' | 'resize';
  startX: number;
  startY: number;
  element: SlideElement;
  document: PresentationDocument;
  scale: number;
};
export function PresentationEditor({
  initialDocument,
  survey,
}: {
  initialDocument: PresentationDocument;
  survey: Survey;
}) {
  const router = useRouter();
  const [document, setDocument] = useState(initialDocument);
  const current = useRef(initialDocument);
  const [slideId, setSlideId] = useState(initialDocument.slides[0].id);
  const [selection, setSelection] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [templateName, setTemplateName] = useState(initialDocument.title);
  const [templatePending, setTemplatePending] = useState(false);
  const [undoStack, setUndoStack] = useState<PresentationDocument[]>([]);
  const [redoStack, setRedoStack] = useState<PresentationDocument[]>([]);
  const [scale, setScale] = useState(0.65);
  const [zoom, setZoom] = useState(1);
  const canvasHost = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [panel, setPanel] = useState<'slides' | 'properties'>('slides');
  const [assets, setAssets] = useState<{ id: string; name: string; width: number; height: number }[]>([]);
  const [imageOpen, setImageOpen] = useState(false);
  const [imagePending, setImagePending] = useState(false);
  const exportNodes = useRef(new Map<string, HTMLDivElement>());
  const slide = document.slides.find((item) => item.id === slideId) ?? document.slides[0];
  const selected = slide.elements.find((item) => item.id === selection);
  function selectElement(id: string | null) {
    setSelection(id);
    setInspectorOpen(id !== null);
  }
  useEffect(() => {
    const host = canvasHost.current;
    if (!host) return;
    const observer = new ResizeObserver(([entry]) =>
      setScale(Math.max(0.18, Math.min(1, (entry.contentRect.width - 48) / SLIDE_WIDTH))),
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);
  function commit(next: PresentationDocument, history = true) {
    if (history) {
      setUndoStack((items) => [...items.slice(-39), current.current]);
      setRedoStack([]);
    }
    current.current = next;
    setDocument(next);
    setDirty(true);
    setError('');
  }
  function editSlide(next: Slide, history = true) {
    commit(
      {
        ...current.current,
        slides: current.current.slides.map((item) => (item.id === next.id ? next : item)),
      },
      history,
    );
  }
  function patchElement(patch: Partial<SlideElement>) {
    if (!selected) return;
    let next = { ...selected, ...patch };
    next = { ...next, w: Math.min(SLIDE_WIDTH, next.w), h: Math.min(SLIDE_HEIGHT, next.h) };
    next.x = Math.max(0, Math.min(SLIDE_WIDTH - next.w, next.x));
    next.y = Math.max(0, Math.min(SLIDE_HEIGHT - next.h, next.y));
    editSlide({ ...slide, elements: slide.elements.map((item) => (item.id === next.id ? next : item)) });
  }
  function addElement(type: SlideElement['type'], extra: Partial<SlideElement> = {}) {
    const palette = themes[current.current.theme];
    const element = makeElement(uid(), type, { color: palette.ink, fill: palette.accent, ...extra });
    editSlide({ ...slide, elements: [...slide.elements, element] });
    selectElement(element.id);
    setPanel('properties');
  }
  function deleteElement() {
    if (!selected) return;
    editSlide({ ...slide, elements: slide.elements.filter((item) => item.id !== selected.id) });
    selectElement(null);
  }
  function duplicateElement() {
    if (!selected) return;
    addElement(selected.type, {
      ...selected,
      id: uid(),
      x: Math.min(SLIDE_WIDTH - selected.w, selected.x + 16),
      y: Math.min(SLIDE_HEIGHT - selected.h, selected.y + 16),
    });
  }
  function moveLayer(direction: number) {
    if (!selected) return;
    const elements = [...slide.elements];
    const index = elements.findIndex((item) => item.id === selected.id);
    const target = Math.max(0, Math.min(elements.length - 1, index + direction));
    [elements[index], elements[target]] = [elements[target], elements[index]];
    editSlide({ ...slide, elements });
  }
  function addSlide(copy = false) {
    const next: Slide = copy
      ? {
          ...structuredClone(slide),
          id: uid(),
          name: `${slide.name.slice(0, 130)} (salinan)`,
          elements: slide.elements.map((item) => ({ ...item, id: uid() })),
        }
      : {
          id: uid(),
          name: `Slide ${document.slides.length + 1}`,
          background: themes[document.theme].background,
          elements: [],
        };
    if (document.slides.length >= 40) {
      setError('Maksimal 40 slide per dokumen.');
      return;
    }
    commit({ ...current.current, slides: [...current.current.slides, next] });
    setSlideId(next.id);
    selectElement(null);
  }
  function removeSlide() {
    if (document.slides.length === 1) {
      setError('Dokumen harus memiliki satu slide.');
      return;
    }
    const remaining = document.slides.filter((item) => item.id !== slide.id);
    commit({ ...current.current, slides: remaining });
    setSlideId(remaining[0].id);
    selectElement(null);
  }
  function reorderSlide(direction: number) {
    const items = [...document.slides];
    const index = items.findIndex((item) => item.id === slide.id);
    const target = Math.max(0, Math.min(items.length - 1, index + direction));
    [items[index], items[target]] = [items[target], items[index]];
    commit({ ...current.current, slides: items });
  }
  function historyAction(redo = false) {
    const stack = redo ? redoStack : undoStack;
    if (!stack.length) return;
    const previous = stack[stack.length - 1];
    const next = { ...structuredClone(previous), version: current.current.version };
    if (redo) {
      setRedoStack(stack.slice(0, -1));
      setUndoStack((items) => [...items, current.current]);
    } else {
      setUndoStack(stack.slice(0, -1));
      setRedoStack((items) => [...items, current.current]);
    }
    commit(next, false);
    if (!next.slides.some((item) => item.id === slideId)) setSlideId(next.slides[0].id);
    selectElement(null);
  }
  async function save() {
    if (busy.current) return false;
    busy.current = true;
    setSaving(true);
    setError('');
    const snapshot = current.current;
    try {
      const response = await fetch(`/api/presentations/${snapshot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
      });
      const saved: PresentationDocument & { error?: string } = await response.json();
      if (!response.ok) throw new Error(saved.error);
      if (current.current === snapshot) {
        current.current = saved;
        setDocument(saved);
        setDirty(false);
      } else {
        const merged = { ...current.current, version: saved.version };
        current.current = merged;
        setDocument(merged);
      }
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Perubahan gagal disimpan.');
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  const autoSave = useEffectEvent(() => {
    void save();
  });
  useEffect(() => {
    if (!dirty || saving || error || gesture.current) return;
    const timer = setTimeout(autoSave, 1000);
    return () => clearTimeout(timer);
  }, [document, dirty, saving, error]);
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const keyHandler = useEffectEvent((event: KeyboardEvent) => {
    if (preview) {
      if (event.key === 'ArrowRight')
        setPreviewIndex((index) => Math.min(document.slides.length - 1, index + 1));
      if (event.key === 'ArrowLeft') setPreviewIndex((index) => Math.max(0, index - 1));
      if (event.key === 'Escape') setPreview(false);
      return;
    }
    if (
      (event.target as HTMLElement)?.closest('input,textarea,select,[contenteditable="true"]') ||
      exportOpen ||
      imageOpen ||
      templateOpen ||
      sharing
    )
      return;
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && event.key.toLowerCase() === 's') {
      event.preventDefault();
      void save();
    }
    if (modifier && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      historyAction(event.shiftKey);
    }
    if (modifier && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      duplicateElement();
    }
    if (selected && ['Delete', 'Backspace'].includes(event.key)) {
      event.preventDefault();
      deleteElement();
    }
    if (selected && event.key.startsWith('Arrow')) {
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      patchElement({
        x: selected.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0),
        y: selected.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0),
      });
    }
  });
  useEffect(() => {
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, []);
  function startGesture(
    event: React.PointerEvent<HTMLDivElement>,
    element: SlideElement,
    kind: 'move' | 'resize',
  ) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    // Keep the viewport stable while the pointer gesture is in progress.
    setSelection(element.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = {
      pointer: event.pointerId,
      kind,
      startX: event.clientX,
      startY: event.clientY,
      element: structuredClone(element),
      document: current.current,
      scale: scale * zoom,
    };
  }
  function moveGesture(event: React.PointerEvent<HTMLDivElement>) {
    const action = gesture.current;
    if (!action || action.pointer !== event.pointerId) return;
    const dx = (event.clientX - action.startX) / action.scale;
    const dy = (event.clientY - action.startY) / action.scale;
    const snap = (value: number) => (event.altKey ? value : Math.round(value / 8) * 8);
    const item = action.element;
    const moved =
      action.kind === 'move'
        ? {
            ...item,
            x: Math.max(0, Math.min(SLIDE_WIDTH - item.w, snap(item.x + dx))),
            y: Math.max(0, Math.min(SLIDE_HEIGHT - item.h, snap(item.y + dy))),
          }
        : {
            ...item,
            w: Math.max(16, Math.min(SLIDE_WIDTH - item.x, snap(item.w + dx))),
            h: Math.max(8, Math.min(SLIDE_HEIGHT - item.y, snap(item.h + dy))),
          };
    const originalSlide = action.document.slides.find((s) => s.id === slide.id)!;
    commit(
      {
        ...action.document,
        version: current.current.version,
        slides: action.document.slides.map((s) =>
          s.id === slide.id
            ? {
                ...originalSlide,
                elements: originalSlide.elements.map((e) => (e.id === item.id ? moved : e)),
              }
            : s,
        ),
      },
      false,
    );
  }
  function endGesture() {
    const action = gesture.current;
    if (!action) return;
    gesture.current = null;
    setInspectorOpen(true);
    setPanel('properties');
    if (current.current !== action.document) {
      setUndoStack((items) => [...items.slice(-39), action.document]);
      setRedoStack([]);
      setDocument({ ...current.current });
    }
  }
  async function refreshData() {
    if (dirty && !(await save())) return;
    setSaving(true);
    busy.current = true;
    const snapshot = current.current;
    try {
      const response = await fetch(`/api/presentations/${document.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh', version: current.current.version }),
      });
      const refreshed = await response.json();
      if (!response.ok) throw new Error(refreshed.error);
      const changed = current.current !== snapshot;
      const merged = changed ? { ...current.current, version: refreshed.version } : refreshed;
      current.current = merged;
      setDocument(merged);
      setDirty(changed);
      setNotice('Angka dan grafik diperbarui. Susunan dan catatan tetap tersimpan.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Data gagal diperbarui.');
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  async function openImages() {
    setImageOpen(true);
    setError('');
    try {
      const response = await fetch('/api/assets');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setAssets(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Gambar gagal dimuat.');
    }
  }
  async function uploadImage(file: File) {
    setImagePending(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/assets', { method: 'POST', body });
      const asset = await response.json();
      if (!response.ok) throw new Error(asset.error);
      setAssets((items) => [asset, ...items.filter((item) => item.id !== asset.id)]);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unggahan gagal.');
    } finally {
      setImagePending(false);
    }
  }
  function insertImage(asset: (typeof assets)[number]) {
    const w = Math.min(650, asset.width);
    const h = Math.min(450, (w * asset.height) / asset.width);
    addElement('image', { assetId: asset.id, text: asset.name, w: (h * asset.width) / asset.height, h });
    setImageOpen(false);
  }
  async function saveTemplate(event: React.FormEvent) {
    event.preventDefault();
    if (dirty && !(await save())) return;
    setTemplatePending(true);
    try {
      const response = await fetch(`/api/presentations/${document.id}/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: templateName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setTemplateOpen(false);
      setNotice('Template slide tersimpan di pustaka template.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Template gagal disimpan.');
    } finally {
      setTemplatePending(false);
    }
  }
  async function exportFile(kind: 'pdf' | 'pptx') {
    setExporting(true);
    setError('');
    try {
      await window.document.fonts.ready;
      const { toPng, getFontEmbedCSS } = await import('html-to-image');
      const first = exportNodes.current.get(document.slides[0].id)!;
      const fontEmbedCSS = await getFontEmbedCSS(first);
      const images: string[] = [];
      for (let index = 0; index < document.slides.length; index++) {
        setNotice(`Menyiapkan slide ${index + 1} dari ${document.slides.length}…`);
        const node = exportNodes.current.get(document.slides[index].id);
        if (!node) throw new Error('Slide belum siap diekspor.');
        images.push(
          await toPng(node, {
            width: SLIDE_WIDTH,
            height: SLIDE_HEIGHT,
            pixelRatio: 1.5,
            fontEmbedCSS,
            cacheBust: false,
          }),
        );
      }
      const filename = document.title.replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 80) || 'SurveyDash';
      if (kind === 'pdf') {
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'px',
          format: [1280, 720],
          hotfixes: ['px_scaling'],
        });
        images.forEach((data, index) => {
          if (index) pdf.addPage([1280, 720], 'landscape');
          pdf.addImage(data, 'PNG', 0, 0, 1280, 720);
        });
        pdf.save(`${filename}.pdf`);
      } else {
        const { default: PptxGenJS } = await import('pptxgenjs');
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_WIDE';
        pptx.author = 'SurveyDash Studio';
        pptx.subject = survey.demo ? 'Hasil survei · Data simulasi' : 'Hasil survei';
        pptx.title = document.title;
        images.forEach((data) => pptx.addSlide().addImage({ data, x: 0, y: 0, w: 13.333333, h: 7.5 }));
        await pptx.writeFile({ fileName: `${filename}.pptx` });
      }
      setNotice(`${kind.toUpperCase()} berhasil diunduh.`);
      setExportOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ekspor gagal. Coba kembali.');
    } finally {
      setExporting(false);
    }
  }
  function changeTheme(theme: PresentationTheme) {
    const before = themes[document.theme];
    const after = themes[theme];
    commit({
      ...current.current,
      theme,
      slides: document.slides.map((s) => ({
        ...s,
        background: s.background === before.background ? after.background : s.background,
        elements: s.elements.map((e) => ({
          ...e,
          color: e.color === before.ink ? after.ink : e.color,
          fill: e.fill === before.accent ? after.accent : e.fill,
        })),
      })),
    });
  }
  return (
    <div className="slide-studio">
      <header className="slide-studio-header">
        <Link
          href={`/studio/${survey.id}`}
          className="canvas-back"
          aria-label="Kembali ke survei"
          onClick={(event) => {
            if (dirty) {
              event.preventDefault();
              void save().then((ok) => {
                if (ok) router.push(`/studio/${survey.id}`);
              });
            }
          }}
        >
          <ArrowLeft size={18} />
        </Link>
        <input
          aria-label="Judul presentasi"
          value={document.title}
          maxLength={200}
          onChange={(e) => commit({ ...current.current, title: e.target.value })}
        />
        <Badge tone={error ? 'amber' : 'green'}>
          {saving
            ? 'Menyimpan…'
            : error && dirty
              ? 'Gagal menyimpan'
              : dirty
                ? 'Belum tersimpan'
                : 'Tersimpan'}
        </Badge>
        {document.demo && <Badge>Data simulasi</Badge>}
        <div className="actions">
          <Button
            variant="ghost"
            aria-label="Undo"
            disabled={!undoStack.length}
            onClick={() => historyAction()}
          >
            <Undo2 size={17} />
          </Button>
          <Button
            variant="ghost"
            aria-label="Redo"
            disabled={!redoStack.length}
            onClick={() => historyAction(true)}
          >
            <Redo2 size={17} />
          </Button>
          <Button variant="secondary" disabled={saving} onClick={() => void refreshData()}>
            <RefreshCw size={14} />
            Perbarui data
          </Button>
          <Button variant="secondary" onClick={() => setTemplateOpen(true)}>
            <Bookmark size={14} />
            Template
          </Button>
          <Button
            variant="secondary"
            disabled={saving}
            onClick={async () => {
              if (dirty && !(await save())) return;
              setSharing(true);
            }}
          >
            <Share2 size={14} />
            Bagikan
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setPreviewIndex(document.slides.findIndex((s) => s.id === slide.id));
              setPreview(true);
            }}
          >
            <Play size={14} />
            Pratinjau
          </Button>
          <Button onClick={() => setExportOpen(true)}>
            <Download size={14} />
            Ekspor
          </Button>
        </div>
      </header>
      {error && (
        <div className="banner banner-error" role="alert">
          {error}
          <Button variant="ghost" disabled={saving || !dirty} onClick={() => void save()}>
            <Save size={14} />
            Coba simpan
          </Button>
        </div>
      )}
      {notice && (
        <div className="canvas-notice" role="status">
          {notice}
          <button aria-label="Tutup pemberitahuan" onClick={() => setNotice('')}>
            <X size={13} />
          </button>
        </div>
      )}
      <div className="canvas-mobile-tabs">
        <button aria-pressed={panel === 'slides'} onClick={() => setPanel('slides')}>
          Slide
        </button>
        <button
          aria-pressed={panel === 'properties' && inspectorOpen}
          onClick={() => {
            setPanel('properties');
            setInspectorOpen(true);
          }}
        >
          Properti & lapisan
        </button>
      </div>
      <div className="slide-studio-body">
        <aside className={`slide-list ${panel === 'slides' ? 'mobile-visible' : ''}`}>
          <div className="slide-list-heading">
            <strong>Slide</strong>
            <Button variant="ghost" aria-label="Tambah slide" onClick={() => addSlide()}>
              <Plus size={17} />
            </Button>
          </div>
          <div className="slide-list-items">
            {document.slides.map((item, index) => (
              <button
                className={item.id === slide.id ? 'active' : ''}
                key={item.id}
                onClick={() => {
                  setSlideId(item.id);
                  selectElement(null);
                }}
              >
                <SlideThumbnail slide={item} />
                <span>
                  {index + 1}. {item.name}
                </span>
              </button>
            ))}
          </div>
          <div className="slide-actions">
            <Button variant="ghost" aria-label="Naikkan slide" onClick={() => reorderSlide(-1)}>
              <ArrowUp size={14} />
            </Button>
            <Button variant="ghost" aria-label="Turunkan slide" onClick={() => reorderSlide(1)}>
              <ArrowDown size={14} />
            </Button>
            <Button variant="ghost" aria-label="Duplikat slide" onClick={() => addSlide(true)}>
              <Copy size={14} />
            </Button>
            <Button variant="ghost" aria-label="Hapus slide" onClick={removeSlide}>
              <Trash2 size={14} />
            </Button>
          </div>
        </aside>
        <main className="canvas-main">
          <div className="canvas-toolbar">
            <Button variant="ghost" onClick={() => addElement('text')}>
              <Type size={16} />
              Teks
            </Button>
            <Button variant="ghost" onClick={() => addElement('shape', { w: 320, h: 200 })}>
              <Square size={16} />
              Bentuk
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const q = survey.questions.find((q) => q.options.length);
                if (!q) {
                  setError('Tambahkan pertanyaan pilihan sebelum membuat grafik.');
                  return;
                }
                addElement('chart', {
                  text: q.label,
                  w: 740,
                  h: 390,
                  fontSize: 22,
                  binding: { kind: 'chart', questionId: q.id, chartType: 'bar' },
                });
              }}
            >
              <BarChart3 size={16} />
              Grafik
            </Button>
            <Button variant="ghost" onClick={() => void openImages()}>
              <ImagePlus size={16} />
              Gambar
            </Button>
            <span className="canvas-ratio">16:9</span>
            <label className="canvas-zoom">
              Zoom
              <select aria-label="Zoom kanvas" value={zoom} onChange={(e) => setZoom(Number(e.target.value))}>
                <option value={0.75}>75%</option>
                <option value={1}>Pas</option>
                <option value={1.25}>125%</option>
                <option value={1.5}>150%</option>
              </select>
            </label>
            <Button
              variant="ghost"
              aria-expanded={inspectorOpen}
              aria-controls="canvas-properties"
              onClick={() => {
                setInspectorOpen((value) => !value);
                setPanel('properties');
              }}
            >
              <PanelRight size={16} />
              {inspectorOpen ? 'Tutup panel' : selected ? 'Properti' : 'Pengaturan slide'}
            </Button>
          </div>
          <div className="canvas-workspace" ref={canvasHost} onPointerDown={() => selectElement(null)}>
            <div
              className="canvas-scaled"
              style={{ width: SLIDE_WIDTH * scale * zoom, height: SLIDE_HEIGHT * scale * zoom }}
            >
              <div
                className="presentation-slide editable-slide"
                style={{
                  width: SLIDE_WIDTH,
                  height: SLIDE_HEIGHT,
                  background: slide.background,
                  transform: `scale(${scale * zoom})`,
                  transformOrigin: 'top left',
                }}
              >
                {slide.elements.map((element) => (
                  <div
                    key={element.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${element.type === 'chart' ? 'Grafik' : element.type === 'image' ? 'Gambar' : element.type === 'shape' ? 'Bentuk' : 'Teks'}: ${element.text.slice(0, 60)}`}
                    className={`slide-object editable-object ${element.id === selection ? 'selected' : ''}`}
                    style={{
                      left: element.x,
                      top: element.y,
                      width: element.w,
                      height: element.h,
                      opacity: element.opacity,
                      transform: `rotate(${element.rotation}deg)`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectElement(element.id);
                      setPanel('properties');
                    }}
                    onFocus={() => selectElement(element.id)}
                    onPointerDown={(e) => startGesture(e, element, 'move')}
                    onPointerMove={moveGesture}
                    onPointerUp={endGesture}
                    onPointerCancel={endGesture}
                  >
                    <ElementContent element={element} />
                    {selection === element.id && (
                      <div
                        className="resize-handle"
                        role="button"
                        tabIndex={-1}
                        aria-label="Ubah ukuran komponen"
                        onPointerDown={(e) => startGesture(e, element, 'resize')}
                        onPointerMove={moveGesture}
                        onPointerUp={endGesture}
                        onPointerCancel={endGesture}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
            {!slide.elements.length && (
              <p className="canvas-empty-hint">Mulai dengan teks, bentuk, grafik, atau gambar.</p>
            )}
          </div>
          <footer className="canvas-status">
            {slide.name} · {document.slides.findIndex((s) => s.id === slide.id) + 1} /{' '}
            {document.slides.length}
            <span>Seret untuk mengatur · Alt: tanpa snap · Shift + panah: 10 px</span>
          </footer>
        </main>
        {inspectorOpen && (
          <aside
            id="canvas-properties"
            className={`canvas-inspector ${panel === 'properties' ? 'mobile-visible' : ''}`}
          >
            <div className="inspector-heading">
              <h3>{selected ? 'Properti komponen' : 'Pengaturan slide'}</h3>
              <Button
                variant="ghost"
                aria-label="Tutup panel properti"
                onClick={() => setInspectorOpen(false)}
              >
                <X size={16} />
              </Button>
            </div>
            {selected ? (
              <>
                <div className="inspector-actions">
                  <Button variant="ghost" onClick={duplicateElement}>
                    <Copy size={14} />
                    Duplikat
                  </Button>
                  <Button variant="ghost" onClick={deleteElement} aria-label="Hapus komponen">
                    <Trash2 size={14} />
                  </Button>
                </div>
                {selected.type === 'text' && (
                  <>
                    <label>
                      {selected.binding ? 'Label dari data' : 'Teks'}
                      <textarea
                        value={selected.text}
                        disabled={!!selected.binding}
                        onChange={(e) => patchElement({ text: e.target.value })}
                      />
                    </label>
                    <label>
                      Sumber teks
                      <select
                        value={selected.binding?.key ?? ''}
                        onChange={(e) =>
                          patchElement({
                            binding: e.target.value
                              ? {
                                  kind: 'metric',
                                  key: e.target.value as NonNullable<SlideElement['binding']>['key'],
                                }
                              : undefined,
                          })
                        }
                      >
                        <option value="">Teks manual</option>
                        <option value="total">Total responden</option>
                        <option value="completion">Capaian target</option>
                        <option value="ikm">Nilai IKM</option>
                        <option value="grade">Mutu pelayanan</option>
                        <option value="category">Kategori IKM</option>
                        <option value="target">Target responden</option>
                        <option value="summaryText">Ringkasan respons</option>
                      </select>
                    </label>
                    <div className="inspector-grid">
                      <label>
                        Ukuran font
                        <input
                          type="number"
                          min={8}
                          max={160}
                          value={selected.fontSize}
                          onChange={(e) =>
                            patchElement({ fontSize: Math.max(8, Math.min(160, Number(e.target.value))) })
                          }
                        />
                      </label>
                      <label>
                        Ketebalan
                        <select
                          value={selected.fontWeight}
                          onChange={(e) => patchElement({ fontWeight: Number(e.target.value) })}
                        >
                          <option value={400}>Normal</option>
                          <option value={500}>Sedang</option>
                          <option value={600}>Semi bold</option>
                          <option value={650}>Tebal</option>
                          <option value={700}>Bold</option>
                        </select>
                      </label>
                    </div>
                    <label>
                      Font
                      <select
                        value={selected.fontFamily}
                        onChange={(e) => patchElement({ fontFamily: e.target.value })}
                      >
                        {['Inter Variable', 'Arial', 'Georgia', 'monospace'].map((font) => (
                          <option key={font}>{font}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Rata teks
                      <select
                        value={selected.align}
                        onChange={(e) => patchElement({ align: e.target.value as SlideElement['align'] })}
                      >
                        {['left', 'center', 'right'].map((align) => (
                          <option key={align} value={align}>
                            {align === 'left' ? 'Kiri' : align === 'center' ? 'Tengah' : 'Kanan'}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
                {selected.type === 'chart' && (
                  <>
                    <label>
                      Judul grafik
                      <textarea
                        value={selected.text}
                        onChange={(e) => patchElement({ text: e.target.value })}
                      />
                    </label>
                    <label>
                      Pertanyaan
                      <select
                        value={selected.binding?.questionId}
                        onChange={(e) =>
                          patchElement({
                            text:
                              survey.questions.find((q) => q.id === e.target.value)?.label ?? selected.text,
                            binding: {
                              kind: 'chart',
                              questionId: e.target.value,
                              chartType: selected.binding?.chartType ?? 'bar',
                            },
                            data: [],
                            missing: true,
                          })
                        }
                      >
                        {survey.questions
                          .filter((q) => q.options.length)
                          .map((q) => (
                            <option value={q.id} key={q.id}>
                              {q.label}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      Jenis grafik
                      <select
                        value={selected.binding?.chartType}
                        onChange={(e) =>
                          patchElement({
                            binding: {
                              ...selected.binding!,
                              chartType: e.target.value as 'bar' | 'pie' | 'table',
                            },
                          })
                        }
                      >
                        <option value="bar">Batang</option>
                        <option value="pie">Pie</option>
                        <option value="table">Tabel</option>
                      </select>
                    </label>
                    <small className="inspector-note">
                      Grafik mengikuti jawaban yang tersimpan. Perbarui data setelah ada respons baru.
                    </small>
                  </>
                )}
                {selected.type === 'shape' && (
                  <label>
                    Bentuk
                    <select
                      value={selected.shape}
                      onChange={(e) => patchElement({ shape: e.target.value as SlideElement['shape'] })}
                    >
                      <option value="rect">Kotak</option>
                      <option value="rounded">Kotak melengkung</option>
                      <option value="circle">Lingkaran</option>
                      <option value="line">Garis</option>
                    </select>
                  </label>
                )}
                {selected.type === 'image' && (
                  <>
                    <label>
                      Deskripsi gambar
                      <input value={selected.text} onChange={(e) => patchElement({ text: e.target.value })} />
                    </label>
                    <label>
                      Tampilan
                      <select
                        value={selected.fit}
                        onChange={(e) => patchElement({ fit: e.target.value as 'contain' | 'cover' })}
                      >
                        <option value="contain">Utuh</option>
                        <option value="cover">Penuhi kotak</option>
                      </select>
                    </label>
                  </>
                )}
                <div className="inspector-grid">
                  {(['x', 'y', 'w', 'h'] as const).map((key) => (
                    <label key={key}>
                      {{ x: 'Posisi X', y: 'Posisi Y', w: 'Lebar', h: 'Tinggi' }[key]}
                      <input
                        type="number"
                        min={key === 'w' ? 10 : key === 'h' ? 4 : 0}
                        max={key === 'y' || key === 'h' ? 720 : 1280}
                        value={Math.round(selected[key])}
                        onChange={(e) =>
                          patchElement({
                            [key]: Math.max(key === 'w' ? 10 : key === 'h' ? 4 : 0, Number(e.target.value)),
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
                <div className="inspector-grid">
                  <label>
                    Warna teks
                    <input
                      type="color"
                      value={selected.color}
                      onChange={(e) => patchElement({ color: e.target.value })}
                    />
                  </label>
                  <label>
                    Warna isi
                    <input
                      type="color"
                      value={selected.fill}
                      onChange={(e) => patchElement({ fill: e.target.value })}
                    />
                  </label>
                  <label>
                    Rotasi
                    <input
                      type="number"
                      min={-180}
                      max={180}
                      value={selected.rotation}
                      onChange={(e) =>
                        patchElement({ rotation: Math.max(-180, Math.min(180, Number(e.target.value))) })
                      }
                    />
                  </label>
                  <label>
                    Opacity
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={Math.round(selected.opacity * 100)}
                      onChange={(e) =>
                        patchElement({ opacity: Math.max(0, Math.min(1, Number(e.target.value) / 100)) })
                      }
                    />
                  </label>
                </div>
                <div className="actions">
                  <Button variant="secondary" onClick={() => moveLayer(-1)}>
                    <ArrowDown size={13} />
                    Ke belakang
                  </Button>
                  <Button variant="secondary" onClick={() => moveLayer(1)}>
                    <ArrowUp size={13} />
                    Ke depan
                  </Button>
                </div>
              </>
            ) : (
              <>
                <label>
                  Nama slide
                  <input
                    value={slide.name}
                    maxLength={150}
                    onChange={(e) => editSlide({ ...slide, name: e.target.value })}
                  />
                </label>
                <label>
                  Latar slide
                  <input
                    type="color"
                    value={slide.background}
                    onChange={(e) => editSlide({ ...slide, background: e.target.value })}
                  />
                </label>
                <label>
                  Tema dokumen
                  <select
                    value={document.theme}
                    onChange={(e) => changeTheme(e.target.value as PresentationTheme)}
                  >
                    {Object.entries(themes).map(([id, theme]) => (
                      <option key={id} value={id}>
                        {theme.name}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="inspector-note">Pilih komponen pada kanvas untuk mengubah tampilannya.</p>
              </>
            )}
            <h3 className="layers-heading">Lapisan</h3>
            <div className="canvas-layers">
              {[...slide.elements].reverse().map((item) => (
                <button
                  className={item.id === selection ? 'active' : ''}
                  key={item.id}
                  onClick={() => selectElement(item.id)}
                >
                  {item.type === 'chart' ? (
                    <BarChart3 size={14} />
                  ) : item.type === 'image' ? (
                    <ImagePlus size={14} />
                  ) : item.type === 'shape' ? (
                    <Square size={14} />
                  ) : (
                    <Type size={14} />
                  )}
                  <span>{item.text || 'Bentuk'}</span>
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>
      <FullscreenDialog open={preview} onOpenChange={setPreview} title="Pratinjau presentasi">
        <div className="slide-preview">
          <div className="slide-preview-bar">
            <strong>{document.title}</strong>
            <span>
              {previewIndex + 1} / {document.slides.length}
            </span>
            <Button variant="secondary" onClick={() => setPreview(false)}>
              <X size={15} />
              Keluar
            </Button>
          </div>
          <div className="slide-preview-content">
            <SlideThumbnail slide={document.slides[previewIndex] ?? document.slides[0]} />
          </div>
          <div className="slide-preview-nav">
            <Button
              variant="secondary"
              disabled={previewIndex === 0}
              onClick={() => setPreviewIndex((i) => i - 1)}
            >
              Sebelumnya
            </Button>
            <Button
              disabled={previewIndex >= document.slides.length - 1}
              onClick={() => setPreviewIndex((i) => i + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      </FullscreenDialog>
      <Modal
        open={exportOpen}
        onOpenChange={(open) => {
          if (!exporting) setExportOpen(open);
        }}
        title="Ekspor presentasi"
        description="Semua slide diekspor sesuai tampilan kanvas."
      >
        <p className="template-safe-note">
          PDF dan PowerPoint mempertahankan tata letak sebagai gambar berkualitas tinggi. Komponen dalam file
          PowerPoint tidak dapat diedit satu per satu. Edit sumbernya di Studio.
        </p>
        <div className="actions" style={{ marginTop: 24 }}>
          <Button disabled={exporting} onClick={() => void exportFile('pdf')}>
            {exporting ? 'Menyiapkan…' : 'Unduh PDF'}
          </Button>
          <Button variant="secondary" disabled={exporting} onClick={() => void exportFile('pptx')}>
            Unduh PowerPoint
          </Button>
        </div>
      </Modal>
      <Modal
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        title="Simpan sebagai template slide"
        description="Simpan desain dan hubungan pertanyaan untuk digunakan kembali."
      >
        <form onSubmit={saveTemplate}>
          <label className="field">
            Nama template
            <input
              minLength={3}
              maxLength={200}
              required
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
          </label>
          <p className="template-safe-note">
            Angka dan jawaban tidak disalin. Teks manual dan gambar tetap menjadi bagian template; periksa
            informasi pribadi sebelum menyimpan.
          </p>
          <Button type="submit" disabled={templatePending || saving}>
            {templatePending ? 'Menyimpan…' : 'Simpan template'}
          </Button>
        </form>
      </Modal>
      <Modal
        open={imageOpen}
        onOpenChange={setImageOpen}
        title="Gambar workspace"
        description="PNG, JPG, atau WebP. Maksimal 2,5 MB per gambar."
      >
        <label className="image-upload">
          {imagePending ? 'Mengunggah…' : 'Unggah gambar'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={imagePending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadImage(file);
              e.target.value = '';
            }}
          />
        </label>
        <div className="asset-grid">
          {assets.map((asset) => (
            <button key={asset.id} onClick={() => insertImage(asset)}>
              <img src={`/api/assets/${asset.id}`} alt={asset.name} />
              <span>{asset.name}</span>
            </button>
          ))}
        </div>
        {!assets.length && (
          <p className="template-safe-note">Belum ada gambar. Unggah untuk menambahkannya ke slide.</p>
        )}
      </Modal>
      {sharing && (
        <ShareDialog id={document.id} version={document.version} onClose={() => setSharing(false)} />
      )}
      <div className="slide-export-stage" aria-hidden="true">
        {document.slides.map((item) => (
          <SlideRenderer
            key={item.id}
            slide={item}
            nodeRef={(node) => {
              if (node) exportNodes.current.set(item.id, node);
              else exportNodes.current.delete(item.id);
            }}
          />
        ))}
      </div>
    </div>
  );
}
