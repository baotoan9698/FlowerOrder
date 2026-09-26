import { redirect } from "next/navigation";
import { currentShop } from "@/lib/auth";
import AuthForm from "../ui/auth-form";
import { accessMessages } from "@/lib/access";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  if (await currentShop()) redirect("/");
  const { reason } = await searchParams;
  return <AuthForm notice={accessMessages[reason ?? ""]} />;
}
