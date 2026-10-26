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
  invitation_button_label: string | null;
  email_attachments: { name: string; url: string }[] | null;
  preheader_text: string | null;
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

const PARAGRAPH_MARGIN = 'margin:0;';

function sanitizeHtml(html: string): string {
  let result = html;
  result = result.replace(/<script[\s\S]*?<\/script>/gi, '');
  result = result.replace(/<style[\s\S]*?<\/style>/gi, '');
  result = result.replace(/<form[\s\S]*?<\/form>/gi, '');
  result = result.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
  result = result.replace(/<object[\s\S]*?<\/object>/gi, '');
  result = result.replace(/<embed[\s\S]*?<\/embed>/gi, '');
  result = result.replace(/\son\w+\s*=\s*"[^"]*"/gi, '');
  result = result.replace(/\son\w+\s*=\s*'[^']*'/gi, '');
  result = result.replace(/\son\w+\s*=\s*[^\s>]+/gi, '');
  result = result.replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#"');
  result = result.replace(/href\s*=\s*'javascript:[^']*'/gi, "href='#'");
  result = result.replace(/src\s*=\s*"javascript:[^"]*"/gi, 'src=""');
  result = result.replace(/src\s*=\s*'javascript:[^']*'/gi, "src=''");
  result = result.replace(/<img(?![^>]*\balt=)/gi, '<img alt=" "');
  return result;
}

function absolutizeLinks(html: string, siteUrl: string): string {
  if (!siteUrl) return html;
  const base = siteUrl.replace(/\/+$/, '');
  let result = html.replace(/href\s*=\s*"(\/[^"]*)"/gi, (_m, p: string) => `href="${base}${p}"`);
  result = result.replace(/href\s*=\s*'(\/[^']*)'/gi, (_m, p: string) => `href='${base}${p}'`);
  result = result.replace(/href\s*=\s*"(#[^"]*)"/gi, (_m, p: string) => `href="${base}${p}"`);
  result = result.replace(/href\s*=\s*'(#[^']*)'/gi, (_m, p: string) => `href='${base}${p}'`);
  return result;
}

