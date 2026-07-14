import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";
import mammoth from "https://esm.sh/mammoth@1.6.0";
import { getDocumentProxy, extractText } from "npm:unpdf";

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

    // Extract path from public URL if it starts with http/https
    let storagePath = file_url;
    if (file_url.startsWith("http://") || file_url.startsWith("https://")) {
      try {
        const url = new URL(file_url);
        // Look for the bucket name segment in the URL path to extract the relative path
        const parts = url.pathname.split("/cv-uploads/");
        if (parts.length > 1) {
          storagePath = decodeURIComponent(parts[1]);
        } else {
          // fallback if bucket matches cvs or something else
          const cvsParts = url.pathname.split("/cvs/");
          if (cvsParts.length > 1) {
            storagePath = decodeURIComponent(cvsParts[1]);
          }
        }
      } catch (e) {
        console.error("Error parsing URL in edge function:", e);
      }
    }

    // Download the file from Supabase Storage
    console.log(`Downloading file from storage path: ${storagePath}`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('cv-uploads')
      .download(storagePath);

    if (downloadError || !fileData) {
      console.error("Storage download error:", downloadError);
      return jsonResponse({ success: false, error: "Failed to download CV file from storage" }, 500);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const fileBytes = new Uint8Array(arrayBuffer);
    let parsedText = "";

    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      console.log("Parsing PDF CV with unpdf...");
      try {
        const pdf = await getDocumentProxy(new Uint8Array(fileBytes));
        const { text } = await extractText(pdf, { mergePages: true });
        parsedText = text || "";
      } catch (pdfError: any) {
        console.error("unpdf text extraction failed:", pdfError);
        return jsonResponse({ success: false, error: `PDF text extraction failed: ${pdfError.message}` }, 500);
      }
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
