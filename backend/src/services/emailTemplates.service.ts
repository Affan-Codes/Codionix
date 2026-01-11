import { env } from '../config/env.js';

// Color Palette
const COLORS = {
  background: '#F9FAFB',
  card: '#FFFFFF',
  border: '#E5E7EB',
  primaryText: '#111827',
  secondaryText: '#6B7280',
  button: '#0EA5A4',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
} as const;

// Base Layout
const createEmailLayout = (content: string): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Codionix</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.background}; font-family: Arial, system-ui, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${COLORS.background};">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: ${COLORS.card}; border-radius: 8px; border: 1px solid ${COLORS.border};">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; border-bottom: 1px solid ${COLORS.border};">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: ${COLORS.primaryText};">Codionix</h1>
                    <p style="margin: 4px 0 0 0; font-size: 14px; color: ${COLORS.secondaryText};">Build. Learn. Grow.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid ${COLORS.border}; background-color: ${COLORS.background};">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="font-size: 12px; color: ${COLORS.secondaryText}; line-height: 18px;">
                    <p style="margin: 0 0 8px 0;">This email was sent by Codionix</p>
                    <p style="margin: 0;">If you have questions, contact us at <a href="mailto:support@codionix.com" style="color: ${COLORS.button}; text-decoration: none;">support@codionix.com</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        <!-- Unsubscribe (outside card) -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 16px auto 0 auto;">
          <tr>
            <td style="text-align: center; font-size: 12px; color: ${COLORS.secondaryText};">
              <a href="${env.FRONTEND_URL}/settings/notifications" style="color: ${COLORS.secondaryText}; text-decoration: underline;">Notification Settings</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

// Reusable Components

const createButton = (
  text: string,
  url: string,
  color: string = COLORS.button
): string => {
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0">
  <tr>
    <td style="border-radius: 12px; background-color: ${color};">
      <a href="${url}" style="display: inline-block; padding: 12px 18px; font-size: 15px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 12px;">${text}</a>
    </td>
  </tr>
</table>
  `.trim();
};

const createInfoBox = (
  title: string,
  items: Array<{ label: string; value: string }>
): string => {
  const rows = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px 0; font-size: 14px; color: ${COLORS.secondaryText}; width: 140px;">${item.label}</td>
      <td style="padding: 8px 0; font-size: 14px; color: ${COLORS.primaryText}; font-weight: 500;">${item.value}</td>
    </tr>
  `
    )
    .join('');

  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0; padding: 20px; background-color: ${COLORS.background}; border-radius: 8px; border: 1px solid ${COLORS.border};">
  <tr>
    <td>
      <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: ${COLORS.secondaryText}; text-transform: uppercase; letter-spacing: 0.5px;">${title}</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        ${rows}
      </table>
    </td>
  </tr>
</table>
  `.trim();
};

const createStatusBadge = (status: string, color: string): string => {
  return `<span style="display: inline-block; padding: 4px 10px; font-size: 12px; font-weight: 600; color: #FFFFFF; background-color: ${color}; border-radius: 6px;">${status}</span>`;
};

// Template: EMAIL VERIFICATION
export const createEmailVerificationTemplate = (
  verificationToken: string
): string => {
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const content = `
<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: ${COLORS.primaryText};">Verify Your Email Address</h2>

<p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: ${COLORS.primaryText};">
  Thank you for registering with Codionix. To complete your account setup and unlock all features, please verify your email address.
</p>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0; padding: 16px; background-color: #FEF3C7; border-left: 3px solid ${COLORS.warning}; border-radius: 4px;">
  <tr>
    <td>
      <p style="margin: 0; font-size: 14px; font-weight: 600; color: ${COLORS.warning};">This link expires in 24 hours</p>
    </td>
  </tr>
</table>

${createButton('Verify Email Address', verifyUrl, COLORS.success)}

<p style="margin: 32px 0 0 0; font-size: 13px; line-height: 20px; color: ${COLORS.secondaryText};">
  Or copy and paste this link into your browser:
</p>
<p style="margin: 8px 0 0 0; padding: 12px; font-size: 12px; color: ${COLORS.primaryText}; background-color: ${COLORS.background}; border-radius: 4px; word-break: break-all; font-family: monospace;">
  ${verifyUrl}
</p>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0 0 0; padding-top: 24px; border-top: 1px solid ${COLORS.border};">
  <tr>
    <td style="font-size: 13px; line-height: 20px; color: ${COLORS.secondaryText};">
      <p style="margin: 0;">If you didn't create this account, you can safely ignore this email.</p>
    </td>
  </tr>
