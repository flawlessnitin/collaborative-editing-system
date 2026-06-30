import Link from "next/link";
import { registerAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
      <div className="w-full max-w-sm space-y-6 bg-card p-6 sm:p-8 rounded-xl shadow-xl border border-border/60">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Create an Account</h1>
          <p className="text-sm text-muted-foreground mt-2">Sign up to get started</p>
        </div>

        {params.error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{params.error}</AlertDescription>
          </Alert>
        )}

        <form action={registerAction} className="space-y-4">
          <div>
            <Label htmlFor="name" className="mb-1 block">Name</Label>
            <Input id="name" name="name" type="text" required />
          </div>
          <div>
            <Label htmlFor="email" className="mb-1 block">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div>
            <Label htmlFor="password" className="mb-1 block">Password</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <Button type="submit" className="w-full">Register</Button>
        </form>
        <div className="text-center text-sm mt-4">
          Already have an account? <Link href="/login" className="text-primary hover:underline">Log in</Link>
        </div>
      </div>
    </div>
  );
}
