"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function login() {
    await supabase.auth.signInWithPassword({ email, password });
    window.location.href = "/dashboard";
  }

  return (
    <div className="max-w-sm mx-auto mt-32">
      <input
        className="border w-full mb-2 p-2"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="border w-full mb-4 p-2"
        placeholder="Password"
        type="password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={login} className="w-full bg-black text-white p-2">
        Login
      </button>
    </div>
  );
}
