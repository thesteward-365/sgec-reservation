import { getIronSession } from "iron-session"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { sessionOptions, SessionData } from "@/lib/session"

export default async function RootPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)

  if (!session.user) {
    redirect("/login")
  }

  if (session.user.status === "approved") {
    redirect("/reserve")
  }

  redirect("/pending")
}
