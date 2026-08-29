import { wedding } from "@/config/wedding";
import { formatWeddingHeroDate } from "@/lib/wedding-date";
import { Countdown } from "./countdown";
import { FloralMark } from "./floral-mark";
import { Gallery } from "./gallery";
import { MediaFrame } from "./media-frame";
import type { PublicMediaAsset } from "@/lib/media-store";
import type { SiteSettings } from "@/lib/site-settings";

export function Invitation({ media = [], settings }: { media?: PublicMediaAsset[]; settings?: SiteSettings }) {
  const { couple, cover, story } = wedding;
  const event = settings ? { ...wedding.event, ...settings } : wedding.event;
  const heroDate = formatWeddingHeroDate(event.dateTime);
  const hero = media.find((asset) => asset.slot === "hero" && asset.active);
  const groom = media.find((asset) => asset.slot === "groom" && asset.active);
  const bride = media.find((asset) => asset.slot === "bride" && asset.active);
  const storyImage = media.find((asset) => asset.slot === "story" && asset.active);
  const venue = media.find((asset) => asset.slot === "venue" && asset.active);
  const gallery = media.filter((asset) => asset.slot === "gallery" && asset.active).sort((a, b) => a.sortOrder - b.sortOrder);
  return <main>
    <section className={`hero section-shell${hero ? " has-hero-media" : ""}`} aria-labelledby="invitation-title">
      {hero ? <MediaFrame asset={hero} className="hero-media media-frame-slot-hero" alt={hero.alt || "Ảnh cưới của Huy và Nhi"} loading="eager" /> : null}
      <div className="hero-frame">
      <div className="hero-ornament hero-ornament-left" aria-hidden="true" /><div className="hero-ornament hero-ornament-right" aria-hidden="true" />
      <p className="eyebrow">{cover.eyebrow}</p><FloralMark />
      <h1 id="invitation-title"><span>{couple.shortGroomName}</span><em>&amp;</em><span>{couple.shortBrideName}</span></h1>
      <p className="hero-message">{cover.message}</p><div className="hero-date"><span>{heroDate.day}</span><div><b>{heroDate.month}</b><small>{heroDate.year}</small></div></div>
      <a className="scroll-cue" href="#ngay-chung-doi">Khám phá thiệp mời <span aria-hidden="true">↓</span></a>
      </div>
    </section>

    <section className="countdown-section section-shell" id="ngay-chung-doi" aria-labelledby="countdown-title">
      <p className="eyebrow">Save the date</p><h2 id="countdown-title">Ngày chung đôi đang đến gần</h2><p className="section-copy">{event.dateLabel} · {event.timeLabel}</p><Countdown eventTime={event.dateTime} />
    </section>

    <section className="couple-section section-shell" aria-labelledby="couple-title"><div className="section-heading"><p className="eyebrow">Cô dâu &amp; chú rể</p><h2 id="couple-title">Một tình yêu, một mái nhà</h2></div>
      <div className="couple-grid">
        <article className="person-card">{groom ? <MediaFrame asset={groom} className="portrait portrait-groom media-frame-slot-portrait" alt={groom.alt || couple.groom} loading="lazy" /> : <div className="portrait portrait-groom"><span aria-hidden="true">H</span></div>}<p className="person-role">Chú rể</p><h3>{couple.groom}</h3><p>Một người luôn tin rằng những điều đẹp nhất được tạo nên từ sự chân thành.</p></article>
        <div className="heart-connector" aria-hidden="true">♡</div>
        <article className="person-card">{bride ? <MediaFrame asset={bride} className="portrait portrait-bride media-frame-slot-portrait" alt={bride.alt || couple.bride} loading="lazy" /> : <div className="portrait portrait-bride"><span aria-hidden="true">N</span></div>}<p className="person-role">Cô dâu</p><h3>{couple.bride}</h3><p>Một người mang theo nụ cười ấm áp, làm mỗi ngày thường cũng trở nên đặc biệt.</p></article>
      </div>
    </section>

    <section className="story-section section-shell" aria-labelledby="story-title"><div className="section-heading"><p className="eyebrow">Hành trình yêu thương</p><h2 id="story-title">Chuyện của chúng mình</h2></div>
      <div className={`story-layout${storyImage ? " has-image" : ""}`}>{storyImage ? <MediaFrame asset={storyImage} className="story-image media-frame-slot-story" alt={storyImage.alt || "Khoảnh khắc của Huy và Nhi"} loading="lazy" /> : null}<ol className="timeline">{story.map((milestone) => <li key={milestone.title}><div className="timeline-marker" aria-hidden="true" /><p className="timeline-date">{milestone.date}</p><h3>{milestone.title}</h3><p>{milestone.description}</p></li>)}</ol></div>
    </section>

    <section className="event-section section-shell" aria-labelledby="event-title"><div className={`event-card${venue ? " has-venue-image" : ""}`}>{venue ? <MediaFrame asset={venue} className="venue-image media-frame-slot-venue" alt={venue.alt || event.venue} loading="lazy" /> : null}<div className="event-copy"><p className="eyebrow">Lễ thành hôn</p><h2 id="event-title">Hẹn gặp bạn trong ngày vui của chúng mình</h2><FloralMark />
      <dl className="event-details"><div><dt>Thời gian</dt><dd>{event.timeLabel}</dd><dd>{event.dateLabel}</dd></div><div><dt>Địa điểm</dt><dd>{event.venue}</dd><dd>{event.address}</dd></div></dl>
      <a className="map-link" href={event.mapsUrl} target="_blank" rel="noreferrer">Xem chỉ đường <span aria-hidden="true">↗</span></a></div></div></section>
    <section className="gallery-section section-shell" aria-labelledby="gallery-title"><div className="section-heading"><p className="eyebrow">Những khoảnh khắc</p><h2 id="gallery-title">Ngày vui của chúng mình</h2></div><Gallery assets={gallery} /></section>
    <footer className="site-footer section-shell"><FloralMark /><p>Huy &amp; Nhi</p><small>Rất hân hạnh được đón tiếp bạn.</small></footer>
  </main>;
}
