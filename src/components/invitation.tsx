import { defaultInvitationContent } from "@/config/invitation-content";
import { formatWeddingHeroDate } from "@/lib/wedding-date";
import type { PublicMediaAsset } from "@/lib/media-store";
import type { InvitationContent } from "@/types/invitation-content";
import { Countdown } from "./countdown";
import { FloralMark } from "./floral-mark";
import { Gallery } from "./gallery";
import { InvitationFooter } from "./invitation-footer";
import { MediaFrame } from "./media-frame";
import { OpenInvitationButton } from "./open-invitation-button";
import { SectionJumpButton } from "./section-jump-button";

export function Invitation({
  media = [],
  content,
  nextAfterGalleryTargetId = "loi-cam-on",
  showFooter = true,
}: {
  media?: PublicMediaAsset[];
  content?: InvitationContent;
  nextAfterGalleryTargetId?: string;
  showFooter?: boolean;
}) {
  const copy = content ?? defaultInvitationContent();
  const { couple, cover, event } = copy;
  const heroDate = formatWeddingHeroDate(event.dateTime);
  const hero = media.find((asset) => asset.slot === "hero" && asset.active);
  const groom = media.find((asset) => asset.slot === "groom" && asset.active);
  const bride = media.find((asset) => asset.slot === "bride" && asset.active);
  const storyImage = media.find((asset) => asset.slot === "story" && asset.active);
  const venue = media.find((asset) => asset.slot === "venue" && asset.active);
  const gallery = media.filter((asset) => asset.slot === "gallery" && asset.active).sort((a, b) => a.sortOrder - b.sortOrder);

  return <main>
    <section id="thiep-cuoi" className={`hero section-shell${hero ? " has-hero-media" : ""}`} aria-labelledby="invitation-title">
      {hero ? <MediaFrame asset={hero} className="hero-media media-frame-slot-hero" alt={hero.alt || `Ảnh cưới của ${couple.shortGroomName} và ${couple.shortBrideName}`} loading="eager" /> : null}
      <div className="hero-frame"><div className="hero-ornament hero-ornament-left" aria-hidden="true" /><div className="hero-ornament hero-ornament-right" aria-hidden="true" /><p className="eyebrow">{cover.eyebrow}</p><FloralMark /><h1 id="invitation-title"><span>{couple.shortGroomName}</span><em>&amp;</em><span>{couple.shortBrideName}</span></h1><p className="hero-message">{cover.message}</p><div className="hero-date"><span>{heroDate.day}</span><div><b>{heroDate.month}</b><small>{heroDate.year}</small></div></div><OpenInvitationButton label={cover.scrollCue} targetId="ngay-chung-doi" /></div>
    </section>

    <section className="countdown-section section-shell" id="ngay-chung-doi" aria-labelledby="countdown-title"><p className="eyebrow">{copy.countdown.eyebrow}</p><h2 id="countdown-title">{copy.countdown.title}</h2><p className="section-copy">{event.dateLabel} · {event.timeLabel}</p><Countdown eventTime={event.dateTime} /><SectionJumpButton targetId="doi-uyen-uong" label="phần cô dâu chú rể" /></section>

    <section className="couple-section section-shell" id="doi-uyen-uong" aria-labelledby="couple-title"><div className="section-heading"><p className="eyebrow">{copy.coupleSection.eyebrow}</p><h2 id="couple-title">{copy.coupleSection.title}</h2></div><div className="couple-grid"><article className="person-card">{groom ? <MediaFrame asset={groom} className="portrait portrait-groom media-frame-slot-portrait" alt={groom.alt || couple.groom} loading="lazy" /> : <div className="portrait portrait-groom"><span aria-hidden="true">{couple.shortGroomName.charAt(0)}</span></div>}<p className="person-role">{copy.coupleSection.groomRole}</p><h3>{couple.groom}</h3><p>{couple.groomBio}</p></article><div className="heart-connector" aria-hidden="true">♡</div><article className="person-card">{bride ? <MediaFrame asset={bride} className="portrait portrait-bride media-frame-slot-portrait" alt={bride.alt || couple.bride} loading="lazy" /> : <div className="portrait portrait-bride"><span aria-hidden="true">{couple.shortBrideName.charAt(0)}</span></div>}<p className="person-role">{copy.coupleSection.brideRole}</p><h3>{couple.bride}</h3><p>{couple.brideBio}</p></article></div><SectionJumpButton targetId="chuyen-tinh" label="chuyện tình" /></section>

    <section className="story-section section-shell" id="chuyen-tinh" aria-labelledby="story-title"><div className="section-heading"><p className="eyebrow">{copy.story.eyebrow}</p><h2 id="story-title">{copy.story.title}</h2></div><div className={`story-layout${storyImage ? " has-image" : ""}`}>{storyImage ? <MediaFrame asset={storyImage} className="story-image media-frame-slot-story" alt={storyImage.alt || `Khoảnh khắc của ${couple.shortGroomName} và ${couple.shortBrideName}`} loading="lazy" /> : null}<ol className="timeline">{copy.story.milestones.map((milestone, index) => <li key={`${milestone.title}-${index}`}><div className="timeline-marker" aria-hidden="true" />{milestone.imageSrc ? <MediaFrame asset={{ slot: "story", src: milestone.imageSrc, alt: milestone.title, sortOrder: index, active: true, focusX: milestone.imageFocusX, focusY: milestone.imageFocusY, zoom: milestone.imageZoom }} className="timeline-image" alt={`Ảnh mốc ${milestone.title}`} loading="lazy" /> : null}<p className="timeline-date">{milestone.date}</p><h3>{milestone.title}</h3><p>{milestone.description}</p></li>)}</ol></div><SectionJumpButton targetId="le-cuoi" label="thông tin lễ cưới" /></section>

    <section className="event-section section-shell" id="le-cuoi" aria-labelledby="event-title"><div className={`event-card${venue ? " has-venue-image" : ""}`}>{venue ? <MediaFrame asset={venue} className="venue-image media-frame-slot-venue" alt={venue.alt || event.venue} loading="lazy" /> : null}<div className="event-copy"><p className="eyebrow">{event.eyebrow}</p><h2 id="event-title">{event.title}</h2><FloralMark /><dl className="event-details"><div><dt>{event.timeHeading}</dt><dd>{event.timeLabel}</dd><dd>{event.dateLabel}</dd></div><div><dt>{event.venueHeading}</dt><dd>{event.venue}</dd><dd>{event.address}</dd></div></dl><a className="map-link" href={event.mapsUrl} target="_blank" rel="noreferrer">{event.directionsLabel} <span aria-hidden="true">↗</span></a></div></div><SectionJumpButton targetId="album-anh" label="album ảnh cưới" /></section>

    <section className="gallery-section section-shell" id="album-anh" aria-labelledby="gallery-title"><div className="section-heading"><p className="eyebrow">{copy.gallery.eyebrow}</p><h2 id="gallery-title">{copy.gallery.title}</h2></div><Gallery assets={gallery} /><SectionJumpButton targetId={nextAfterGalleryTargetId} label={showFooter ? "lời cảm ơn" : "xác nhận tham dự"} /></section>
    {showFooter ? <InvitationFooter title={copy.footer.title} message={copy.footer.message} /> : null}
  </main>;
}
