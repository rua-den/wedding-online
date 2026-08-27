import { wedding } from "@/config/wedding";
import { formatWeddingHeroDate } from "@/lib/wedding-date";
import { Countdown } from "./countdown";
import { FloralMark } from "./floral-mark";

export function Invitation() {
  const { couple, cover, event, story } = wedding;
  const heroDate = formatWeddingHeroDate(event.dateTime);
  return <main>
    <section className="hero section-shell" aria-labelledby="invitation-title"><div className="hero-frame">
      <div className="hero-ornament hero-ornament-left" aria-hidden="true" /><div className="hero-ornament hero-ornament-right" aria-hidden="true" />
      <p className="eyebrow">{cover.eyebrow}</p><FloralMark />
      <h1 id="invitation-title"><span>{couple.shortGroomName}</span><em>&amp;</em><span>{couple.shortBrideName}</span></h1>
      <p className="hero-message">{cover.message}</p><div className="hero-date"><span>{heroDate.day}</span><div><b>{heroDate.month}</b><small>{heroDate.year}</small></div></div>
      <a className="scroll-cue" href="#ngay-chung-doi">Khám phá thiệp mời <span aria-hidden="true">↓</span></a>
    </div></section>

    <section className="countdown-section section-shell" id="ngay-chung-doi" aria-labelledby="countdown-title">
      <p className="eyebrow">Save the date</p><h2 id="countdown-title">Ngày chung đôi đang đến gần</h2><p className="section-copy">{event.dateLabel} · {event.timeLabel}</p><Countdown eventTime={event.dateTime} />
    </section>

    <section className="couple-section section-shell" aria-labelledby="couple-title"><div className="section-heading"><p className="eyebrow">Cô dâu &amp; chú rể</p><h2 id="couple-title">Một tình yêu, một mái nhà</h2></div>
      <div className="couple-grid">
        <article className="person-card"><div className="portrait portrait-groom" aria-hidden="true"><span>H</span></div><p className="person-role">Chú rể</p><h3>{couple.groom}</h3><p>Một người luôn tin rằng những điều đẹp nhất được tạo nên từ sự chân thành.</p></article>
        <div className="heart-connector" aria-hidden="true">♡</div>
        <article className="person-card"><div className="portrait portrait-bride" aria-hidden="true"><span>N</span></div><p className="person-role">Cô dâu</p><h3>{couple.bride}</h3><p>Một người mang theo nụ cười ấm áp, làm mỗi ngày thường cũng trở nên đặc biệt.</p></article>
      </div>
    </section>

    <section className="story-section section-shell" aria-labelledby="story-title"><div className="section-heading"><p className="eyebrow">Hành trình yêu thương</p><h2 id="story-title">Chuyện của chúng mình</h2></div>
      <ol className="timeline">{story.map((milestone) => <li key={milestone.title}><div className="timeline-marker" aria-hidden="true" /><p className="timeline-date">{milestone.date}</p><h3>{milestone.title}</h3><p>{milestone.description}</p></li>)}</ol>
    </section>

    <section className="event-section section-shell" aria-labelledby="event-title"><div className="event-card"><p className="eyebrow">Lễ thành hôn</p><h2 id="event-title">Hẹn gặp bạn trong ngày vui của chúng mình</h2><FloralMark />
      <dl className="event-details"><div><dt>Thời gian</dt><dd>{event.timeLabel}</dd><dd>{event.dateLabel}</dd></div><div><dt>Địa điểm</dt><dd>{event.venue}</dd><dd>{event.address}</dd></div></dl>
      <a className="map-link" href={event.mapsUrl} target="_blank" rel="noreferrer">Xem chỉ đường <span aria-hidden="true">↗</span></a>
    </div></section>
    <footer className="site-footer section-shell"><FloralMark /><p>Huy &amp; Nhi</p><small>Rất hân hạnh được đón tiếp bạn.</small></footer>
  </main>;
}
