import { notFound, redirect } from "next/navigation";
import { adminHostAllowed, currentAdmin } from "@/lib/admin-auth";
import AdminLoginForm from "./form";
export default async function Page() {
  if (!(await adminHostAllowed())) notFound();
  if (await currentAdmin()) redirect("/admin");
  return <AdminLoginForm />;
}
