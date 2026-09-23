import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, company, email, phone, service, budget, message, automationGoal, currentTools, mainGoal, softwareGoal } = body;

    if (!name || !email || (!message && !automationGoal && !softwareGoal)) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY in environment variables.");
      return NextResponse.json(
        { error: "Server configuration error. Email service is unavailable." },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const htmlContent = `
      <h2>New Project Inquiry &mdash; Digilo</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Company:</strong> ${company || "Not specified"}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone || "Not specified"}</p>
      <p><strong>Service Requested:</strong> ${service || "Not specified"}</p>
      <p><strong>Budget:</strong> ${budget || "Not specified"}</p>
      ${automationGoal ? `<p><strong>Automation Goal:</strong> ${automationGoal}</p>` : ""}
      ${currentTools ? `<p><strong>Current Tools:</strong> ${currentTools}</p>` : ""}
      ${mainGoal ? `<p><strong>Main Goal:</strong> ${mainGoal}</p>` : ""}
      ${softwareGoal ? `<p><strong>Software Goal:</strong> ${softwareGoal}</p>` : ""}
      <p><strong>Submission Date:</strong> ${new Date().toLocaleString()}</p>
      <p><strong>Source:</strong> Digilo Website</p>
      <br />
      <h3>Message:</h3>
      <p style="white-space: pre-wrap;">${message || "N/A"}</p>
    `;

    const { error } = await resend.emails.send({
      from: "Digilo Contact Form <onboarding@resend.dev>",
      to: ["rahulraushan802312@gmail.com"],
      subject: `New Project Inquiry: ${name}`,
      html: htmlContent,
      replyTo: email,
    });

    if (error) {
      console.error("Resend API Error:", error);
      return NextResponse.json(
        { error: `Email failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Message sent successfully. We'll get back to you shortly." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Contact Form Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
