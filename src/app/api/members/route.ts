import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data: members } = await supabase
    .from("members")
    .select("id, name, created_at");
  return NextResponse.json(members || []);
}