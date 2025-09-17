import nodemailer from 'nodemailer';
import config from '../../config';

// export const sendEmail = async (to: string, html: string, subject: string) => {
//   console.log(to);
//   try {
//     const transporter = nodemailer.createTransport({
//       host: 'smtp.gmail.com',
//       port: 587,
//       secure: false,
//       auth: {
//         // TODO: replace `user` and `pass` values from <https://forwardemail.net>
//         user: config.mail,
//         pass: config.mail_password,
//       },
//     });

//     const result = await transporter.sendMail({
//       from: 'akonhasan680@gmail.com', // sender address
//       to, // list of receivers
//       subject, // Subject line
//       text: '', // plain text body
//       html, // html body
//     });
//     console.log(result);
//   } catch (error) {}
// };

export const sendEmail = async (to: string, html: string, subject: string) => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: config.mail,
        pass: config.mail_password,
      },
    });
    const result = await transporter.sendMail({
      from: 'robinofficetest01@gmail.com',
      to,
      subject,
      text: '',
      html,
    });
    console.log('Req email sent to: ', to);
  } catch (error) {
    console.log(error);
  }
};
export const sendLinkViaMail = async (to: string, link: string) => {
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Verify your e-mail</title>
  </head>
  <body style="margin:0;padding:0;background:#ffffff;">
    <center>
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <!-- Header -->
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:500px;">
              <tr>
                <td align="left" style="color:#2a2a2a;font-family:Helvetica,Arial,sans-serif;font-size:48px;font-weight:400;line-height:62px;padding-bottom:15px;">
                  <!-- left empty intentionally -->
                </td>
                <td align="right" style="color:#2a2a2a;font-family:Helvetica,Arial,sans-serif;font-size:12px;font-weight:400;line-height:48px;padding-bottom:15px;">
                  <a href="https://kahfcollective.com/login" target="_blank" style="color:#515151;text-decoration:none;">Login to Kahf Collective</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Title -->
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:500px;border-bottom:1px solid #e5e5e5;">
              <tr>
                <td align="left" style="padding:20px 0 0 0;color:#2a2a2a;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:400;">
                  <p style="margin:0;color:#b8b08c;font-size:26px;font-weight:200;line-height:130%;margin-bottom:5px;">
                    Verify your e-mail to finish signing up for Kahf Collective
                  </p>
                </td>
              </tr>
              <tr><td height="20"></td></tr>
              <tr>
                <td align="left" style="color:#515151;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:400;line-height:170%;">
                  <p style="margin:0;">Thank you for joining <b>Kahf Collective</b>, an Islamic learning platform dedicated to empowering Muslims worldwide through authentic Islamic education and community building.</p>
                  <p style="margin:20px 0 0 0;color:#515151;">
                    Please confirm that <b>${to}</b> is your e-mail address by clicking on the button below or use this link:
                    <br />
                    <a href="${link}" target="_blank" style="color:#93a87e;">${link}</a>
                    <br />
                    within 24&nbsp;hours.
                  </p>
                </td>
              </tr>

              <!-- Button -->

<tr>
  <td align="center" style="padding:33px 0;">
    <table border="0" cellspacing="0" cellpadding="0" width="100%">
      <tr>
        <td align="center" bgcolor="#93a87e" style="border-radius:4px;">
          <a href="${link}" target="_blank"
             style="display:block; width:100%; text-align:center; text-transform:uppercase;
                    background:#93a87e; font-size:13px; font-weight:700; font-family:Helvetica,Arial,sans-serif;
                    color:#ffffff; text-decoration:none; padding:20px 0; border-radius:4px; border:1px solid #93a87e;">
            Verify
          </a>
        </td>
      </tr>
    </table>
  </td>
</tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:500px;">
              <tr>
                <td align="center" style="padding:30px 0;color:#515151;font-family:Helvetica,Arial,sans-serif;font-size:12px;font-weight:400;line-height:170%;">
                  Need help? Contact us at
                  <a href="mailto:support@kahfcollective.com" target="_blank" style="color:#93a87e;">support@kahfcollective.com</a>
                  or visit our
                  <a href="https://kahfcollective.com/help" target="_blank" style="color:#93a87e;">Help Center</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </center>
  </body>
</html>
`;
  return await sendEmail(to, html, 'Kahf Collective: Verify Your Account');
};