</table>
  `;

  return createEmailLayout(content);
};

// Template: PASSWORD RESET
export const createPasswordResetTemplate = (resetToken: string): string => {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const content = `
<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: ${COLORS.primaryText};">Reset Your Password</h2>

<p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: ${COLORS.primaryText};">
  You requested to reset your password for your Codionix account. Click the button below to create a new password.
</p>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0; padding: 16px; background-color: #FEF2F2; border-left: 3px solid ${COLORS.error}; border-radius: 4px;">
  <tr>
    <td>
      <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: ${COLORS.error};">Security Notice</p>
      <p style="margin: 0; font-size: 13px; color: ${COLORS.primaryText};">This link expires in 1 hour for your security.</p>
    </td>
  </tr>
</table>

${createButton('Reset Password', resetUrl, COLORS.button)}

<p style="margin: 32px 0 0 0; font-size: 13px; line-height: 20px; color: ${COLORS.secondaryText};">
  Or copy and paste this link into your browser:
</p>
<p style="margin: 8px 0 0 0; padding: 12px; font-size: 12px; color: ${COLORS.primaryText}; background-color: ${COLORS.background}; border-radius: 4px; word-break: break-all; font-family: monospace;">
  ${resetUrl}
</p>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0 0 0; padding-top: 24px; border-top: 1px solid ${COLORS.border};">
  <tr>
    <td style="font-size: 13px; line-height: 20px; color: ${COLORS.secondaryText};">
      <p style="margin: 0 0 12px 0; font-weight: 600; color: ${COLORS.primaryText};">Didn't request this?</p>
      <p style="margin: 0;">If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
    </td>
  </tr>
</table>
  `;

  return createEmailLayout(content);
};

// Template: WELCOME EMAIL
export const createWelcomeEmail = (fullName: string, role: string): string => {
  const roleMessages = {
    STUDENT: {
      headline: 'Start applying to real-world projects',
      description:
        'Browse opportunities, submit applications, and get professional feedback from experienced mentors.',
      cta: 'Explore Projects',
    },
    MENTOR: {
      headline: 'Start sharing your expertise',
      description:
        'Create projects, review applications, and help the next generation of developers grow.',
      cta: 'Create Your First Project',
    },
    EMPLOYER: {
      headline: 'Find talented developers',
      description:
        'Post internships and projects, review applications, and build your team with motivated candidates.',
      cta: 'Post Your First Project',
    },
  };

  const message =
    roleMessages[role as keyof typeof roleMessages] || roleMessages.STUDENT;

  const content = `
<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: ${COLORS.primaryText};">Welcome to Codionix, ${fullName}</h2>

<p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: ${COLORS.primaryText};">
  Your email has been verified. You now have full access to the platform.
</p>

<p style="margin: 0 0 32px 0; font-size: 15px; line-height: 24px; color: ${COLORS.primaryText};">
  <strong>${message.headline}</strong><br>
  ${message.description}
</p>

${createButton(message.cta, `${env.FRONTEND_URL}/projects`)}

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0 0 0; padding-top: 24px; border-top: 1px solid ${COLORS.border};">
  <tr>
    <td style="font-size: 14px; line-height: 22px; color: ${COLORS.secondaryText};">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: ${COLORS.primaryText};">Next Steps:</p>
      <ul style="margin: 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Complete your profile with skills and bio</li>
        <li style="margin-bottom: 8px;">Upload a professional profile picture</li>
        <li style="margin-bottom: 0;">${role === 'STUDENT' ? 'Browse and apply to projects' : 'Create your first project'}</li>
      </ul>
    </td>
  </tr>
</table>
  `;

  return createEmailLayout(content);
};

// Template: NEW APPLICATION ALERT
export const createNewApplicationAlert = (
  mentorName: string,
  studentName: string,
  projectTitle: string,
  applicationId: string,
  coverLetterPreview: string
): string => {
  const content = `
<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: ${COLORS.primaryText};">New Application Received</h2>

<p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: ${COLORS.primaryText};">
  Hi ${mentorName},
</p>

<p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: ${COLORS.primaryText};">
  <strong>${studentName}</strong> has applied to your project <strong>"${projectTitle}"</strong>.
</p>

${createInfoBox('Application Details', [
  { label: 'Applicant', value: studentName },
  { label: 'Project', value: projectTitle },
  { label: 'Status', value: 'Pending Review' },
])}

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0; padding: 16px; background-color: ${COLORS.background}; border-left: 3px solid ${COLORS.button}; border-radius: 4px;">
  <tr>
    <td>
      <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: ${COLORS.secondaryText};">COVER LETTER PREVIEW</p>
      <p style="margin: 0; font-size: 14px; line-height: 22px; color: ${COLORS.primaryText}; font-style: italic;">
        "${coverLetterPreview.substring(0, 150)}${coverLetterPreview.length > 150 ? '...' : ''}"
      </p>
    </td>
  </tr>
