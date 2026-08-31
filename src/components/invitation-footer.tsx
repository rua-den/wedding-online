import { FloralMark } from "./floral-mark";

export function InvitationFooter({ title, message }: { title: string; message: string }) {
  return (
    <footer id="loi-cam-on" className="site-footer section-shell">
      <FloralMark />
      <p>{title}</p>
      <small>{message}</small>
    </footer>
  );
}
