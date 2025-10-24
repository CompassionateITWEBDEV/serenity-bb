import { NextResponse } from "next/server";
import { supabaseFromRoute } from "@/lib/supabaseRoute";

export async function GET() {
  try {
    const supabase = supabaseFromRoute();
    
    // Test basic Supabase connection
    const { data, error } = await supabase
      .from("conversations")
      .select("id")
      .limit(1);
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Supabase connection successful",
      data: data 
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

