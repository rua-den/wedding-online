import Link from "next/link";
import styles from "./admin-tabs.module.css";

export function AdminTabs({ active }: { active: "dashboard" | "edit" }) {
  return <nav className={styles.tabs} aria-label="Khu vực quản trị">
    <Link className={active === "dashboard" ? styles.active : ""} href="/admin">Khách mời</Link>
    <Link className={active === "edit" ? styles.active : ""} href="/admin/edit">Chỉnh thiệp</Link>
  </nav>;
}
