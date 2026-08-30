"use client";

import { useEffect, useState } from "react";
import { getCountdownParts } from "@/lib/countdown";

const labels = ["Ngày", "Giờ", "Phút", "Giây"];

export function Countdown({ eventTime }: { eventTime: string }) {
  const [countdown, setCountdown] = useState(() => getCountdownParts(eventTime));

  useEffect(() => {
    const update = () => setCountdown(getCountdownParts(eventTime));
    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, [eventTime]);

  if (countdown.ended) return <p className="countdown-ended">Hôm nay là ngày chúng mình về chung một nhà.</p>;

  return <div className="countdown" aria-label="Thời gian còn lại đến ngày cưới">
    {[countdown.days, countdown.hours, countdown.minutes, countdown.seconds].map((part, index) => (
      <div className="countdown-part" key={labels[index]}>
        <strong suppressHydrationWarning>{String(part).padStart(2, "0")}</strong><span>{labels[index]}</span>
      </div>
    ))}
  </div>;
}
