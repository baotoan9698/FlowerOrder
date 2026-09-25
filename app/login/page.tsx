import { redirect } from "next/navigation";
import { currentShop } from "@/lib/auth";
import AuthForm from "../ui/auth-form";

export default async function LoginPage() {
  if (await currentShop()) redirect("/");
  return <AuthForm />;
}
