import { create } from "zustand";
import { supabase } from "@/lib/supabase";

interface CvRecord {
  id: string;
  filename: string;
  uploaded_at: string;
  parsed_text: string;
}

interface CvState {
  activeCvId: string | null;
  activeCvFilename: string | null;
  activeCvText: string | null;
  cvList: CvRecord[];
  isPanelOpen: boolean;
  loading: boolean;
  uploading: boolean;
  uploadProgress: string;
  
  // Setters & Actions
  setPanelOpen: (open: boolean) => void;
  setActiveCvId: (id: string | null) => void;
  fetchCvs: () => Promise<void>;
  uploadCv: (file: File) => Promise<{ success: boolean; cv_id?: string; error?: string }>;
  deleteCv: (id: string) => Promise<boolean>;
  deselectActiveCv: () => void;
}

export const useCvStore = create<CvState>((set, get) => ({
  activeCvId: typeof window !== "undefined" ? localStorage.getItem("active_cv_id") : null,
  activeCvFilename: null,
  activeCvText: null,
  cvList: [],
  isPanelOpen: false,
  loading: false,
  uploading: false,
  uploadProgress: "",

  setPanelOpen: (open) => set({ isPanelOpen: open }),
  
  setActiveCvId: (id) => {
    if (id) {
      localStorage.setItem("active_cv_id", id);
      const cv = get().cvList.find(c => c.id === id);
      set({ 
        activeCvId: id,
        activeCvFilename: cv ? cv.filename : null,
        activeCvText: cv ? cv.parsed_text : null
      });
    } else {
      localStorage.removeItem("active_cv_id");
      set({ 
        activeCvId: null,
        activeCvFilename: null,
        activeCvText: null
      });
    }
  },

  deselectActiveCv: () => {
    localStorage.removeItem("active_cv_id");
    set({
      activeCvId: null,
      activeCvFilename: null,
      activeCvText: null
    });
  },

  fetchCvs: async () => {
    set({ loading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        set({ cvList: [], loading: false });
        return;
      }

      const { data, error } = await supabase
        .from("cvs")
        .select("id, filename, uploaded_at, parsed_text")
        .eq("user_id", session.user.id)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      
      const records: CvRecord[] = (data || []).map(r => ({
        id: r.id,
        filename: r.filename,
        uploaded_at: r.uploaded_at,
        parsed_text: r.parsed_text || ""
      }));

      set({ cvList: records });

      // If there is a cached activeCvId, sync its name and text
      const currentActiveId = get().activeCvId;
      if (currentActiveId) {
        const activeCv = records.find(c => c.id === currentActiveId);
        if (activeCv) {
          set({
            activeCvFilename: activeCv.filename,
            activeCvText: activeCv.parsed_text
          });
        } else {
          // Stale ID, clear it
          localStorage.removeItem("active_cv_id");
          set({ activeCvId: null, activeCvFilename: null, activeCvText: null });
        }
      }
    } catch (err) {
      console.error("Error fetching CVs:", err);
    } finally {
      set({ loading: false });
    }
  },

  uploadCv: async (file: File) => {
    set({ uploading: true, uploadProgress: "Uploading file to storage..." });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Unauthorized");

      // 1. Upload file to Supabase storage bucket
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
      const { data: storageData, error: storageError } = await supabase.storage
        .from("cv-uploads")
        .upload(fileName, file, { upsert: true });

      if (storageError) throw storageError;

      // 2. Call Edge Function to parse text and save in database
      set({ uploadProgress: "Calling AI model to extract resume text..." });
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const parseRes = await fetch(`${supabaseUrl}/functions/v1/parse-cv`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          filePath: storageData.path,
          filename: file.name
        })
      });

      const parseResult = await parseRes.json();
      if (!parseRes.ok || !parseResult.success) {
        throw new Error(parseResult.error || "Failed to parse CV");
      }

      // Re-fetch list
      set({ uploadProgress: "Syncing CV library..." });
      await get().fetchCvs();

      // Set newly uploaded CV as active and slide open the panel
      const newCvId = parseResult.cv_id;
      if (newCvId) {
        get().setActiveCvId(newCvId);
        set({ isPanelOpen: true });
      }

      return { success: true, cv_id: newCvId };
    } catch (err: any) {
      console.error("Error in uploadCv:", err);
      return { success: false, error: err.message || "Failed to upload and parse CV" };
    } finally {
      set({ uploading: false, uploadProgress: "" });
    }
  },

  deleteCv: async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Unauthorized");

      // Get filepath if needed, or simply delete from DB which triggers cascade
      const { error } = await supabase
        .from("cvs")
        .delete()
        .eq("id", id)
        .eq("user_id", session.user.id);

      if (error) throw error;

      // Update state
      const updatedList = get().cvList.filter(c => c.id !== id);
      set({ cvList: updatedList });

      // If the deleted CV was active, clear active CV
      if (get().activeCvId === id) {
        get().setActiveCvId(null);
      }
      return true;
    } catch (err) {
      console.error("Error deleting CV:", err);
      return false;
    }
  }
}));
