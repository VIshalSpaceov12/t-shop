import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AccountClient } from "@/components/store/account-client";

export const metadata = {
  title: "My Account - SHOP",
};

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return <AccountClient />;
}
