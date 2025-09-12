"use client"


import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"


/** Admin/service usage only if you expose a server action; left here as an example. */
export function QuickAwardButton({ userId, amount = 25 }: { userId: string; amount?: number }) {
const onClick = async () => {
if (!supabase) return
// This is illustrative; client cannot call grant_tokens directly (RLS blocks). Use a server action instead.
alert("Use a server action to grant tokens with service role.")
}
return <Button onClick={onClick}>Grant {amount}</Button>
}
