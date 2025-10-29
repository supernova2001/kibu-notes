import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  // Fetch notes ordered by timestamp within the day
  const { data: notes, error } = await supabase
    .from("notes")
    .select("*")
    .eq("member_id", id)
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: true }); // sort by time within each day

  if (error) {
    console.error("Supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group notes by date for frontend display
  const grouped = notes?.reduce((acc: any, note: any) => {
    const dateKey = new Date(note.session_date).toISOString().split("T")[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(note);
    return acc;
  }, {});

  return NextResponse.json(grouped || {});
}