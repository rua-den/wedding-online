"use client";

import { useEffect, useState } from "react";
import { getCountdownParts } from "@/lib/countdown";

const labels = ["Ngày", "Giờ", "Phút", "Giây"];

export function Countdown({ eventTime }: { eventTime: string }) {
  const [countdown, setCountdown] = useState<ReturnType<typeof getCountdownParts> | null>(null);

  useEffect(() => {
    const update = () => setCountdown(getCountdownParts(eventTime));
    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, [eventTime]);

  if (countdown?.ended) return <p className="countdown-ended">Hôm nay là ngày chúng mình về chung một nhà.</p>;

  const parts = countdown ?? { days: 0, hours: 0, minutes: 0, seconds: 0, ended: false };

  return <div className="countdown" aria-label="Thời gian còn lại đến ngày cưới">
    {[parts.days, parts.hours, parts.minutes, parts.seconds].map((part, index) => (
      <div className="countdown-part" key={labels[index]}>
        <strong>{String(part).padStart(2, "0")}</strong><span>{labels[index]}</span>
      </div>
    ))}
  </div>;
}
