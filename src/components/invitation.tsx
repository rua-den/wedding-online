import { defaultInvitationContent } from "@/config/invitation-content";
import { scaledTextStyle, textScale } from "@/lib/invitation-typography";
import { formatWeddingHeroDate } from "@/lib/wedding-date";
import type { PublicMediaAsset } from "@/lib/media-store";
import type { InvitationContent, LoveStoryMilestoneContent } from "@/types/invitation-content";
import { Countdown } from "./countdown";
import { FloralMark } from "./floral-mark";
import { Gallery } from "./gallery";
import { InvitationFooter } from "./invitation-footer";
import { MediaFrame } from "./media-frame";
import { OpenInvitationButton } from "./open-invitation-button";
import { SectionJumpButton } from "./section-jump-button";
import { VinylRecord } from "./vinyl-record";

function milestoneAsset(milestone: LoveStoryMilestoneContent, index: number): PublicMediaAsset {
  return {
    slot: "story",
    src: milestone.imageSrc ?? "",
    alt: milestone.title,
    sortOrder: index,
    active: true,
    focusX: milestone.imageFocusX,
    focusY: milestone.imageFocusY,
    zoom: milestone.imageZoom,
  };
}

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
  const styleFor = (key: string) => scaledTextStyle(textScale(copy.fontScales, key));
  const heroDate = formatWeddingHeroDate(event.dateTime);
  const hero = media.find((asset) => asset.slot === "hero" && asset.active);
  const groom = media.find((asset) => asset.slot === "groom" && asset.active);
  const bride = media.find((asset) => asset.slot === "bride" && asset.active);
  const storyImage = media.find((asset) => asset.slot === "story" && asset.active);
  const venue = media.find((asset) => asset.slot === "venue" && asset.active);
  const gallery = media.filter((asset) => asset.slot === "gallery" && asset.active).sort((a, b) => a.sortOrder - b.sortOrder);
  const firstMilestone = copy.story.milestones[0];
  const firstMilestoneIsLead = !storyImage && Boolean(firstMilestone?.imageSrc) && firstMilestone?.imagePosition === "center";

  return <main>
    <section id="thiep-cuoi" className={`hero section-shell${hero ? " has-hero-media" : ""}`} aria-labelledby="invitation-title">
      {hero ? <MediaFrame asset={hero} className="hero-media media-frame-slot-hero" alt={hero.alt || `Ảnh cưới của ${couple.shortGroomName} và ${couple.shortBrideName}`} loading="eager" /> : null}
      <div className="hero-frame"><div className="hero-ornament hero-ornament-left" aria-hidden="true" /><div className="hero-ornament hero-ornament-right" aria-hidden="true" /><p className="eyebrow"><span style={styleFor("cover.eyebrow")}>{cover.eyebrow}</span></p><FloralMark /><h1 id="invitation-title"><span style={styleFor("couple.shortGroomName")}>{couple.shortGroomName}</span><em>&amp;</em><span style={styleFor("couple.shortBrideName")}>{couple.shortBrideName}</span></h1><p className="hero-message"><span style={styleFor("cover.message")}>{cover.message}</span></p><div className="hero-date"><span>{heroDate.day}</span><div><b>{heroDate.month}</b><small>{heroDate.year}</small></div></div><OpenInvitationButton label={cover.scrollCue} targetId="ngay-chung-doi" fontScale={textScale(copy.fontScales, "cover.scrollCue")} /></div>
    </section>

    <section className="countdown-section section-shell" id="ngay-chung-doi" aria-labelledby="countdown-title">
      <p className="eyebrow"><span style={styleFor("countdown.eyebrow")}>{copy.countdown.eyebrow}</span></p>
      <h2 id="countdown-title"><span style={styleFor("countdown.title")}>{copy.countdown.title}</span></h2>
      <VinylRecord groom={couple.shortGroomName} bride={couple.shortBrideName} groomScale={textScale(copy.fontScales, "couple.shortGroomName")} brideScale={textScale(copy.fontScales, "couple.shortBrideName")} />
      <p className="section-copy"><span style={styleFor("event.dateLabel")}>{event.dateLabel}</span> · <span style={styleFor("event.timeLabel")}>{event.timeLabel}</span></p>
      <Countdown eventTime={event.dateTime} />
      <SectionJumpButton targetId="doi-uyen-uong" label="phần cô dâu chú rể" />
    </section>

    <section className="couple-section section-shell" id="doi-uyen-uong" aria-labelledby="couple-title"><div className="section-heading"><p className="eyebrow"><span style={styleFor("coupleSection.eyebrow")}>{copy.coupleSection.eyebrow}</span></p><h2 id="couple-title"><span style={styleFor("coupleSection.title")}>{copy.coupleSection.title}</span></h2></div><div className="couple-grid"><article className="person-card">{groom ? <MediaFrame asset={groom} className="portrait portrait-groom media-frame-slot-portrait" alt={groom.alt || couple.groom} loading="lazy" /> : <div className="portrait portrait-groom"><span aria-hidden="true">{couple.shortGroomName.charAt(0)}</span></div>}<p className="person-role"><span style={styleFor("coupleSection.groomRole")}>{copy.coupleSection.groomRole}</span></p><h3><span style={styleFor("couple.groom")}>{couple.groom}</span></h3><p><span style={styleFor("couple.groomBio")}>{couple.groomBio}</span></p></article><div className="heart-connector" aria-hidden="true">♡</div><article className="person-card">{bride ? <MediaFrame asset={bride} className="portrait portrait-bride media-frame-slot-portrait" alt={bride.alt || couple.bride} loading="lazy" /> : <div className="portrait portrait-bride"><span aria-hidden="true">{couple.shortBrideName.charAt(0)}</span></div>}<p className="person-role"><span style={styleFor("coupleSection.brideRole")}>{copy.coupleSection.brideRole}</span></p><h3><span style={styleFor("couple.bride")}>{couple.bride}</span></h3><p><span style={styleFor("couple.brideBio")}>{couple.brideBio}</span></p></article></div><SectionJumpButton targetId="chuyen-tinh" label="chuyện tình" /></section>

    <section className="story-section section-shell" id="chuyen-tinh" aria-labelledby="story-title">
      <div className="section-heading"><p className="eyebrow"><span style={styleFor("story.eyebrow")}>{copy.story.eyebrow}</span></p><h2 id="story-title"><span style={styleFor("story.title")}>{copy.story.title}</span></h2></div>
      {storyImage ? <MediaFrame asset={storyImage} className="story-lead-image media-frame-slot-story" alt={storyImage.alt || `Khoảnh khắc của ${couple.shortGroomName} và ${couple.shortBrideName}`} loading="lazy" /> : firstMilestoneIsLead && firstMilestone?.imageSrc ? <MediaFrame asset={milestoneAsset(firstMilestone, 0)} className="story-lead-image" alt={`Ảnh mốc ${firstMilestone.title}`} loading="lazy" /> : null}
      <ol className="timeline">
        {copy.story.milestones.map((milestone, index) => {
          const renderImageInTimeline = Boolean(milestone.imageSrc) && !(firstMilestoneIsLead && index === 0);
          return <li className={`timeline-item timeline-item-${milestone.imagePosition}`} key={`${milestone.title}-${index}`}>
            <div className="timeline-marker" aria-hidden="true" />
            <div className="timeline-entry">
              {renderImageInTimeline && milestone.imageSrc ? <MediaFrame asset={milestoneAsset(milestone, index)} className="timeline-image" alt={`Ảnh mốc ${milestone.title}`} loading="lazy" /> : null}
              <div className="timeline-copy"><p className="timeline-date"><span style={scaledTextStyle(milestone.dateFontScale)}>{milestone.date}</span></p><h3><span style={scaledTextStyle(milestone.titleFontScale)}>{milestone.title}</span></h3><p><span style={scaledTextStyle(milestone.descriptionFontScale)}>{milestone.description}</span></p></div>
            </div>
          </li>;
        })}
      </ol>
      <SectionJumpButton targetId="le-cuoi" label="thông tin lễ cưới" />
    </section>

    <section className="event-section section-shell" id="le-cuoi" aria-labelledby="event-title"><div className={`event-card${venue ? " has-venue-image" : ""}`}>{venue ? <MediaFrame asset={venue} className="venue-image media-frame-slot-venue" alt={venue.alt || event.venue} loading="lazy" /> : null}<div className="event-copy"><p className="eyebrow"><span style={styleFor("event.eyebrow")}>{event.eyebrow}</span></p><h2 id="event-title"><span style={styleFor("event.title")}>{event.title}</span></h2><FloralMark /><dl className="event-details"><div><dt><span style={styleFor("event.timeHeading")}>{event.timeHeading}</span></dt><dd><span style={styleFor("event.timeLabel")}>{event.timeLabel}</span></dd><dd><span style={styleFor("event.dateLabel")}>{event.dateLabel}</span></dd></div><div><dt><span style={styleFor("event.venueHeading")}>{event.venueHeading}</span></dt><dd><span style={styleFor("event.venue")}>{event.venue}</span></dd><dd><span style={styleFor("event.address")}>{event.address}</span></dd></div></dl><a className="map-link" href={event.mapsUrl} target="_blank" rel="noreferrer"><span style={styleFor("event.directionsLabel")}>{event.directionsLabel}</span> <span aria-hidden="true">↗</span></a></div></div><SectionJumpButton targetId="album-anh" label="album ảnh cưới" /></section>

    <section className="gallery-section section-shell" id="album-anh" aria-labelledby="gallery-title"><div className="section-heading"><p className="eyebrow"><span style={styleFor("gallery.eyebrow")}>{copy.gallery.eyebrow}</span></p><h2 id="gallery-title"><span style={styleFor("gallery.title")}>{copy.gallery.title}</span></h2></div><Gallery assets={gallery} /><SectionJumpButton targetId={nextAfterGalleryTargetId} label={showFooter ? "lời cảm ơn" : "xác nhận tham dự"} /></section>
    {showFooter ? <InvitationFooter title={copy.footer.title} message={copy.footer.message} titleScale={textScale(copy.fontScales, "footer.title")} messageScale={textScale(copy.fontScales, "footer.message")} /> : null}
  </main>;
}
