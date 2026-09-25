import Link from "next/link";
import styles from "./admin-tabs.module.css";

type AdminTab = "dashboard" | "edit" | "appearance" | "media-optimize";

export function AdminTabs({ active }: { active: AdminTab }) {
  return <nav className={styles.tabs} aria-label="Khu vực quản trị">
    <Link className={active === "dashboard" ? styles.active : ""} href="/admin">Khách mời</Link>
    <Link className={active === "edit" ? styles.active : ""} href="/admin/edit">Chỉnh thiệp</Link>
    <Link className={active === "appearance" ? styles.active : ""} href="/admin/appearance">Giao diện</Link>
    <Link className={active === "media-optimize" ? styles.active : ""} href="/admin/media-optimize">Tối ưu ảnh</Link>
  </nav>;
}
