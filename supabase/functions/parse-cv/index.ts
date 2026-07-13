import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";
import mammoth from "https://esm.sh/mammoth@1.6.0";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ success: false, error: "Unauthorized: Missing Authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return jsonResponse({ success: false, error: "Unauthorized: Invalid token" }, 401);
    }

    const { file_url, filename } = await req.json();
    if (!file_url || !filename) {
      return jsonResponse({ success: false, error: "Missing file_url or filename in request" }, 400);
    }

    // Download the file from Supabase Storage
    console.log(`Downloading file from storage: ${file_url}`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('cv-uploads')
      .download(file_url);

    if (downloadError || !fileData) {
      console.error("Storage download error:", downloadError);
      return jsonResponse({ success: false, error: "Failed to download CV file from storage" }, 500);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const fileBytes = new Uint8Array(arrayBuffer);
    let parsedText = "";

    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      console.log("Parsing PDF CV with Gemini...");
      const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
      if (!geminiApiKey) {
        console.error("Missing GEMINI_API_KEY secret");
        return jsonResponse({ success: false, error: "Server error: Gemini key is not configured" }, 500);
      }

      const base64Data = encodeBase64(fileBytes);
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: "application/pdf",
                    data: base64Data
                  }
                },
                {
                  text: "Extract all textual information from this CV exactly as it appears. Do not translate, do not summarize, do not add any markdown blocks (like ```txt), and do not comment on it. Provide only the raw plain text of the resume."
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API call failed:", errorText);
        return jsonResponse({ success: false, error: `Gemini parsing failed: ${response.statusText}` }, 500);
      }

      const resJson = await response.json();
      parsedText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else if (ext === 'docx') {
      console.log("Parsing DOCX CV with Mammoth...");
      const result = await mammoth.extractRawText({ buffer: fileBytes });
      parsedText = result.value || "";
    } else {
      console.log("Parsing generic CV as plain text...");
      parsedText = new TextDecoder("utf-8").decode(fileBytes);
    }

    if (!parsedText.trim()) {
      return jsonResponse({ success: false, error: "Failed to extract text or CV is empty" }, 400);
    }

    console.log(`Setting other CVs to inactive for user: ${user.id}`);
    const { error: deactivateError } = await supabase
      .from("cvs")
      .update({ is_active: false })
      .eq("user_id", user.id);

    if (deactivateError) {
      console.error("Deactivate error:", deactivateError);
    }

    console.log("Inserting new CV record...");
    const { data: newCv, error: insertError } = await supabase
      .from("cvs")
      .insert({
        user_id: user.id,
        file_url: file_url,
        filename: filename,
        parsed_text: parsedText,
        is_active: true
      })
      .select("id")
      .single();

    if (insertError || !newCv) {
      console.error("Database insert error:", insertError);
      return jsonResponse({ success: false, error: "Failed to save CV text to database" }, 500);
    }

    console.log(`Successfully parsed CV with ID: ${newCv.id}`);
    return jsonResponse({
      success: true,
      cv_id: newCv.id,
      filename: filename
    });

  } catch (err: any) {
    console.error("Unexpected error in parse-cv:", err);
    return jsonResponse({ success: false, error: err.message || "Internal server error" }, 500);
  }
});
