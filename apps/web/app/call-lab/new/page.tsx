import { redirect } from "next/navigation";

export default function CallLabNewPage() {
  // Redirect to Pro analyze page for authenticated users
  redirect("/call-lab/pro");
}
