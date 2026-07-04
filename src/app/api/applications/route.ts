import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { job_id, cv_text, job_description } = body;

    if (!cv_text || !job_description) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Mocking an AI generation process for tailored applications
    const tailoredResume = cv_text + `\n\n[AI ENHANCEMENT: Tailored specifically to address the '${job_description.substring(0, 30)}...' requirements.]`;
    
    const coverLetter = `Dear Hiring Manager,

I am writing to express my strong interest in the position. Given my background, which closely aligns with the technical requirements mentioned in your job description, I am confident I can make an immediate impact.

[AI Generated: Highlights specific metric-driven achievements mapped to the JD.]

Thank you for your time and consideration.
`;

    const answersToQuestions = [
      { question: "Why do you want to work here?", answer: "[AI Generated] Based on your company's recent product launches, I am excited about..." },
      { question: "What is your biggest weakness?", answer: "[AI Generated] I sometimes focus too much on details, but I manage it by..." }
    ];

    return NextResponse.json({
      success: true,
      application: {
        version_id: `v_${Date.now()}`,
        tailored_resume: tailoredResume,
        cover_letter: coverLetter,
        auto_answers: answersToQuestions
      }
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
