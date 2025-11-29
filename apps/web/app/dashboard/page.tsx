import { getDashboardData } from "@/lib/get-dashboard-data";
import { SalesOSDashboard } from "@/components/SalesOSDashboard";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const data = await getDashboardData(user.id);

  // Get user's name from metadata or email
  const userName = user.user_metadata?.first_name || user.email?.split("@")[0] || "there";
  const userEmail = user.email || "";

  return <SalesOSDashboard userName={userName} userEmail={userEmail} data={data} />;
}
