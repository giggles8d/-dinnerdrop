// Loader for the Supabase confirm-signup email template HTML.
// Loaded via <script> tag from the Supabase auth dashboard by Cowork (cross-origin
// fetch is blocked, but a <script> tag is not). Sets window.__ddSupabaseConfirmHtml.
window.__ddSupabaseConfirmHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your DinnerDrop account</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="600" style="margin:40px auto;background-color:#ffffff;border-radius:8px;overflow:hidden;">
    <!-- Header -->
    <tr>
      <td style="background-color:#1a5c38;padding:24px 32px;">
        <h1 style="color:#e8a838;font-size:24px;font-weight:700;margin:0;letter-spacing:-0.5px;">DinnerDrop</h1>
      </td>
    </tr>

    <!-- Badge -->
    <tr>
      <td style="background-color:#e8a838;padding:10px 32px;text-align:center;">
        <p style="color:#1a5c38;font-size:13px;font-weight:700;margin:0;letter-spacing:1px;">🎉 ONE CLICK FROM YOUR 6 MONTHS FREE</p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding:32px;">
        <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">Hi there,</p>

        <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">
          Thanks for signing up for the DinnerDrop beta! One quick step before your free 6 months kicks in:
          confirm that <strong>{{ .Email }}</strong> is your email.
        </p>

        <!-- CTA Button -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:28px auto;">
          <tr>
            <td style="background-color:#1a5c38;border-radius:6px;">
              <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:6px;">
                Confirm my email →
              </a>
            </td>
          </tr>
        </table>

        <p style="color:#9ca3af;font-size:13px;text-align:center;margin:0 0 28px;">
          Takes 2 seconds. After this, you'll go through a quick quiz, then your first weekly meal plan is ready.
        </p>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">

        <h2 style="color:#1a5c38;font-size:18px;font-weight:600;line-height:1.4;margin:24px 0 16px;">What's waiting on the other side:</h2>

        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 8px;">✓ AI plans 5 weeknight dinners for your family in 30 seconds</p>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 8px;">✓ Full grocery list — deduplicated and organized</p>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 8px;">✓ One tap sends the whole list to your Instacart cart</p>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">✓ Works around picky eaters, dietary needs, your budget</p>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">

        <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px;padding:16px;background-color:#f9fafb;border-radius:6px;">
          <strong>Didn't sign up?</strong> Just ignore this email and your account won't be activated.
        </p>

        <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:24px 0 0;text-align:center;">
          If the button above doesn't work, copy and paste this link into your browser:<br>
          <a href="{{ .ConfirmationURL }}" style="color:#1a5c38;word-break:break-all;">{{ .ConfirmationURL }}</a>
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
        <p style="color:#9ca3af;font-size:13px;margin:0;">
          <a href="https://dinnerdrop.app" style="color:#6b7280;text-decoration:underline;">dinnerdrop.app</a>
          ·
          DinnerDrop · Built for busy families
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;
