import type { InvitationContent } from "@/types/invitation-content";

export const invitationSocialImageSize = {
  width: 1200,
  height: 630,
};

function guestNameFontSize(guestName?: string) {
  const length = guestName?.trim().length ?? 0;
  if (length > 42) return 46;
  if (length > 32) return 52;
  if (length > 24) return 58;
  return 66;
}

export function invitationSocialCopy(content: InvitationContent, guestName?: string) {
  const couple = `${content.couple.shortGroomName} & ${content.couple.shortBrideName}`;
  const normalizedGuestName = guestName?.trim();
  const date = content.event.dateLabel.trim();

  if (normalizedGuestName) {
    return {
      couple,
      title: `Thiệp cưới gửi ${normalizedGuestName} | ${couple}`,
      description: `${couple} trân trọng kính mời ${normalizedGuestName} đến chung vui${date ? ` ngày ${date}` : ""}.`,
    };
  }

  return {
    couple,
    title: `${couple} | Thiệp mời lễ thành hôn`,
    description: `Trân trọng kính mời bạn đến chung vui cùng ${couple}${date ? ` ngày ${date}` : ""}.`,
  };
}

export function InvitationSocialCard({
  content,
  guestName,
}: {
  content: InvitationContent;
  guestName?: string;
}) {
  const copy = invitationSocialCopy(content, guestName);
  const normalizedGuestName = guestName?.trim();
  const date = content.event.dateLabel.trim();
  const venue = content.event.venue.trim();

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "#fbf7f2",
        color: "#2f2928",
        fontFamily: "serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 360,
          height: 360,
          borderRadius: 999,
          background: "#efd6df",
          top: -150,
          right: -80,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 430,
          height: 430,
          borderRadius: 999,
          border: "2px solid #d8b56f",
          bottom: -280,
          left: -140,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 34,
          border: "1px solid rgba(176, 132, 87, 0.55)",
          borderRadius: 28,
          display: "flex",
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          padding: "76px 96px 62px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 24,
              letterSpacing: 7,
              color: "#9b6f63",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            {normalizedGuestName ? "Thiệp mời dành riêng cho" : "Trân trọng kính mời"}
          </div>

          <div
            style={{
              marginTop: 24,
              maxWidth: 900,
              fontSize: normalizedGuestName ? guestNameFontSize(normalizedGuestName) : 82,
              lineHeight: 1.04,
              fontWeight: 600,
              letterSpacing: -1.5,
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            {normalizedGuestName ?? copy.couple}
          </div>

          {normalizedGuestName ? (
            <div
              style={{
                marginTop: 18,
                fontSize: 38,
                color: "#7f625d",
                display: "flex",
              }}
            >
              {copy.couple}
            </div>
          ) : (
            <div
              style={{
                marginTop: 16,
                fontSize: 34,
                color: "#7f625d",
                display: "flex",
              }}
            >
              Ngày vui của chúng mình
            </div>
          )}
        </div>

        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            {date ? (
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 600,
                  color: "#b18457",
                  display: "flex",
                }}
              >
                {date}
              </div>
            ) : null}
            {venue ? (
              <div
                style={{
                  marginTop: 8,
                  maxWidth: 720,
                  fontSize: 23,
                  color: "#6f6662",
                  display: "flex",
                }}
              >
                {venue}
              </div>
            ) : null}
          </div>

          <div
            style={{
              fontSize: 18,
              letterSpacing: 1.2,
              color: "#9b918d",
              display: "flex",
            }}
          >
            congchuavahoangtu.nhkhuy.run.place
          </div>
        </div>
      </div>
    </div>
  );
}
