# CareerForge — AI-Powered CV Analysis & Job Matching Platform

CareerForge is a comprehensive CV optimization and job search platform built with Next.js 16 (App Router), Tailwind CSS, and Supabase. The platform helps job seekers optimize their resumes for Applicant Tracking Systems (ATS) and find matching remote and local jobs.

## Key Features

- **Auth & Session Persistence**: Snappy auth powered by Supabase with robust state caching and auto-loading navbar states.
- **Dynamic ATS Scoring**: Enhanced multi-factor ATS compatibility check using technical keyword density, section structure analysis, action verbs, and quantifiable metrics.
- **JD-Aware Optimization**: Extracts missing technical skills from any provided Job Description and dynamically injects them into the optimized resume.
- **Strict plain-text formatting**: Cleans and normalizes CVs into recruiter-approved plain-text (no markdown, clean hyphens, grouped bullet points).
- **Arbeitnow Job Integration**: Client-side filtering of real job opportunities via Arbeitnow, sorted by Jaccard-based keyword match scores.
- **Interactive CV Builder**: Full form-to-resume pipeline allowing users to build an optimized CV from scratch and export it to a pixel-perfect PDF.
- **Polished Brand Identity**: Warm fire/forge amber theme (#F97316) with glassmorphism UI elements and responsive custom SVG branding.

## Getting Started

First, install the dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Supabase Setup

Deploy the Edge Functions to your Supabase project:

```bash
supabase functions deploy analyze-cv --project-ref jrglpmcfsptqsxjeeyuj
supabase functions deploy optimize-cv --project-ref jrglpmcfsptqsxjeeyuj
supabase functions deploy generate-cv --project-ref jrglpmcfsptqsxjeeyuj
```
