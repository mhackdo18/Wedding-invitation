import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailConfig {
  provider: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_pass: string | null;
  from_email: string | null;
  from_name: string | null;
  subject_line: string | null;
  email_body: string | null;
  site_url: string | null;
  email_photo_url: string | null;
  email_body_html: string | null;
  email_attachments: { name: string; url: string }[] | null;
}

async function createTransporter(cfg: EmailConfig) {
  const nodemailer = await import("npm:nodemailer@6.9.16");
  return nodemailer.default.createTransport({
    host: cfg.smtp_host || "",
    port: cfg.smtp_port || 587,
    secure: (cfg.smtp_port || 587) === 465,
    auth: cfg.smtp_user
      ? { user: cfg.smtp_user, pass: cfg.smtp_pass || "" }
      : undefined,
  });
}

function replaceTags(
  text: string,
  guestName: string,
  partner1: string,
  partner2: string,
  weddingDate: string,
  rsvpLink: string,
  partyName: string,
  rsvpDeadline: string,
  gatePassword: string,
  nameOnCard: string
): string {
  return (text || "")
    .replace(/\{\{guest_name\}\}/g, guestName)
    .replace(/\{\{name_on_card\}\}/g, nameOnCard)
    .replace(/\{\{partner1_name\}\}/g, partner1)
    .replace(/\{\{partner2_name\}\}/g, partner2)
    .replace(/\{\{partner_name\}\}/g, `${partner1} & ${partner2}`)
    .replace(/\{\{party_name\}\}/g, partyName)
    .replace(/\{\{wedding_date\}\}/g, weddingDate)
    .replace(/\{\{rsvp_deadline\}\}/g, rsvpDeadline)
    .replace(/\{\{gate_password\}\}/g, gatePassword)
    .replace(/\{\{rsvp_link\}\}/g, rsvpLink);
}

