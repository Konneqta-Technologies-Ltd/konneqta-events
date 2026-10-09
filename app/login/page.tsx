import { redirect } from "next/navigation";

// Auth lives inline on the Create events page — /login just forwards there.
export default function LoginPage() {
  redirect("/create");
}