function normalizeBodyHtml(html: string): string {
  let result = html;

  // Convert <br> followed by whitespace/newlines into paragraph breaks
  result = result.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n\n');

  // Convert <div> tags with text-align into <p> tags, preserving alignment
  let prev: string;
  do {
    prev = result;
    result = result.replace(
      /<div([^>]*)>([\s\S]*?)<\/div>/gi,
      (_m, attrs: string, content: string) => {
        const alignMatch = attrs.match(/text-align:\s*(left|center|right|justify)/i);
        if (alignMatch) {
          const align = alignMatch[1].toLowerCase();
          return `<p style="${PARAGRAPH_MARGIN}text-align:${align};">${content}</p>`;
        }
        return content;
      }
    );
  } while (result !== prev);

  // Split on double newlines (from <br><br> or actual newlines) into paragraphs
  const hasPTags = /<p[\s>]/i.test(result);
  if (!hasPTags) {
    const paragraphs = result.split(/\n\s*\n/).filter((p) => p.trim());
    if (paragraphs.length > 0) {
      result = paragraphs
        .map((p) => `<p style="${PARAGRAPH_MARGIN}">${p.replace(/\n/g, '<br>').trim()}</p>`)
        .join('\n');
    }
  }

  // Ensure every <p> tag has the margin style
  result = result.replace(/<p(?![^>]*\bmargin\b)/gi, `<p style="${PARAGRAPH_MARGIN}"`);
  result = result.replace(/<p\s+style="([^"]*?)"(?![^>]*\bmargin\b)/gi, `<p style="$1${PARAGRAPH_MARGIN}"`);

  return result;
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function htmlToText(html: string): string {
  return (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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
    : `Dear ${guestName},<br><br>You are cordially invited to celebrate the wedding of <strong>${partner1} &amp; ${partner2}</strong>${weddingDate ? ` on ${weddingDate}` : ""}.<br><br>We would be honoured by your presence.<br><br>With all our love,<br><br><strong>${partner1} &amp; ${partner2}</strong>`;

  rawBody = rawBody.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Sanitize and absolutize before normalizing
  rawBody = sanitizeHtml(rawBody);
  rawBody = absolutizeLinks(rawBody, cfg.site_url || '');

  const bodyHtml = normalizeBodyHtml(rawBody);

  const photoHtml = cfg.email_photo_url
    ? `<img src="${cfg.email_photo_url}" alt="Wedding photo" style="width:100%;max-height:300px;object-fit:contain;margin:24px 0 0;" />`
    : "";

  const rsvpBtn = rsvpLink
    ? `<div style="text-align:center;margin:28px 0 8px;">
         <a href="${rsvpLink}" style="display:inline-block;padding:12px 36px;background:#3a3a3a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:normal;font-family:Georgia,serif;border-radius:4px;">${escapeHtml(cfg.invitation_button_label || 'Open your invitation')}</a>
       </div>`
    : "";

  const preheader = (cfg.preheader_text || '').trim();
  const preheaderPad = '\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b\u200b';
  const preheaderHtml = preheader
    ? `<div style="max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#f5f3ef;background:#f5f3ef;">${escapeHtml(preheader)}${preheaderPad}</div>`
    : '';

  const replyEmail = cfg.from_email || cfg.smtp_user || '';
  const footerHtml = replyEmail
    ? `<tr><td style="background:#f0ebe3;padding:14px 30px;text-align:center;">
         <p style="margin:0;font-size:11px;color:#9a8a76;font-family:Georgia,serif;line-height:1.5;">This is a personal wedding invitation sent via our wedding website. If you received this in error, please reply to ${escapeHtml(replyEmail)}.</p>
       </td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${escapeHtml(cfg.subject_line || 'Wedding Invitation')}</title>
<!--[if mso]>
<style type="text/css">
table,td{font-family:Georgia,'Times New Roman',serif !important;}
</style>
<![endif]-->
<style>
@media only screen and (max-width:520px){
  .email-container{width:100% !important;}
  .email-content{padding:24px 20px !important;}
  .email-header{padding:14px 20px !important;}
  .email-footer{padding:12px 20px !important;}
}
</style>
</head>
<body style="margin:0;padding:0;background:#f5f3ef;font-family:Georgia,'Times New Roman',serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
${preheaderHtml}
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:#f5f3ef;padding:24px 0;">
<tr><td align="center">
<table class="email-container" width="500" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:500px;width:100%;">

<tr><td class="email-header" style="background:#f0ebe3;padding:18px 30px;text-align:center;">
  <span style="font-size:13px;color:${waxSealColor};font-family:Georgia,serif;font-style:italic;">You're invited</span>
</td></tr>

<tr><td class="email-content" style="background:#ffffff;padding:40px 36px 32px;border-left:1px solid #e8e2d8;border-right:1px solid #e8e2d8;">

  <div style="text-align:center;margin:0 0 28px;">
    <div style="width:40px;height:2px;background:#c9bfae;margin:0 auto;"></div>
  </div>

  <div style="color:#3a3a3a;font-size:15px;line-height:1.5;font-family:Georgia,'Times New Roman',serif;">
    ${bodyHtml}
  </div>

  ${photoHtml}

  ${rsvpBtn}

</td></tr>

<tr><td style="background:#f0ebe3;padding:16px 30px;text-align:center;">
  <span style="color:${waxSealColor};font-size:16px;">&#10022;</span>
</td></tr>

${footerHtml}

</table>
</td></tr>
</table>
</body></html>`;
}

function buildPlainText(
  cfg: EmailConfig,
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
    : `Dear ${guestName},\n\nYou are cordially invited to celebrate the wedding of ${partner1} & ${partner2}${weddingDate ? ` on ${weddingDate}` : ""}.\n\nWe would be honoured by your presence.\n\nWith all our love,\n\n${partner1} & ${partner2}`;

  rawBody = rawBody.replace(/\*\*(.+?)\*\*/g, '$1');
  let text = htmlToText(rawBody);

  if (rsvpLink) {
    text += `\n\n${cfg.invitation_button_label || 'Open your invitation'}: ${rsvpLink}`;
  }

  const replyEmail = cfg.from_email || cfg.smtp_user || '';
  if (replyEmail) {
    text += `\n\nThis is a personal wedding invitation sent via our wedding website. If you received this in error, please reply to ${replyEmail}.`;
  }

  return text.trim();
}

function buildMessageId(fromEmail: string): string {
  const domain = (fromEmail || '').split('@')[1] || 'localhost';
  const token = crypto.randomUUID();
  return `<${token}@${domain}>`;
}

function buildHeaders(cfg: EmailConfig): Record<string, string> {
  const replyEmail = cfg.from_email || cfg.smtp_user || '';
  return {
    "X-Priority": "3",
    "X-Mailer": "Wedding Invitation Platform",
    "List-Unsubscribe": `<mailto:${replyEmail}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=one-click",
    "X-Auto-Response-Suppress": "All",
    "Message-ID": buildMessageId(replyEmail),
    "Content-Language": "en-US",
    "X-Content-Type-Options": "nosniff",
  };
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
          replyTo: cfg.from_email || cfg.smtp_user,
          headers: buildHeaders(cfg),
          text: buildPlainText(
            cfg,
            "Sample Guest",
            partner1,
            partner2,
            weddingDate,
            siteUrl ? `${siteUrl}/#invite/sample-token` : "",
            "",
            rsvpDeadline,
            gatePassword,
            "Sample Name"
          ),
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
        const raw = sendErr.message || sendErr.code || "Failed to send";
        let hint = "";
        if (/SmtpClientAuthentication is disabled/i.test(raw)) {
          hint =
            " Your email provider (Outlook/Microsoft 365) has SMTP authentication disabled for this mailbox. Enable SMTP AUTH in the Microsoft 365 admin center (Users > Active users > Mail > Email apps > enable Authenticated SMTP), or switch to a Gmail account with an App Password.";
        } else if (/535 5\.7\.|authentication/i.test(raw)) {
          hint =
            " Double-check your SMTP username and password — for Gmail/Outlook use an App Password, not your regular account password.";
        }
        return new Response(
          JSON.stringify({
            error: `SMTP error: ${raw}.${hint}`,
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
    const text = buildPlainText(
      cfg,
      guestName,
      partner1,
      partner2,
      weddingDate,
      inviteUrl,
      partyName,
      rsvpDeadline,
      gatePassword,
      nameOnCard
    );

    try {
      await transporter.sendMail({
        from: `"${cfg.from_name || partner1 + " & " + partner2}" <${cfg.from_email || cfg.smtp_user}>`,
        to: guest.email,
        subject:
          cfg.subject_line ||
          `You're invited to ${partner1} & ${partner2}'s wedding`,
        replyTo: cfg.from_email || cfg.smtp_user,
        headers: buildHeaders(cfg),
        text,
        html,
        attachments: (cfg.email_attachments || []).map((a) => ({
          filename: a.name,
          path: a.url,
        })),
      });
      sent++;
    } catch (sendErr: any) {
      const raw = sendErr.message || sendErr.code || "send failed";
      let hint = "";
      if (/SmtpClientAuthentication is disabled/i.test(raw)) {
        hint =
          " (SMTP AUTH is disabled for this mailbox — enable Authenticated SMTP in Microsoft 365 admin settings, or use a Gmail App Password.)";
      }
      failed++;
      errors.push(
        `${guest.name} (${guest.email}): ${raw}${hint}`
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
