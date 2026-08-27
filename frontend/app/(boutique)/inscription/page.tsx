import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function RegisterPage({
  searchParams,
}: PageProps<"/inscription">) {
  const { next } = await searchParams;

  return (
    <AuthForm
      mode="register"
      next={typeof next === "string" ? next : undefined}
    />
  );
}