</table>

${createButton('Review Application', `${env.FRONTEND_URL}/applications/${applicationId}`)}

<p style="margin: 32px 0 0 0; font-size: 14px; line-height: 22px; color: ${COLORS.secondaryText};">
  Quick responses improve candidate experience and help you find the right match faster.
</p>
  `;

  return createEmailLayout(content);
};

// Template: APPLICATION STATUS UPDATE
export const createApplicationStatusEmail = (
  studentName: string,
  projectTitle: string,
  status: 'ACCEPTED' | 'REJECTED' | 'UNDER_REVIEW',
  mentorName: string,
  rejectionReason?: string
): string => {
  const statusConfig = {
    ACCEPTED: {
      color: COLORS.success,
      badge: 'Accepted',
      headline: 'Congratulations! Your application was accepted',
      message: `Great news! ${mentorName} has accepted your application for "${projectTitle}".`,
      nextSteps: [
        'The project owner will contact you with next steps',
        'Check your email regularly for updates',
        'Prepare any materials or questions you may have',
      ],
      cta: 'View Project Details',
    },
    REJECTED: {
      color: COLORS.error,
      badge: 'Not Selected',
      headline: 'Application Update',
      message: `Thank you for your interest in "${projectTitle}". After careful review, ${mentorName} has decided not to move forward with your application at this time.`,
      nextSteps: [
        'Review the feedback below to improve future applications',
        'Keep exploring other opportunities on the platform',
        'Update your profile with new skills and projects',
      ],
      cta: 'Browse More Projects',
    },
    UNDER_REVIEW: {
      color: COLORS.warning,
      badge: 'Under Review',
      headline: 'Your application is being reviewed',
      message: `${mentorName} is currently reviewing your application for "${projectTitle}".`,
      nextSteps: [
        "We'll notify you as soon as a decision is made",
        'Make sure your profile is up to date',
        'Continue exploring other opportunities',
      ],
      cta: 'View Application',
    },
  };

  const config = statusConfig[status];

  const feedbackSection = rejectionReason
    ? `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0; padding: 16px; background-color: #FEF2F2; border-left: 3px solid ${COLORS.error}; border-radius: 4px;">
  <tr>
    <td>
      <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: ${COLORS.error};">FEEDBACK FROM PROJECT OWNER</p>
      <p style="margin: 0; font-size: 14px; line-height: 22px; color: ${COLORS.primaryText};">
        ${rejectionReason}
      </p>
    </td>
  </tr>
</table>
    `
    : '';

  const nextStepsList = config.nextSteps
    .map((step) => `<li style="margin-bottom: 8px;">${step}</li>`)
    .join('');

  const content = `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
  <tr>
    <td>
      ${createStatusBadge(config.badge, config.color)}
    </td>
  </tr>
</table>

<h2 style="margin: 16px 0; font-size: 20px; font-weight: 600; color: ${COLORS.primaryText};">${config.headline}</h2>

<p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: ${COLORS.primaryText};">
  Hi ${studentName},
</p>

<p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: ${COLORS.primaryText};">
  ${config.message}
</p>

${createInfoBox('Application Summary', [
  { label: 'Project', value: projectTitle },
  { label: 'Reviewed By', value: mentorName },
  { label: 'Status', value: config.badge },
])}

${feedbackSection}

${createButton(config.cta, `${env.FRONTEND_URL}/applications`)}

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0 0 0; padding-top: 24px; border-top: 1px solid ${COLORS.border};">
  <tr>
    <td>
      <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: ${COLORS.primaryText};">What's Next?</p>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 22px; color: ${COLORS.secondaryText};">
        ${nextStepsList}
      </ul>
    </td>
  </tr>
</table>

${
  status === 'REJECTED'
    ? `
<p style="margin: 32px 0 0 0; padding: 16px; font-size: 13px; line-height: 20px; color: ${COLORS.secondaryText}; background-color: ${COLORS.background}; border-radius: 6px;">
  <strong>Remember:</strong> Every application is a learning opportunity. Use this feedback to strengthen your next application. Keep building, keep applying, keep growing.
</p>
`
    : ''
}
  `;

  return createEmailLayout(content);
};

// Template: PROJECT DEADLINE REMINDER
export const createDeadlineReminderEmail = (
  studentName: string,
  projectTitle: string,
  projectId: string,
  daysRemaining: number
): string => {
  const urgencyColor = daysRemaining <= 2 ? COLORS.error : COLORS.warning;

  const content = `
