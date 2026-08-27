import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/connexion">) {
  // `next` est lu ici plutot qu'avec `useSearchParams` : ca evite d'imposer
  // une frontiere Suspense au formulaire.
  const { next } = await searchParams;

  return (
    <AuthForm mode="login" next={typeof next === "string" ? next : undefined} />
  );
}
