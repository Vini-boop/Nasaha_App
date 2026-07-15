'use strict';

const nodemailer = require('nodemailer');
const { Pool } = require('pg');
require('dotenv').config();

/* ─────────────────────────────────────────────────────────────
   SHARED RESOURCES
   Single transporter and pool instance — created once, reused.
───────────────────────────────────────────────────────────── */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/** App URL used in email links. Falls back to localhost for dev. */
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

/* ─────────────────────────────────────────────────────────────
   GUARD — returns false and logs a warning if SMTP is not ready.
───────────────────────────────────────────────────────────── */
function smtpReady() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[emailService] SMTP_USER or SMTP_PASS missing in .env — email skipped.');
    return false;
  }
  return true;
}

/* ─────────────────────────────────────────────────────────────
   SHARED LAYOUT HELPERS
   buildEmail(body) — wraps any inner HTML in the branded shell.
───────────────────────────────────────────────────────────── */
function buildEmail(body) {
  const year = new Date().getFullYear();
  return /* html */`
<!DOCTYPE html>
<html lang="sw">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NasahaApp</title>
</head>
<body style="margin:0;padding:0;background-color:#0F172A;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F172A;padding:32px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px;width:100%;background-color:#1E293B;
                      border-radius:16px;overflow:hidden;
                      border:1px solid rgba(255,255,255,0.07);
                      box-shadow:0 20px 40px rgba(0,0,0,0.4);">

          <!-- Header bar -->
          <tr>
            <td style="background:linear-gradient(135deg,#0F766E 0%,#14B8A6 100%);
                        padding:28px 36px;text-align:center;">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <!-- Logo mark -->
                    <div style="display:inline-block;
                                width:48px;height:48px;
                                background:rgba(255,255,255,0.15);
                                border-radius:12px;
                                font-size:1.5rem;font-weight:900;
                                color:#fff;line-height:48px;
                                text-align:center;letter-spacing:-0.04em;
                                margin-bottom:10px;">N</div>
                    <br/>
                    <span style="font-size:22px;font-weight:800;
                                 color:#ffffff;letter-spacing:-0.025em;">Nasaha</span>
                    <span style="display:block;font-size:11px;color:rgba(255,255,255,0.65);
                                 letter-spacing:0.12em;text-transform:uppercase;
                                 margin-top:4px;">Mfumo wa Usimamizi</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 36px 28px;">
              ${body}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 36px;">
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;">
                Barua pepe hii imetumwa kwa moja kwa moja na mfumo wa NasahaApp.<br/>
                Kama hujafanya ombi hili, tafadhali wasiliana na msimamizi.
              </p>
              <p style="margin:10px 0 0;font-size:11px;color:#334155;">
                &copy; ${year} NasahaApp &mdash; Haki zote zimehifadhiwa.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
}

/** Reusable teal CTA button */
function ctaButton(href, label) {
  return /* html */`
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-top:28px;">
      <tr>
        <td align="center">
          <a href="${href}"
             style="display:inline-block;
                    background:linear-gradient(135deg,#0F766E,#14B8A6);
                    color:#ffffff;text-decoration:none;
                    padding:13px 32px;border-radius:8px;
                    font-size:15px;font-weight:700;
                    letter-spacing:0.01em;
                    box-shadow:0 4px 14px rgba(15,118,110,0.4);">
            ${label}
          </a>
        </td>
      </tr>
    </table>
  `;
}

/** Highlighted info box */
function infoBox(rows) {
  const items = rows.map(([label, value, mono]) => /* html */`
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <span style="font-size:11px;font-weight:700;color:#64748B;
                     text-transform:uppercase;letter-spacing:0.07em;">${label}</span><br/>
        <span style="font-size:15px;color:#F8FAFC;font-weight:600;
                     ${mono ? "font-family:monospace;letter-spacing:0.05em;" : ''}">
          ${value}
        </span>
      </td>
    </tr>
  `).join('');

  return /* html */`
    <table cellpadding="0" cellspacing="0" width="100%"
           style="background:rgba(15,23,42,0.5);
                  border:1px solid rgba(15,118,110,0.25);
                  border-radius:10px;overflow:hidden;margin:20px 0;">
      ${items}
    </table>
  `;
}

/** Small badge pill */
function badge(text, color = '#14B8A6') {
  return /* html */`
    <span style="display:inline-block;
                 background:${color}22;
                 color:${color};
                 border:1px solid ${color}44;
                 border-radius:99px;
                 font-size:11px;font-weight:700;
                 padding:3px 10px;
                 letter-spacing:0.06em;
                 text-transform:uppercase;">
      ${text}
    </span>
  `;
}

/* ─────────────────────────────────────────────────────────────
   sendAdminNotification
   Sends a styled HTML notification email to the admin address
   stored in the DB settings table (if alerts are enabled).
───────────────────────────────────────────────────────────── */
async function sendAdminNotification(subject, text) {
  if (!smtpReady()) return;

  try {
    const result = await pool.query("SELECT * FROM settings WHERE id = 'global'");
    const settings = result.rows[0];

    if (!settings || !settings.emailAlertsEnabled || !settings.adminEmail) return;

    const body = /* html */`
      <!-- Title row -->
      <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
        <tr>
          <td>
            ${badge('Arifa ya Mfumo')}
            <h2 style="margin:12px 0 0;font-size:20px;font-weight:800;
                       color:#F8FAFC;letter-spacing:-0.02em;line-height:1.3;">
              ${subject}
            </h2>
          </td>
        </tr>
      </table>

      <!-- Message -->
      <p style="margin:0 0 24px;font-size:15px;color:#94A3B8;line-height:1.7;">
        ${text}
      </p>

      <!-- Timestamp -->
      ${infoBox([
      ['Wakati', new Date().toLocaleString('sw', {
        weekday: 'long', year: 'numeric', month: 'long',
        day: 'numeric', hour: '2-digit', minute: '2-digit',
      })],
      ['Mtumaji', 'Mfumo wa NasahaApp (Kiotomatiki)'],
    ])}

      <!-- CTA -->
      ${ctaButton(`${APP_URL}`, 'Fungua Dashibodi')}
    `;

    await transporter.sendMail({
      from: `"NasahaApp" <${process.env.SMTP_USER}>`,
      to: settings.adminEmail,
      subject: `[NasahaApp] ${subject}`,
      html: buildEmail(body),
      text: `${subject}\n\n${text}\n\nWakati: ${new Date().toLocaleString('sw')}`,
    });

    console.log(`[emailService] Admin notification sent to ${settings.adminEmail}`);
  } catch (err) {
    console.error('[emailService] Failed to send admin notification:', err.message);
  }
}

/* ─────────────────────────────────────────────────────────────
   sendCredentialsEmail
   Sends a welcome email with login credentials to a new writer.
───────────────────────────────────────────────────────────── */
async function sendCredentialsEmail(email, name, password) {
  if (!smtpReady()) return;

  const firstName = name.split(' ')[0];

  try {
    const body = /* html */`
      <!-- Greeting -->
      <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
        <tr>
          <td>
            ${badge('Mwandishi Mpya', '#38BDF8')}
            <h2 style="margin:12px 0 6px;font-size:22px;font-weight:800;
                       color:#F8FAFC;letter-spacing:-0.02em;">
              Karibu NasahaApp, ${firstName}! ✨
            </h2>
            <p style="margin:0;font-size:13px;color:#64748B;">
              Akaunti yako ya Mwandishi iko tayari
            </p>
          </td>
        </tr>
      </table>

      <!-- Intro paragraph -->
      <p style="margin:0 0 20px;font-size:15px;color:#94A3B8;line-height:1.75;">
        Akaunti yako ya <strong style="color:#F8FAFC;">Mwandishi</strong> katika
        NasahaApp imefunguliwa kikamilifu. Sasa unaweza kuanza kutunga na kuchapisha
        makala pamoja na dibaji kwenye mfumo wetu wa Kiswahili.
      </p>

      <!-- Credentials box -->
      ${infoBox([
      ['Barua Pepe', email],
      ['Nywila Yako', password, true],
    ])}

      <!-- Security note -->
      <table cellpadding="0" cellspacing="0" width="100%"
             style="background:rgba(245,158,11,0.08);
                    border:1px solid rgba(245,158,11,0.25);
                    border-radius:10px;margin:4px 0 20px;overflow:hidden;">
        <tr>
          <td style="padding:14px 16px;">
            <p style="margin:0;font-size:13px;color:#F59E0B;line-height:1.6;">
              <strong>&#9888; Muhimu:</strong>
              Hizi ni taarifa utakazotumia kuingia kwenye dashibodi yako.
              Hifadhi nywila yako salama na usishirikishe na mtu yeyote.
            </p>
          </td>
        </tr>
      </table>

      <!-- Steps -->
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;
                color:#64748B;text-transform:uppercase;letter-spacing:0.07em;">
        Hatua za Kuanza
      </p>
      <table cellpadding="0" cellspacing="0" width="100%">
        ${[
        ['1', 'Bonyeza kitufe hapa chini kuingia kwenye dashibodi'],
        ['2', 'Tumia barua pepe na nywila iliyo hapo juu kuingia'],
        ['3', 'Hifadhi taarifa zako za siri sehemu salama'],
        ['4', 'Anza kuandika makala na dibaji zako za kwanza!'],
      ].map(([num, step]) => /* html */`
          <tr>
            <td width="32" style="padding:6px 0;vertical-align:top;">
              <span style="display:inline-block;width:24px;height:24px;
                           background:rgba(20,184,166,0.15);
                           border:1px solid rgba(20,184,166,0.3);
                           border-radius:50%;font-size:11px;font-weight:700;
                           color:#14B8A6;text-align:center;line-height:22px;">
                ${num}
              </span>
            </td>
            <td style="padding:6px 0 6px 8px;font-size:14px;color:#94A3B8;line-height:1.5;">
              ${step}
            </td>
          </tr>
        `).join('')}
      </table>

      <!-- CTA -->
      ${ctaButton(APP_URL, 'Ingia Kwenye Dashibodi →')}

      <!-- Small reassurance -->
      <p style="margin:20px 0 0;font-size:12px;color:#475569;text-align:center;line-height:1.6;">
        Una swali? Wasiliana na msimamizi wa mfumo kwa usaidizi wowote.
      </p>
    `;

    await transporter.sendMail({
      from: `"NasahaApp" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Karibu NasahaApp — Akaunti Yako ya Mwandishi Iko Tayari`,
      html: buildEmail(body),
      text: [
        `Karibu NasahaApp, ${name}!`,
        '',
        'Akaunti yako ya Mwandishi imefunguliwa. Maelezo ya kuingia:',
        `  Barua Pepe : ${email}`,
        `  Nywila     : ${password}`,
        '',
        `Ingia hapa: ${APP_URL}`,
        '',
        'Hizi ni taarifa utakazotumia kuingia kwenye dashibodi yako.',
        '',
        `© ${new Date().getFullYear()} NasahaApp`,
      ].join('\n'),
    });

    console.log(`[emailService] Credentials email sent to ${email}`);
  } catch (err) {
    console.error('[emailService] Failed to send credentials email:', err.message);
  }
}

/* ─────────────────────────────────────────────────────────────
   sendCommentNotification
   Sends an email to the writer when a new comment is posted on their makala.
───────────────────────────────────────────────────────────── */
async function sendCommentNotification(email, authorName, articleTitle, commenterName, commentText) {
  if (!smtpReady()) return;

  try {
    const body = /* html */`
      <!-- Title row -->
      <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
        <tr>
          <td>
            ${badge('Maoni Mapya', '#38BDF8')}
            <h2 style="margin:12px 0 0;font-size:20px;font-weight:800;
                       color:#F8FAFC;letter-spacing:-0.02em;line-height:1.3;">
              Hujambo ${authorName},
            </h2>
          </td>
        </tr>
      </table>

      <!-- Message -->
      <p style="margin:0 0 24px;font-size:15px;color:#94A3B8;line-height:1.7;">
        Umepokea maoni mapya kwenye makala yako <strong>"${articleTitle}"</strong> kutoka kwa <strong>${commenterName}</strong>.
      </p>

      <!-- Comment box -->
      ${infoBox([
      ['Maoni', commentText]
    ])}

      <!-- CTA -->
      ${ctaButton(`${APP_URL}`, 'Fungua Dashibodi')}
    `;

    await transporter.sendMail({
      from: `"NasahaApp" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `[NasahaApp] Maoni Mapya Kwenye Makala Yako`,
      html: buildEmail(body),
      text: `Hujambo ${authorName},\n\nUmepokea maoni mapya kwenye makala yako "${articleTitle}" kutoka kwa ${commenterName}.\n\nMaoni:\n${commentText}\n\nIngia kwenye dashibodi ili kuona zaidi.`,
    });

    console.log(`[emailService] Comment notification sent to ${email}`);
  } catch (err) {
    console.error('[emailService] Failed to send comment notification:', err.message);
  }
}