function buildEmailHtml(
  cfg: EmailConfig,
  guestName: string,
  partner1: string,
  partner2: string,
  weddingDate: string,
  rsvpLink: string,
  partyName: string,
  rsvpDeadline: string,
  gatePassword: string,
  waxSealColor: string,
  _waxSealImage: string | null,
  _envelopeColor: string,
  nameOnCard: string
): string {
  let rawBody = cfg.email_body_html
    ? replaceTags(
        cfg.email_body_html,
        guestName,
        partner1,
        partner2,
        weddingDate,
        rsvpLink,
        partyName,
        rsvpDeadline,
        gatePassword,
        nameOnCard
      )
    : `Dear <strong>${guestName}</strong>,\n\nYou are cordially invited to celebrate the wedding of <strong>${partner1} &amp; ${partner2}</strong>${weddingDate ? ` on ${weddingDate}` : ""}.\n\nWe would be honoured by your presence.\n\nWith all our love,\n\n<strong>${partner1} &amp; ${partner2}</strong>`;

  // Convert **text** to <strong>text</strong> for markdown-style bold
  rawBody = rawBody.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // If the body doesn't already contain <p> tags, convert double newlines to paragraphs
  const hasHtmlTags = /<p[\s>]|<br\s*\/?>/i.test(rawBody);
  let bodyHtml: string;
  if (hasHtmlTags) {
    bodyHtml = rawBody;
  } else {
    bodyHtml = rawBody
      .split(/\n\s*\n/)
      .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
      .join('\n');
  }

  const photoHtml = cfg.email_photo_url
    ? `<img src="${cfg.email_photo_url}" alt="" style="width:100%;max-height:300px;object-fit:contain;margin:24px 0 0;" />`
    : "";

  const rsvpBtn = rsvpLink
    ? `<div style="text-align:center;margin:28px 0 8px;">
         <a href="${rsvpLink}" style="display:inline-block;padding:14px 40px;background:#2d2d2d;color:#fff;text-decoration:none;font-size:12px;font-weight:600;font-family:Arial,Helvetica,sans-serif;letter-spacing:0.15em;text-transform:uppercase;">OPEN YOUR INVITATION</a>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3ef;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ef;padding:24px 0;">
<tr><td align="center">
<table width="500" cellpadding="0" cellspacing="0" style="max-width:500px;width:100%;">

<!-- Header banner -->
<tr><td style="background:#f0ebe3;padding:18px 30px;text-align:center;">
  <span style="font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:${waxSealColor};font-family:Arial,Helvetica,sans-serif;">YOU'RE INVITED</span>
</td></tr>

<!-- Main body -->
<tr><td style="background:#ffffff;padding:40px 36px 32px;border-left:1px solid #e8e2d8;border-right:1px solid #e8e2d8;">

  <!-- Decorative line -->
  <div style="text-align:center;margin:0 0 28px;">
    <div style="width:40px;height:2px;background:#c9bfae;margin:0 auto;"></div>
  </div>

  <!-- Email body content — preserves HTML formatting -->
  <div style="color:#3a3a3a;font-size:15px;line-height:1.8;font-family:Georgia,'Times New Roman',serif;">
    ${bodyHtml}
  </div>

  <!-- Photo -->
  ${photoHtml}

  <!-- Open Your Invitation button -->
  ${rsvpBtn}

</td></tr>

<!-- Footer -->
<tr><td style="background:#f0ebe3;padding:16px 30px;text-align:center;">
  <span style="color:${waxSealColor};font-size:16px;">&#10022;</span>
</td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, test_email, guest_ids, guest_id, card_names } = await req.json();

    const { data: emailCfg } = await supabase
      .from("email_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!emailCfg) {
      return new Response(
        JSON.stringify({
          error:
            "Email settings not configured. Go to Admin > Invitation > Email Content to set up SMTP.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const cfg = emailCfg as EmailConfig;

    const { data: site } = await supabase
      .from("site_settings")
      .select(
        "partner1_name, partner2_name, wedding_date, rsvp_deadline, public_password, invitation_wax_seal_color, invitation_wax_seal_image_url, invitation_envelope_color"
      )
      .limit(1)
      .maybeSingle();

    const partner1 = (site as any)?.partner1_name || "Partner 1";
    const partner2 = (site as any)?.partner2_name || "Partner 2";
    const waxSealColor =
      (site as any)?.invitation_wax_seal_color || "#C5A059";
    const waxSealImage =
      (site as any)?.invitation_wax_seal_image_url || null;
    const envelopeColor =
      (site as any)?.invitation_envelope_color || "#FAFAFA";
    const weddingDate = (site as any)?.wedding_date
      ? new Date((site as any).wedding_date).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "";
    const rsvpDeadline = (site as any)?.rsvp_deadline
      ? new Date((site as any).rsvp_deadline).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "";
    const gatePassword = (site as any)?.public_password || "";
    const siteUrl = (cfg.site_url || "").replace(/\/+$/, "");

    if (action === "test_send") {
      if (!cfg.smtp_host) {
        return new Response(
          JSON.stringify({ error: "SMTP host is not configured." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (!test_email) {
        return new Response(
          JSON.stringify({ error: "No test email address provided." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      try {
        const transporter = await createTransporter(cfg);
        await transporter.sendMail({
          from: `"${cfg.from_name || partner1 + " & " + partner2}" <${cfg.from_email || cfg.smtp_user}>`,
          to: test_email,
          subject: cfg.subject_line || "Wedding invitation test",
          text: `This is a test email from your wedding website.`,
          html: buildEmailHtml(
            cfg,
            "Sample Guest",
            partner1,
            partner2,
            weddingDate,
            siteUrl ? `${siteUrl}/#invite/sample-token` : "",
            "",
            rsvpDeadline,
            gatePassword,
            waxSealColor,
            waxSealImage,
            envelopeColor,
            "Sample Name"
          ),
        });
        return new Response(
          JSON.stringify({
            success: true,
            message: `Test email sent to ${test_email}`,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (sendErr: any) {
        return new Response(
          JSON.stringify({
            error: `SMTP error: ${sendErr.message || sendErr.code || "Failed to send"}`,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    if (action === "send_selected") {
      const ids = guest_ids || [];
      if (ids.length === 0) {
        return new Response(
          JSON.stringify({ error: "No guests selected." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (!cfg.smtp_host) {
        return new Response(
          JSON.stringify({ error: "SMTP host not configured." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const { data: guests } = await supabase
        .from("guests")
        .select("id, name, email, party_id, name_on_card")
        .in("id", ids)
        .not("email", "is", null);
      return await sendToGuests(
        cfg,
        guests || [],
        supabase,
        partner1,
        partner2,
        weddingDate,
        rsvpDeadline,
        gatePassword,
        siteUrl,
        waxSealColor,
        waxSealImage,
        envelopeColor,
        card_names || {}
      );
    }

    if (action === "send_single") {
      if (!cfg.smtp_host) {
        return new Response(
          JSON.stringify({ error: "SMTP host not configured." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const { data: guest } = await supabase
        .from("guests")
        .select("id, name, email, party_id, name_on_card")
        .eq("id", guest_id)
        .maybeSingle();
      if (!guest || !(guest as any).email) {
        return new Response(
          JSON.stringify({ error: "Guest has no email address." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      return await sendToGuests(
        cfg,
        [guest],
        supabase,
        partner1,
        partner2,
        weddingDate,
        rsvpDeadline,
        gatePassword,
        siteUrl,
        waxSealColor,
        waxSealImage,
        envelopeColor,
        card_names || {}
      );
    }

    if (action === "send_invitations") {
      if (!cfg.smtp_host) {
        return new Response(
          JSON.stringify({ error: "SMTP host not configured." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const { data: guests } = await supabase
        .from("guests")
        .select("id, name, email, party_id, name_on_card")
        .not("email", "is", null);
      return await sendToGuests(
        cfg,
        guests || [],
        supabase,
        partner1,
        partner2,
        weddingDate,
        rsvpDeadline,
        gatePassword,
        siteUrl,
        waxSealColor,
        waxSealImage,
        envelopeColor,
        card_names || {}
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function sendToGuests(
  cfg: EmailConfig,
  guests: any[],
  supabase: any,
  partner1: string,
  partner2: string,
  weddingDate: string,
  rsvpDeadline: string,
  gatePassword: string,
  siteUrl: string,
  waxSealColor: string,
  waxSealImage: string | null,
  envelopeColor: string,
  cardNames: Record<string, string>
) {
  const partyIds = [
    ...new Set(guests.map((g) => g.party_id).filter(Boolean)),
  ];
  const { data: parties } = await supabase
    .from("parties")
    .select("id, name")
    .in("id", partyIds);
  const partyMap: Record<string, string> = {};
  (parties || []).forEach((p: any) => {
    partyMap[p.id] = p.name;
  });

  const transporter = await createTransporter(cfg);
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const guest of guests) {
    let token: string;
    const { data: existing } = await supabase
      .from("invitations")
      .select("id, token")
      .eq("guest_id", guest.id)
      .maybeSingle();
    if (existing) {
      token = existing.token;
    } else {
      token = crypto.randomUUID();
      const { error: invError } = await supabase
        .from("invitations")
        .insert({
          guest_id: guest.id,
          token,
          sent_at: new Date().toISOString(),
        });
      if (invError) {
        failed++;
        errors.push(
          `${guest.name}: could not create invitation record`
        );
        continue;
      }
    }

    const inviteUrl = siteUrl ? `${siteUrl}/#invite/${token}` : "";
    const partyName = guest.party_id
      ? partyMap[guest.party_id] || ""
      : "";
    const guestName = cardNames[guest.id] || guest.name_on_card || (guest.name || "").split(" ")[0] || guest.name || "";
    const nameOnCard = guest.name_on_card || guestName;
    const html = buildEmailHtml(
      cfg,
      guestName,
      partner1,
      partner2,
      weddingDate,
      inviteUrl,
      partyName,
      rsvpDeadline,
      gatePassword,
      waxSealColor,
      waxSealImage,
      envelopeColor,
      nameOnCard
    );
    const text =
      replaceTags(
        cfg.email_body || "",
        guestName,
        partner1,
        partner2,
        weddingDate,
        inviteUrl,
        partyName,
        rsvpDeadline,
        gatePassword,
        nameOnCard
      ) + (inviteUrl ? `\n\nOpen your invitation: ${inviteUrl}` : "");

    try {
      await transporter.sendMail({
        from: `"${cfg.from_name || partner1 + " & " + partner2}" <${cfg.from_email || cfg.smtp_user}>`,
        to: guest.email,
        subject:
          cfg.subject_line ||
          `You're invited to ${partner1} & ${partner2}'s wedding!`,
        text,
        html,
        attachments: (cfg.email_attachments || []).map((a) => ({
          filename: a.name,
          path: a.url,
        })),
      });
      sent++;
    } catch (sendErr: any) {
      failed++;
      errors.push(
        `${guest.name} (${guest.email}): ${sendErr.message || sendErr.code || "send failed"}`
      );
    }
  }

  return new Response(
    JSON.stringify({
      sent,
      failed,
      total: guests.length,
      message:
        failed > 0
          ? `${sent} emails sent, ${failed} failed. ${errors.slice(0, 3).join("; ")}`
          : `${sent} invitation email${sent !== 1 ? "s" : ""} sent successfully!`,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
