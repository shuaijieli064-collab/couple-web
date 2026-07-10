import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || ""
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@couple-web.app"

interface PushSubscription {
  endpoint: string
  p256dh: string
  auth_key: string
}

function encode(data: string): Uint8Array {
  return new TextEncoder().encode(data)
}

async function sendPush(subscription: PushSubscription, payload: string): Promise<boolean> {
  try {
    const body = encode(payload)
    const url = new URL(subscription.endpoint)

    const salt = crypto.getRandomValues(new Uint8Array(16))
    const authSecret = encode(subscription.auth_key)

    const localPublicKey = await crypto.subtle.importKey(
      "raw",
      Uint8Array.from(atob(subscription.p256dh.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)),
      { name: "ECDH", namedCurve: "P-256" },
      false,
      []
    )

    const serverPrivateKey = await crypto.subtle.importKey(
      "pkcs8",
      encode(VAPID_PRIVATE_KEY),
      { name: "ECDH", namedCurve: "P-256" },
      false,
      []
    )

    const sharedSecret = await crypto.subtle.deriveBits(
      { name: "ECDH", public: localPublicKey },
      serverPrivateKey,
      256
    )

    const ikmInput = new Uint8Array(5 + sharedSecret.byteLength + 4)
    ikmInput.set(encode("WebPush: info\x02"), 0)
    new DataView(ikmInput.buffer).setUint32(5 + sharedSecret.byteLength, 0, false)
    ikmInput.set(new Uint8Array(sharedSecret), 5)

    const ikm = await crypto.subtle.importKey(
      "raw", ikmInput, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    )
    const prk = await crypto.subtle.sign("HMAC", ikm, authSecret)

    const prkKey = await crypto.subtle.importKey(
      "raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    )
    const keyInfo = encode("Content-Encoding: aes128gcm\x00")
    const keyAuth = await crypto.subtle.sign("HMAC", prkKey, keyInfo)

    const aesKey = await crypto.subtle.importKey(
      "raw", keyAuth.slice(0, 16), { name: "AES-GCM" }, false, ["encrypt"]
    )

    const nonceInput = encode("Content-Encoding: nonce\x00")
    const nonce = (await crypto.subtle.sign("HMAC", prkKey, nonceInput)).slice(0, 12)

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      aesKey,
      body
    )

    const dhKey = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])
    const dhPubRaw = await crypto.subtle.exportKey("raw", dhKey.publicKey)

    const serverPublicKeyBytes = new Uint8Array(dhPubRaw)
    const saltBytes = salt

    const vapidHeader = await generateVapidHeader(url.origin, dhPubRaw)

    const header = new Uint8Array(5 + 65 + 12 + 16)
    header[0] = 0x01
    header.set(saltBytes, 1)
    new DataView(header.buffer).setUint32(17, 0, false)
    header[21] = 4
    header.set(serverPublicKeyBytes, 22)

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "TTL": "43200",
        "Authorization": vapidHeader,
      },
      body: new Uint8Array([...header, ...new Uint8Array(encrypted)]),
    })

    return response.ok || response.status === 201
  } catch (err) {
    console.error("Push send failed:", err)
    return false
  }
}

async function generateVapidHeader(origin: string, publicKey: Uint8Array): Promise<string> {
  const jwtHeader = btoa(JSON.stringify({ typ: "JWT", alg: "ES256" })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  const now = Math.floor(Date.now() / 1000)
  const jwtPayload = btoa(JSON.stringify({
    aud: origin,
    exp: now + 43200,
    sub: VAPID_SUBJECT,
  })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")

  const signingInput = encode(`${jwtHeader}.${jwtPayload}`)
  const key = await crypto.subtle.importKey(
    "raw", publicKey, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]
  )
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, signingInput)
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")

  return `vapid t=${jwtHeader}.${jwtPayload}.${sigB64}, k=${btoa(String.fromCharCode(...publicKey)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  try {
    const { notification_id, user_id, title, message, url } = await req.json()

    if (!user_id || !title) {
      return new Response("Missing required fields", { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id)

    if (error || !subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    let sentCount = 0
    const payload = JSON.stringify({
      title,
      body: message || "",
      tag: notification_id || "notification",
      url: url || "/",
    })

    for (const sub of subscriptions) {
      const success = await sendPush({
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth_key: sub.auth_key,
      }, payload)

      if (success) {
        sentCount++
      } else {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id)
      }
    }

    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
