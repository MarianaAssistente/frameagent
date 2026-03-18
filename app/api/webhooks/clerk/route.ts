import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Clerk webhook — creates user in frameagent_users on sign-up
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, data } = body;

  if (type === "user.created") {
    const supabase = supabaseAdmin();
    const { id, email_addresses, first_name, last_name } = data;
    const email = email_addresses?.[0]?.email_address ?? "";
    const name  = [first_name, last_name].filter(Boolean).join(" ") || email;

    const { error } = await supabase
      .from("frameagent_users")
      .insert({
        clerk_user_id: id,
        email,
        name,
        plan: "free",
        credits: 50,
      });

    if (error) {
      console.error("[clerk webhook] insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
