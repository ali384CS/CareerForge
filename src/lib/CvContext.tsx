"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

export interface Cv {
  id: string;
  user_id: string;
  file_url: string;
  filename: string;
  parsed_text: string;
  is_active: boolean;
  uploaded_at: string;
}

interface CvContextType {
  cvList: Cv[];
  activeCvId: string | null;
  activeCvFilename: string | null;
  activeCvText: string | null;
  loading: boolean;
  uploading: boolean;
  uploadProgress: string;
  refreshCvs: () => Promise<void>;
  setActiveCv: (id: string) => Promise<boolean>;
  uploadCv: (file: File) => Promise<{ success: boolean; cv_id?: string; error?: string }>;
  deleteCv: (id: string) => Promise<boolean>;
  renameCv: (id: string, newFilename: string) => Promise<boolean>;
}

const CvContext = createContext<CvContextType | undefined>(undefined);

export function CvProvider({ children }: { children: React.ReactNode }) {
  const [cvList, setCvList] = useState<Cv[]>([]);
  const [activeCvId, setActiveCvId] = useState<string | null>(null);
  const [activeCvFilename, setActiveCvFilename] = useState<string | null>(null);
  const [activeCvText, setActiveCvText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const refreshCvs = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setCvList([]);
        setActiveCvId(null);
        setActiveCvFilename(null);
        setActiveCvText(null);
        setLoading(false);
        return;
      }

      setUserId(session.user.id);

      const { data: cvs, error } = await supabase
        .from("cvs")
        .select("*")
        .eq("user_id", session.user.id)
        .order("uploaded_at", { ascending: false });

      if (error) {
        throw error;
      }

      const list = cvs || [];
      setCvList(list);

      // Find active CV in database
      const active = list.find((c) => c.is_active);
      if (active) {
        setActiveCvId(active.id);
        setActiveCvFilename(active.filename);
        setActiveCvText(active.parsed_text);
      } else if (list.length > 0) {
        // Fallback: If no active CV is flag-marked, make the most recent one active in state & DB
        const defaultActive = list[0];
        setActiveCvId(defaultActive.id);
        setActiveCvFilename(defaultActive.filename);
        setActiveCvText(defaultActive.parsed_text);
        
        // Asynchronously mark it active in the database
        await supabase.from("cvs").update({ is_active: true }).eq("id", defaultActive.id);
        await supabase.from("cvs").update({ is_active: false }).eq("user_id", session.user.id).neq("id", defaultActive.id);
      } else {
        setActiveCvId(null);
        setActiveCvFilename(null);
        setActiveCvText(null);
      }
    } catch (err) {
      console.error("Error refreshing CVs in CvContext:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update active status
  const setActiveCv = async (id: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      // 1. Instantly update UI for a snappy feel
      const chosenCv = cvList.find((c) => c.id === id);
      if (chosenCv) {
        setActiveCvId(chosenCv.id);
        setActiveCvFilename(chosenCv.filename);
        setActiveCvText(chosenCv.parsed_text);
        
        // Optimistically update list state
        setCvList(prev => prev.map(c => ({
          ...c,
          is_active: c.id === id
        })));
      }

      // 2. Perform DB operations
      const { error: deactivateError } = await supabase
        .from("cvs")
        .update({ is_active: false })
        .eq("user_id", userId);

      if (deactivateError) throw deactivateError;

      const { error: activateError } = await supabase
        .from("cvs")
        .update({ is_active: true })
        .eq("id", id);

      if (activateError) throw activateError;

      return true;
    } catch (err) {
      console.error("Error setting active CV:", err);
      // Re-fetch to synchronize state correctly if it fails
      await refreshCvs();
      return false;
    }
  };

  // Upload and parse a new CV
  const uploadCv = async (file: File): Promise<{ success: boolean; cv_id?: string; error?: string }> => {
    try {
      setUploading(true);
      setUploadProgress("Uploading file to Storage...");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error("You must be logged in to upload files.");
      }

      // 1. Upload file to Supabase Storage
      const cleanFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `${session.user.id}/${Date.now()}_${cleanFilename}`;

      const { error: storageError } = await supabase.storage
        .from("cv-uploads")
        .upload(storagePath, file, { cacheControl: "3600", upsert: true });

      if (storageError) {
        console.error("Storage upload failed:", storageError);
        throw new Error(`Storage upload failed: ${storageError.message}`);
      }

      // 2. Call parse-cv Edge Function to parse and save the record
      setUploadProgress("Extracting & parsing text content...");
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const parseRes = await fetch(`${supabaseUrl}/functions/v1/parse-cv`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          file_url: storagePath,
          filename: file.name
        })
      });

      const parseData = await parseRes.json();
      if (!parseRes.ok || !parseData.success) {
        throw new Error(parseData.error || "Failed to parse CV text.");
      }

      // 3. Re-fetch CV list and set state
      setUploadProgress("Updating library...");
      await refreshCvs();

      return {
        success: true,
        cv_id: parseData.cv_id
      };
    } catch (err: any) {
      console.error("Error uploading/parsing CV:", err);
      return {
        success: false,
        error: err.message || "An unexpected error occurred."
      };
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  // Delete CV and storage file
  const deleteCv = async (id: string): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("You must be logged in to delete files.");

      // 1. Get the CV record to find file_url
      const cvToDelete = cvList.find(c => c.id === id);
      if (!cvToDelete) return false;

      // 2. Delete from Supabase Storage
      if (cvToDelete.file_url) {
        const { error: storageError } = await supabase.storage
          .from("cv-uploads")
          .remove([cvToDelete.file_url]);
        
        if (storageError) {
          console.warn("Storage deletion warning:", storageError);
        }
      }

      // 3. Delete from database
      const { error: dbError } = await supabase
        .from("cvs")
        .delete()
        .eq("id", id)
        .eq("user_id", session.user.id);

      if (dbError) throw dbError;

      // 4. Update state
      const remaining = cvList.filter(c => c.id !== id);
      setCvList(remaining);

      // If active CV was deleted, reset or select next
      if (activeCvId === id) {
        if (remaining.length > 0) {
          const nextActive = remaining[0];
          setActiveCvId(nextActive.id);
          setActiveCvFilename(nextActive.filename);
          setActiveCvText(nextActive.parsed_text);
          
          // Mark active in DB
          await supabase.from("cvs").update({ is_active: true }).eq("id", nextActive.id);
          await supabase.from("cvs").update({ is_active: false }).eq("user_id", session.user.id).neq("id", nextActive.id);
        } else {
          setActiveCvId(null);
          setActiveCvFilename(null);
          setActiveCvText(null);
        }
      }

      return true;
    } catch (err) {
      console.error("Error deleting CV:", err);
      return false;
    }
  };

  // Rename CV
  const renameCv = async (id: string, newFilename: string): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Unauthorized");

      const { error } = await supabase
        .from("cvs")
        .update({ filename: newFilename })
        .eq("id", id)
        .eq("user_id", session.user.id);

      if (error) throw error;

      // Update state
      setCvList(prev => prev.map(c => c.id === id ? { ...c, filename: newFilename } : c));
      if (activeCvId === id) {
        setActiveCvFilename(newFilename);
      }
      return true;
    } catch (err) {
      console.error("Error renaming CV:", err);
      return false;
    }
  };

  // Listen for auth changes and fetch list
  useEffect(() => {
    refreshCvs();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await refreshCvs();
      } else if (event === "SIGNED_OUT") {
        setCvList([]);
        setActiveCvId(null);
        setActiveCvFilename(null);
        setActiveCvText(null);
        setUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshCvs]);

  return (
    <CvContext.Provider
      value={{
        cvList,
        activeCvId,
        activeCvFilename,
        activeCvText,
        loading,
        uploading,
        uploadProgress,
        refreshCvs,
        setActiveCv,
        uploadCv,
        deleteCv,
        renameCv
      }}
    >
      {children}
    </CvContext.Provider>
  );
}

export function useCv() {
  const context = useContext(CvContext);
  if (context === undefined) {
    throw new Error("useCv must be used within a CvProvider");
  }
  return context;
}
