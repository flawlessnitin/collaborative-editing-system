import Link from "next/link";
import { registerAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
      <div className="w-full max-w-sm space-y-6 bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-sm border">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Create an Account</h1>
          <p className="text-sm text-gray-500 mt-2">Sign up to get started</p>
        </div>
        
        {params.error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm text-center">
            {params.error}
          </div>
        )}

        <form action={registerAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="name">Name</label>
            <input 
              id="name"
              name="name" 
              type="text" 
              required 
              className="w-full px-3 py-2 border rounded-md bg-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
            <input 
              id="email"
              name="email" 
              type="email" 
              required 
              className="w-full px-3 py-2 border rounded-md bg-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="password">Password</label>
            <input 
              id="password"
              name="password" 
              type="password" 
              required 
              className="w-full px-3 py-2 border rounded-md bg-transparent"
            />
          </div>
          <Button type="submit" className="w-full">Register</Button>
        </form>
        <div className="text-center text-sm mt-4">
          Already have an account? <Link href="/login" className="text-blue-600 hover:underline">Log in</Link>
        </div>
      </div>
    </div>
  );
}