/* ─────────────────────────────────────────────────────────────
   sendLikeMilestoneNotification
   Sends an email to the writer when their content reaches a
   multiple of 10 likes (10, 20, 30, …).
   contentType: 'makala' | 'dibaji'
───────────────────────────────────────────────────────────── */
async function sendLikeMilestoneNotification(email, authorName, contentTitle, likes, contentType) {
  if (!smtpReady()) return;

  const isArticle = contentType === 'makala';
  const contentLabel = isArticle ? 'Makala' : 'Dibaji';
  const firstName = authorName.split(' ')[0];

  try {
    const body = /* html */`
      <!-- Title row -->
      <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
        <tr>
          <td>
            ${badge('Mafanikio ya Likes', '#F59E0B')}
            <h2 style="margin:12px 0 0;font-size:20px;font-weight:800;
                       color:#F8FAFC;letter-spacing:-0.02em;line-height:1.3;">
              Hongera ${firstName}! 🎉
            </h2>
          </td>
        </tr>
      </table>

      <!-- Message -->
      <p style="margin:0 0 24px;font-size:15px;color:#94A3B8;line-height:1.7;">
        ${contentLabel} yako <strong style="color:#F8FAFC;">"${contentTitle}"</strong>
        imefikisha jumla ya <strong style="color:#F59E0B;">${likes} likes</strong>!
        Wasomaji wanaipenda kazi yako — endelea hivyo!
      </p>

      <!-- Stats box -->
      ${infoBox([
      [contentLabel, contentTitle],
      ['Likes Zilizofikiwa', `${likes} 👍`],
      ['Tarehe', new Date().toLocaleString('sw', {
        weekday: 'long', year: 'numeric', month: 'long',
        day: 'numeric', hour: '2-digit', minute: '2-digit',
      })],
    ])}

      <!-- CTA -->
      ${ctaButton(APP_URL, 'Angalia Dashibodi →')}

      <p style="margin:20px 0 0;font-size:12px;color:#475569;text-align:center;line-height:1.6;">
        Arifa hii inatumwa kila unapofika kiwango kipya cha likes (10, 20, 30…).
      </p>
    `;

    await transporter.sendMail({
      from: `"NasahaApp" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `[NasahaApp] ${contentLabel} Yako Imefikisha ${likes} Likes! 🎉`,
      html: buildEmail(body),
      text: [
        `Hongera ${authorName}!`,
        '',
        `${contentLabel} yako "${contentTitle}" imefikisha ${likes} likes!`,
        '',
        `Ingia kwenye dashibodi kuona zaidi: ${APP_URL}`,
        '',
        `© ${new Date().getFullYear()} NasahaApp`,
      ].join('\n'),
    });

    console.log(`[emailService] Like milestone (${likes}) notification sent to ${email}`);
  } catch (err) {
    console.error('[emailService] Failed to send like milestone notification:', err.message);
  }
}

/* ─────────────────────────────────────────────────────────────
   sendDibajiCommentNotification
   Sends an email to the writer when a new comment is posted
   on their dibaji (one-on-one, same pattern as makala comments).
───────────────────────────────────────────────────────────── */
async function sendDibajiCommentNotification(email, authorName, dibajiExcerpt, commenterName, commentText) {
  if (!smtpReady()) return;

  try {
    const body = /* html */`
      <!-- Title row -->
      <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
        <tr>
          <td>
            ${badge('Maoni Mapya', '#38BDF8')}
            <h2 style="margin:12px 0 0;font-size:20px;font-weight:800;
                       color:#F8FAFC;letter-spacing:-0.02em;line-height:1.3;">
              Hujambo ${authorName},
            </h2>
          </td>
        </tr>
      </table>

      <!-- Message -->
      <p style="margin:0 0 24px;font-size:15px;color:#94A3B8;line-height:1.7;">
        Umepokea maoni mapya kwenye dibaji yako
        <strong style="color:#F8FAFC;">"${dibajiExcerpt}"</strong>
        kutoka kwa <strong style="color:#F8FAFC;">${commenterName}</strong>.
      </p>

      <!-- Comment box -->
      ${infoBox([
      ['Maoni', commentText],
    ])}

      <!-- CTA -->
      ${ctaButton(APP_URL, 'Fungua Dashibodi')}
    `;

    await transporter.sendMail({
      from: `"NasahaApp" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `[NasahaApp] Maoni Mapya Kwenye Dibaji Yako`,
      html: buildEmail(body),
      text: [
        `Hujambo ${authorName},`,
        '',
        `Umepokea maoni mapya kwenye dibaji yako "${dibajiExcerpt}" kutoka kwa ${commenterName}.`,
        '',
        `Maoni:\n${commentText}`,
        '',
        `Ingia kwenye dashibodi ili kuona zaidi: ${APP_URL}`,
      ].join('\n'),
    });

    console.log(`[emailService] Dibaji comment notification sent to ${email}`);
  } catch (err) {
    console.error('[emailService] Failed to send dibaji comment notification:', err.message);
  }
}

/* ─────────────────────────────────────────────────────────────
   EXPORTS
───────────────────────────────────────────────────────────── */
module.exports = {
  sendAdminNotification,
  sendCredentialsEmail,
  sendCommentNotification,
  sendLikeMilestoneNotification,
  sendDibajiCommentNotification,
};
