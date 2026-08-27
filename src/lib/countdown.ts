export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  ended: boolean;
};

export function getCountdownParts(eventTime: string, now = new Date()): CountdownParts {
  const millisecondsRemaining = new Date(eventTime).getTime() - now.getTime();

  if (millisecondsRemaining <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, ended: true };
  }

  const totalSeconds = Math.floor(millisecondsRemaining / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, ended: false };
}
