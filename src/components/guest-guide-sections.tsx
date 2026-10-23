import type { GuestGuide } from "@/lib/guest-guide-store";

export function GuestGuideSections({ guide }: { guide: GuestGuide }) {
  const agenda = guide.agenda.filter((item) => item.active);
  return <>
    {guide.agendaEnabled && agenda.length > 0 ? (
      <section id="lich-trinh" className="section-shell guest-guide-section" aria-labelledby="agenda-title">
        <div className="section-heading">
          <p className="eyebrow">Wedding day</p>
          <h2 id="agenda-title">{guide.agendaTitle}</h2>
          <p>{guide.agendaSubtitle}</p>
        </div>
        <ol className="guest-agenda">
          {agenda.map((item, index) => (
            <li key={index} className="guest-agenda-item">
              <time>{item.time}</time>
              <div><h3>{item.title}</h3>{item.description ? <p>{item.description}</p> : null}</div>
            </li>
          ))}
        </ol>
      </section>
    ) : null}
    {guide.layoutEnabled && guide.layoutImageSrc ? (
      <section id="so-do-khu-tiec" className="section-shell guest-guide-section" aria-labelledby="layout-title">
        <div className="section-heading">
          <p className="eyebrow">Find your way</p>
          <h2 id="layout-title">{guide.layoutTitle}</h2>
          <p>{guide.layoutSubtitle}</p>
        </div>
        <a href={guide.layoutImageSrc} target="_blank" rel="noopener noreferrer" aria-label="Mở sơ đồ khu tiệc kích thước lớn">
          {/* Uploaded images have variable dimensions; link opens full resolution. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="guest-layout-image" src={guide.layoutImageSrc} alt={guide.layoutAlt} loading="lazy" />
        </a>
        <p className="guest-layout-hint">Nhấn vào sơ đồ để xem kích thước lớn</p>
      </section>
    ) : null}
  </>;
}
