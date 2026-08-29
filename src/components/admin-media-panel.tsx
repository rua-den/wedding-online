"use client";

import { useCallback, useState } from "react";

import type { MediaAsset, MediaSlot } from "@/lib/media-store";
import { InvitationPreviewDialog } from "./invitation-preview-dialog";
import { MediaCropEditor, type MediaCropValues } from "./media-crop-editor";
import { MediaFrame } from "./media-frame";

type PreviewVariant = "hero" | "portrait" | "story" | "venue" | "gallery";
type MediaRequest = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type MediaResponse = { asset?: MediaAsset; message?: string; ok?: boolean };

const publicPreviews: Record<PreviewVariant, { label: string }> = {
  hero: { label: "Trang bìa" },
  portrait: { label: "Cô dâu & chú rể" },
  story: { label: "Hành trình yêu thương" },
  venue: { label: "Lễ thành hôn" },
  gallery: { label: "Những khoảnh khắc" },
};

const singletonSlots: Array<{ slot: Exclude<MediaSlot, "gallery">; label: string }> = [
  { slot: "hero", label: "Ảnh cover" },
  { slot: "groom", label: "Chân dung chú rể" },
  { slot: "bride", label: "Chân dung cô dâu" },
  { slot: "story", label: "Ảnh chuyện tình" },
  { slot: "venue", label: "Ảnh địa điểm / bản đồ" },
];

function previewVariant(slot: MediaSlot): PreviewVariant {
  if (slot === "groom" || slot === "bride") return "portrait";
  return slot;
}

async function responseBody(response: Response) {
  return await response.json().catch(() => null) as MediaResponse | null;
}

