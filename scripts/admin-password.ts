import { hashPassword } from "../src/lib/admin-auth";
const password = process.argv[2] ?? process.env.ADMIN_PASSWORD;

if (!password || password.length < 10) {
  console.error("Truyền mật khẩu ít nhất 10 ký tự: npm run admin:password -- '<mật-khẩu>'");
  process.exit(1);
}

const hash = await hashPassword(password);
const envSafeHash = hash.replaceAll("$", "\\$");
console.log(`ADMIN_PASSWORD_HASH=${envSafeHash}`);
