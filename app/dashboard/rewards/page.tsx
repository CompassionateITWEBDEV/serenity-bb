import { useEffect, useMemo, useState } from "react"


useEffect(() => {
load()
if (!supabase) return
const channel = supabase
.channel("realtime:rewards")
.on("postgres_changes", { event: "*", schema: "rewards", table: "transactions" }, () => load())
.subscribe()
return () => { supabase?.removeChannel(channel) }
}, [])


const fmt = useMemo(() => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }), [])


const redeem = async () => {
if (!supabase) return
setRedeeming(true)
const idem = `redeem:${crypto.randomUUID()}`
const { data, error } = await supabase.rpc("rewards_redeem_my_tokens", { p_amount: 50, p_reason: "coupon", p_idem_key: idem })
setRedeeming(false)
if (!error) load()
}


return (
<div className="space-y-6">
<Card>
<CardContent className="p-6 flex items-center justify-between">
<div>
<div className="text-sm opacity-70">My token balance</div>
<div className="text-4xl font-bold" aria-live="polite">{balance}</div>
</div>
<Button onClick={load} disabled={loading}>Refresh</Button>
</CardContent>
</Card>


<Card>
<CardContent className="p-6">
<div className="flex items-center justify-between mb-4">
<h2 className="text-lg font-semibold">Recent activity</h2>
<Button variant="outline" onClick={redeem} disabled={redeeming || balance < 50}>{redeeming ? "Redeeming..." : "Redeem 50"}</Button>
</div>
{txns.length === 0 ? (
<p className="text-sm opacity-70">No transactions yet.</p>
) : (
<ul className="space-y-2">
{txns.map(t => (
<li key={t.id} className="flex items-center justify-between border rounded-xl p-3">
<div>
<div className="text-sm">
<span className="font-medium mr-2">{t.kind}</span>
{t.rule_id && <Badge variant="secondary">{t.rule_id}</Badge>}
</div>
<div className="text-xs opacity-70">{fmt.format(new Date(t.created_at))}</div>
{t.expires_at && (
<div className="text-xs opacity-70">expires {fmt.format(new Date(t.expires_at))}</div>
)}
</div>
<div className={"text-lg font-semibold " + (t.delta > 0 ? "" : "opacity-80")}>{t.delta > 0 ? `+${t.delta}` : t.delta}</div>
</li>
))}
</ul>
)}
</CardContent>
</Card>
</div>
)
}