export function AdminMediaPanel({ initialAssets, request = fetch }: { initialAssets: MediaAsset[]; request?: MediaRequest }) {
  const [assets, setAssets] = useState(initialAssets);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [cropAsset, setCropAsset] = useState<MediaAsset | null>(null);
  const [cropRestoreTarget, setCropRestoreTarget] = useState<HTMLButtonElement | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const closeCrop = useCallback(() => {
    setCropAsset(null);
    setCropRestoreTarget(null);
  }, []);
  const closePreview = useCallback(() => setPreviewOpen(false), []);
  const openCrop = useCallback((asset: MediaAsset, trigger: HTMLButtonElement) => {
    setCropRestoreTarget(trigger);
    setCropAsset(asset);
  }, []);

  const assetFor = (slot: MediaSlot) => assets.find((asset) => asset.slot === slot && asset.active);
  const inactiveAssetsFor = (slot: Exclude<MediaSlot, "gallery">) => assets
    .filter((asset) => asset.slot === slot && !asset.active)
    .sort((a, b) => b.id - a.id);
  const gallery = assets.filter((asset) => asset.slot === "gallery" && asset.active).sort((a, b) => a.sortOrder - b.sortOrder);

  function markPersisted() {
    setRefreshKey((current) => current + 1);
  }

  async function upload(slot: MediaSlot, file: File) {
    setBusy(true);
    setStatus("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("slot", slot);
      form.set("alt", file.name.replace(/\.[^.]+$/, ""));
      const response = await request("/api/admin/media", { method: "POST", body: form });
      const body = await responseBody(response);
      if (!response.ok || !body?.asset) {
        setStatus(body?.message ?? "Không thể tải ảnh lên.");
        return;
      }
      const uploaded = body.asset;
      setAssets((current) => [
        uploaded,
        ...current
          .filter((asset) => asset.id !== uploaded.id)
          .map((asset) => asset.slot === slot && slot !== "gallery" && asset.active ? { ...asset, active: false } : asset),
      ]);
      markPersisted();
      setStatus("Đã tải ảnh lên.");
    } catch {
      setStatus("Không thể kết nối để tải ảnh.");
    } finally {
      setBusy(false);
    }
  }

  async function activate(asset: MediaAsset) {
    setBusy(true);
    setStatus("");
    try {
      const response = await request("/api/admin/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: asset.id, active: true }),
      });
      const body = await responseBody(response);
      if (!response.ok || !body?.asset) {
        setStatus(body?.message ?? "Không thể kích hoạt ảnh.");
        return;
      }
      const activated = body.asset;
      setAssets((current) => current.map((item) => {
        if (item.id === activated.id) return activated;
        if (item.slot === activated.slot && activated.slot !== "gallery" && item.active) return { ...item, active: false };
        return item;
      }));
      markPersisted();
      setStatus("Đã kích hoạt ảnh.");
    } catch {
      setStatus("Không thể kết nối để kích hoạt ảnh.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(asset: MediaAsset) {
    setBusy(true);
    setStatus("");
    try {
      const response = await request("/api/admin/media", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: asset.id }) });
      const body = await responseBody(response);
      if (!response.ok) {
        setStatus(body?.message ?? "Không thể xóa ảnh.");
        return;
      }
      setAssets((current) => current.filter((item) => item.id !== asset.id));
      if (cropAsset?.id === asset.id) setCropAsset(null);
      markPersisted();
      setStatus("Đã xóa ảnh.");
    } catch {
      setStatus("Không thể kết nối để xóa ảnh.");
    } finally {
      setBusy(false);
    }
  }

  async function reorder(from: number, to: number) {
    if (from === to || busy) return;
    const previous = assets;
    const next = [...gallery];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setAssets((current) => [...current.filter((asset) => asset.slot !== "gallery"), ...next.map((asset, index) => ({ ...asset, sortOrder: index }))]);
    setBusy(true);
    setStatus("");
    try {
      const response = await request("/api/admin/media/order", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: next.map((asset) => asset.id) }) });
      const body = await responseBody(response);
      if (!response.ok) {
        setAssets(previous);
        setStatus(body?.message ?? "Không thể sắp xếp ảnh.");
        return;
      }
      markPersisted();
      setStatus("Đã cập nhật thứ tự ảnh.");
    } catch {
      setAssets(previous);
      setStatus("Không thể kết nối để sắp xếp ảnh.");
    } finally {
      setBusy(false);
    }
  }

  async function saveCrop(values: MediaCropValues) {
    if (!cropAsset) return;
    const editingAsset = cropAsset;
    setBusy(true);
    setStatus("");
    try {
      const response = await request("/api/admin/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingAsset.id, ...values }),
      });
      const body = await responseBody(response);
      if (!response.ok || !body?.asset) {
        setStatus(body?.message ?? "Không thể lưu căn chỉnh.");
        return;
      }
      setAssets((current) => current.map((asset) => asset.id === body.asset!.id ? body.asset! : asset));
      setCropAsset(null);
      markPersisted();
      setStatus("Đã lưu căn chỉnh.");
    } catch {
      setStatus("Không thể kết nối để lưu căn chỉnh.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="admin-panel admin-media-panel" aria-labelledby="media-title">
        <div className="admin-panel-heading">
          <div><p className="eyebrow">Hình ảnh</p><h2 id="media-title">Ảnh trên thiệp</h2></div>
          <div className="admin-actions admin-media-heading-actions">
            <button className="admin-secondary-button" type="button" onClick={() => setPreviewOpen(true)}>Xem trước toàn bộ thiệp</button>
            <span className="admin-media-count">{gallery.length} ảnh gallery</span>
          </div>
        </div>

        <div className="admin-media-slots">
          {singletonSlots.map(({ slot, label }) => {
            const asset = assetFor(slot);
            const inactiveAssets = inactiveAssetsFor(slot);
            const variant = previewVariant(slot);
            const publicLabel = publicPreviews[variant].label;
            return (
              <article className="admin-media-slot" key={slot}>
                <div className="admin-media-slot-head">
                  <h3>{label}</h3>
                  <label className="admin-secondary-button">{asset ? "Thay ảnh" : "Tải ảnh"}<input hidden type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(slot, file); event.currentTarget.value = ""; }} /></label>
                </div>
                {asset ? (
                  <div className={`admin-media-preview admin-media-preview-${variant}`}>
                    <div className="admin-media-preview-content">
                      {variant === "hero" ? <div className="admin-media-hero-previews">
                        <div className="admin-media-hero-preview"><MediaFrame asset={asset} className="admin-media-frame media-frame-slot-hero media-frame-hero-mobile" alt={asset.alt || label} loading="lazy" /><p className="admin-media-preview-label">{publicLabel} · Mobile</p></div>
                        <div className="admin-media-hero-preview"><MediaFrame asset={asset} className="admin-media-frame media-frame-slot-hero media-frame-hero-desktop" alt={asset.alt || label} loading="lazy" /><p className="admin-media-preview-label">{publicLabel} · Desktop</p></div>
                      </div> : <><MediaFrame asset={asset} className={`admin-media-frame media-frame-slot-${variant} admin-media-frame-${variant}`} alt={asset.alt || label} loading="lazy" /><p className="admin-media-preview-label">{publicLabel}</p></>}
                    </div>
                    <div className="admin-actions">
                      <button className="admin-text-button" type="button" disabled={busy} onClick={(event) => openCrop(asset, event.currentTarget)}>Căn khung</button>
                      <button className="admin-text-button" type="button" disabled={busy} onClick={() => void remove(asset)}>Xóa</button>
                    </div>
                  </div>
                ) : <p className="admin-media-empty">Chưa có ảnh — đang dùng placeholder.</p>}
                {inactiveAssets.length > 0 ? <div className="admin-media-history" aria-label={`Ảnh đã thay của ${label}`}>
                  <p className="admin-media-history-title">Ảnh đã thay</p>
                  {inactiveAssets.map((inactive) => <div className="admin-media-history-item" key={inactive.id}>
                    <MediaFrame asset={inactive} className={`admin-media-history-frame media-frame-slot-${variant}`} alt={inactive.alt || `${label} cũ`} loading="lazy" />
                    <div className="admin-media-history-details">
                      <span className="admin-media-history-name">{inactive.alt || `${label} cũ`}</span>
                      <span className="admin-badge is-inactive">Đang lưu</span>
                      <div className="admin-actions">
                        <button className="admin-text-button" type="button" disabled={busy} onClick={() => void activate(inactive)} aria-label={`Kích hoạt ${inactive.alt || label}`}>Kích hoạt</button>
                        <button className="admin-text-button" type="button" disabled={busy} onClick={() => void remove(inactive)} aria-label={`Xóa ${inactive.alt || label}`}>Xóa</button>
                      </div>
                    </div>
                  </div>)}
                </div> : null}
              </article>
            );
          })}
        </div>

        <div className="admin-media-gallery-head"><h3>Gallery</h3><label className="admin-primary-button">+ Thêm ảnh<input hidden multiple type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" disabled={busy} onChange={(event) => { Array.from(event.target.files ?? []).forEach((file) => void upload("gallery", file)); event.currentTarget.value = ""; }} /></label></div>
        <div className="admin-media-gallery">
          {gallery.map((asset, index) => <article className="admin-media-thumb" key={asset.id} draggable onDragStart={() => setDragIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragIndex !== null) void reorder(dragIndex, index); setDragIndex(null); }}>
            <MediaFrame asset={asset} className="admin-media-frame media-frame-slot-gallery admin-media-frame-gallery" alt={asset.alt || `Ảnh ${index + 1}`} loading="lazy" />
            <span>{String(index + 1).padStart(2, "0")}</span>
            <p className="admin-media-preview-label">{publicPreviews.gallery.label}</p>
            <div className="admin-actions"><button className="admin-text-button" type="button" disabled={busy} onClick={(event) => openCrop(asset, event.currentTarget)}>Căn khung</button><button className="admin-text-button" type="button" disabled={busy} onClick={() => void remove(asset)}>Xóa</button></div>
            <div className="admin-media-reorder-actions" aria-label={`Sắp xếp ${asset.alt || `ảnh ${index + 1}`}`}>
              <button className="admin-text-button" type="button" disabled={busy || index === 0} onClick={() => void reorder(index, index - 1)} aria-label={`Đưa ${asset.alt || `ảnh ${index + 1}`} lên trước`}>Đưa lên trước</button>
              <button className="admin-text-button" type="button" disabled={busy || index === gallery.length - 1} onClick={() => void reorder(index, index + 1)} aria-label={`Đưa ${asset.alt || `ảnh ${index + 1}`} ra sau`}>Đưa ra sau</button>
            </div>
          </article>)}
        </div>
        <p className="form-status admin-status" aria-live="polite">{status}</p>
      </section>

      {cropAsset ? <MediaCropEditor asset={cropAsset} onSave={saveCrop} onClose={closeCrop} restoreFocusTarget={cropRestoreTarget} /> : null}
      <InvitationPreviewDialog open={previewOpen} suspended={cropAsset !== null} onClose={closePreview} refreshKey={refreshKey} />
    </>
  );
}