<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: ${COLORS.primaryText};">Project Deadline Approaching</h2>

<p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: ${COLORS.primaryText};">
  Hi ${studentName},
</p>

<p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: ${COLORS.primaryText};">
  The application deadline for <strong>"${projectTitle}"</strong> is in <strong style="color: ${urgencyColor};">${daysRemaining} day${daysRemaining === 1 ? '' : 's'}</strong>.
</p>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0; padding: 16px; background-color: ${urgencyColor === COLORS.error ? '#FEF2F2' : '#FFFBEB'}; border-left: 3px solid ${urgencyColor}; border-radius: 4px;">
  <tr>
    <td>
      <p style="margin: 0; font-size: 14px; font-weight: 600; color: ${urgencyColor};">
        ${daysRemaining <= 2 ? 'URGENT: Apply soon to avoid missing this opportunity' : 'Act now to secure your spot'}
      </p>
    </td>
  </tr>
</table>

${createButton('Apply Now', `${env.FRONTEND_URL}/projects/${projectId}`)}

<p style="margin: 32px 0 0 0; font-size: 14px; line-height: 22px; color: ${COLORS.secondaryText};">
  Make sure your application stands out by including specific examples of your work and explaining why you're interested in this project.
</p>
  `;

  return createEmailLayout(content);
};

// Template: WEEKLY DIGEST
export const createWeeklyDigestEmail = (
  userName: string,
  stats: {
    newProjects: number;
    pendingApplications: number;
    receivedFeedback: number;
  },
  featuredProjects: Array<{
    id: string;
    title: string;
    type: string;
    skills: string[];
  }>
): string => {
  const projectRows = featuredProjects
    .slice(0, 3)
    .map(
      (project) => `
    <tr>
      <td style="padding: 16px 0; border-bottom: 1px solid ${COLORS.border};">
        <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: ${COLORS.primaryText};">
          <a href="${env.FRONTEND_URL}/projects/${project.id}" style="color: ${COLORS.primaryText}; text-decoration: none;">${project.title}</a>
        </p>
        <p style="margin: 0 0 8px 0; font-size: 13px; color: ${COLORS.secondaryText};">${project.type}</p>
        <p style="margin: 0; font-size: 13px; color: ${COLORS.secondaryText};">
          ${project.skills.slice(0, 3).join(' • ')}
        </p>
      </td>
    </tr>
  `
    )
    .join('');

  const content = `
<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: ${COLORS.primaryText};">Your Weekly Summary</h2>

<p style="margin: 0 0 32px 0; font-size: 15px; line-height: 24px; color: ${COLORS.primaryText};">
  Hi ${userName}, here's what happened this week on Codionix.
</p>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 32px 0;">
  <tr>
    <td style="padding: 20px; background-color: ${COLORS.background}; border-radius: 8px; text-align: center; width: 33%;">
      <p style="margin: 0 0 4px 0; font-size: 28px; font-weight: 700; color: ${COLORS.button};">${stats.newProjects}</p>
      <p style="margin: 0; font-size: 13px; color: ${COLORS.secondaryText};">New Projects</p>
    </td>
    <td style="width: 16px;"></td>
    <td style="padding: 20px; background-color: ${COLORS.background}; border-radius: 8px; text-align: center; width: 33%;">
      <p style="margin: 0 0 4px 0; font-size: 28px; font-weight: 700; color: ${COLORS.warning};">${stats.pendingApplications}</p>
      <p style="margin: 0; font-size: 13px; color: ${COLORS.secondaryText};">Pending Apps</p>
    </td>
    <td style="width: 16px;"></td>
    <td style="padding: 20px; background-color: ${COLORS.background}; border-radius: 8px; text-align: center; width: 33%;">
      <p style="margin: 0 0 4px 0; font-size: 28px; font-weight: 700; color: ${COLORS.success};">${stats.receivedFeedback}</p>
      <p style="margin: 0; font-size: 13px; color: ${COLORS.secondaryText};">New Feedback</p>
    </td>
  </tr>
</table>

${
  featuredProjects.length > 0
    ? `
<p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: ${COLORS.primaryText};">Featured Projects This Week</p>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 32px 0;">
  ${projectRows}
</table>

${createButton('View All Projects', `${env.FRONTEND_URL}/projects`)}
`
    : ''
}

<p style="margin: 32px 0 0 0; font-size: 14px; line-height: 22px; color: ${COLORS.secondaryText};">
  Keep building, keep learning, keep growing.
</p>
  `;

  return createEmailLayout(content);
};
