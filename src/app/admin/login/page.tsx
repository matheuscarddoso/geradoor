"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, pass }),
    });

    if (res.ok) {
      router.push("/admin");
    } else {
      setError("Usuário ou senha incorretos.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-screen h-screen relative overflow-hidden px-8">
      <motion.div
        className="pattern absolute inset-0 -z-10 h-full w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      />

      <motion.div
        className="w-full max-w-[320px] flex flex-col space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tighter">Admin</h1>
          <p className="text-sm text-zinc-500">Acesso restrito</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col space-y-3">
          <Input
            type="email"
            placeholder="Email"
            autoComplete="username"
            className="bg-background"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            disabled={loading}
          />
          <Input
            type="password"
            placeholder="Senha"
            autoComplete="current-password"
            className="bg-background"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            disabled={loading}
          />

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <Button type="submit" disabled={loading || !user || !pass} className="w-full mt-2">
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : "Entrar"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
